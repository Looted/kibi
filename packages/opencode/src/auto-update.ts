import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as logger from "./logger.js";

const PACKAGE_NAME = "kibi-opencode";
const NPM_DIST_TAGS_URL = `https://registry.npmjs.org/-/package/${PACKAGE_NAME}/dist-tags`;
const NPM_FETCH_TIMEOUT_MS = 5000;
const EXACT_SEMVER_REGEX =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export interface KibiOpencodePluginEntry {
  entry: string;
  isPinned: boolean;
  requestedVersion: string | null;
  configPath: string;
}

export type AutoUpdateStatus =
  | "disabled"
  | "plugin-not-found"
  | "current-version-unknown"
  | "latest-version-unknown"
  | "up-to-date"
  | "pinned"
  | "updated"
  | "install-failed";

export interface AutoUpdateResult {
  status: AutoUpdateStatus;
  currentVersion?: string;
  latestVersion?: string;
}

export interface AutoUpdateInput {
  directory: string;
  enabled: boolean;
}

export interface AutoUpdateRunnerDeps {
  getCurrentVersion: () => string | null;
  getLatestVersion: (channel?: string) => Promise<string | null>;
  invalidatePackage: () => boolean;
  runInstall: () => Promise<boolean>;
  notify: (message: string) => Promise<void>;
  log: (message: string, metadata?: Record<string, unknown>) => void;
}

type SemverCore = [major: number, minor: number, patch: number];

interface ParsedSemver {
  core: SemverCore;
  prerelease: string[];
}

interface PackageJsonLike {
  name?: unknown;
  version?: unknown;
}

interface DistTagsLike {
  latest?: unknown;
  [key: string]: unknown;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch (err: unknown) {
    logger.info("auto-update: failed to parse JSON", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function stripJsonComments(raw: string): string {
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

function configPaths(directory: string): string[] {
  const home = os.homedir();
  return [
    path.join(directory, "opencode.json"),
    path.join(directory, "opencode.jsonc"),
    path.join(directory, ".opencode", "opencode.json"),
    path.join(directory, ".opencode", "opencode.jsonc"),
    path.join(home, ".config", "opencode", "opencode.json"),
    path.join(home, ".config", "opencode", "opencode.jsonc"),
  ];
}

export function findKibiOpencodePluginEntry(
  directory: string,
): KibiOpencodePluginEntry | null {
  for (const configPath of configPaths(directory)) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    const parsed = parseJsonObject(
      stripJsonComments(fs.readFileSync(configPath, "utf8")),
    );
    const plugins = parsed?.plugin;
    if (!Array.isArray(plugins)) {
      continue;
    }

    for (const candidate of plugins) {
      if (typeof candidate !== "string") {
        continue;
      }
      if (candidate === PACKAGE_NAME) {
        return {
          entry: candidate,
          isPinned: false,
          requestedVersion: null,
          configPath,
        };
      }
      if (candidate.startsWith(`${PACKAGE_NAME}@`)) {
        const requestedVersion = candidate
          .slice(PACKAGE_NAME.length + 1)
          .trim();
        return {
          entry: candidate,
          isPinned: EXACT_SEMVER_REGEX.test(requestedVersion),
          requestedVersion,
          configPath,
        };
      }
      if (candidate.startsWith("file://") && candidate.includes(PACKAGE_NAME)) {
        return {
          entry: candidate,
          isPinned: true,
          requestedVersion: null,
          configPath,
        };
      }
    }
  }

  return null;
}

function getOpenCodeConfigDir(): string {
  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "opencode");
  }
  return path.join(os.homedir(), ".config", "opencode");
}

function getOpenCodeCacheRoot(): string {
  if (process.platform === "win32") {
    const localAppData =
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "opencode");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Caches", "opencode");
  }
  return path.join(
    process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache"),
    "opencode",
  );
}

function getOpenCodePackagesCacheDir(): string {
  return path.join(getOpenCodeCacheRoot(), "packages");
}

function parseSemver(version: string): ParsedSemver | null {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
  );
  if (!match) {
    return null;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (
    !Number.isInteger(major) ||
    !Number.isInteger(minor) ||
    !Number.isInteger(patch)
  ) {
    return null;
  }
  return {
    core: [major, minor, patch],
    prerelease: match[4]?.split(".") ?? [],
  };
}

function isNumericPrereleaseIdentifier(value: string): boolean {
  return /^(0|[1-9]\d*)$/.test(value);
}

function comparePrereleaseIdentifiers(left: string, right: string): number {
  const leftIsNumeric = isNumericPrereleaseIdentifier(left);
  const rightIsNumeric = isNumericPrereleaseIdentifier(right);
  if (leftIsNumeric && rightIsNumeric) {
    return Number(left) - Number(right);
  }
  if (leftIsNumeric) {
    return -1;
  }
  if (rightIsNumeric) {
    return 1;
  }
  return left.localeCompare(right, "en", { sensitivity: "variant" });
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }
  if (left.length === 0) {
    return 1;
  }
  if (right.length === 0) {
    return -1;
  }
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) {
      return -1;
    }
    if (rightPart === undefined) {
      return 1;
    }
    const comparison = comparePrereleaseIdentifiers(leftPart, rightPart);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return 0;
}

function isSemverGreaterThan(candidate: string, current: string): boolean {
  const candidateVersion = parseSemver(candidate);
  const currentVersion = parseSemver(current);
  if (!candidateVersion || !currentVersion) {
    return false;
  }
  for (const index of [0, 1, 2] as const) {
    if (candidateVersion.core[index] > currentVersion.core[index]) {
      return true;
    }
    if (candidateVersion.core[index] < currentVersion.core[index]) {
      return false;
    }
  }
  return (
    comparePrerelease(candidateVersion.prerelease, currentVersion.prerelease) >
    0
  );
}

function readVersionFromPackageJson(packageJsonPath: string): string | null {
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  const parsed = parseJsonObject(
    fs.readFileSync(packageJsonPath, "utf8"),
  ) as PackageJsonLike | null;
  return typeof parsed?.version === "string" ? parsed.version : null;
}

function findPackageJsonUp(startUrl: string): string | null {
  let current = path.dirname(fileURLToPath(startUrl));
  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const parsed = parseJsonObject(
        fs.readFileSync(packageJsonPath, "utf8"),
      ) as PackageJsonLike | null;
      if (parsed?.name === PACKAGE_NAME) {
        return packageJsonPath;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function getCachedPluginVersion(): string | null {
  const packageJsonCandidates = [
    path.join(
      getOpenCodeConfigDir(),
      "node_modules",
      PACKAGE_NAME,
      "package.json",
    ),
    path.join(
      getOpenCodeCacheRoot(),
      "node_modules",
      PACKAGE_NAME,
      "package.json",
    ),
    path.join(
      getOpenCodePackagesCacheDir(),
      "node_modules",
      PACKAGE_NAME,
      "package.json",
    ),
  ];

  for (const candidate of packageJsonCandidates) {
    const version = readVersionFromPackageJson(candidate);
    if (version) {
      return version;
    }
  }

  const runningPackageJson = findPackageJsonUp(import.meta.url);
  return runningPackageJson
    ? readVersionFromPackageJson(runningPackageJson)
    : null;
}

export async function getLatestPluginVersion(
  channel = "latest",
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NPM_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(NPM_DIST_TAGS_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return null;
    }
    const tags = (await response.json()) as DistTagsLike;
    const selected = tags[channel] ?? tags.latest;
    return typeof selected === "string" ? selected : null;
  } catch (err: unknown) {
    logger.info("auto-update: failed to fetch latest version", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function removePackageDir(dir: string): boolean {
  if (!fs.existsSync(dir)) {
    return false;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

function removeSpecifierCacheDirs(cacheDir: string): boolean {
  if (!fs.existsSync(cacheDir)) {
    return false;
  }
  let removed = false;
  for (const entry of fs.readdirSync(cacheDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith(`${PACKAGE_NAME}@`)) {
      fs.rmSync(path.join(cacheDir, entry.name), {
        recursive: true,
        force: true,
      });
      removed = true;
    }
  }
  return removed;
}

function removeEveryPath(paths: string[]): boolean {
  let removed = false;
  for (const targetPath of paths) {
    if (removePackageDir(targetPath)) {
      removed = true;
    }
  }
  return removed;
}

function removeSpecifiersFromEveryDir(dirs: string[]): boolean {
  let removed = false;
  for (const dir of dirs) {
    if (removeSpecifierCacheDirs(dir)) {
      removed = true;
    }
  }
  return removed;
}

export function invalidateKibiOpencodePackage(): boolean {
  const configDir = getOpenCodeConfigDir();
  const cacheRoot = getOpenCodeCacheRoot();
  const packagesCacheDir = getOpenCodePackagesCacheDir();
  const removedPackageDirs = removeEveryPath([
    path.join(configDir, "node_modules", PACKAGE_NAME),
    path.join(cacheRoot, "node_modules", PACKAGE_NAME),
    path.join(packagesCacheDir, "node_modules", PACKAGE_NAME),
  ]);
  const removedSpecifierDirs = removeSpecifiersFromEveryDir([
    cacheRoot,
    packagesCacheDir,
  ]);
  const removedLock = removeEveryPath([
    path.join(cacheRoot, "bun.lock"),
    path.join(cacheRoot, "bun.lockb"),
    path.join(packagesCacheDir, "bun.lock"),
    path.join(packagesCacheDir, "bun.lockb"),
  ]);
  return removedPackageDirs || removedSpecifierDirs || removedLock;
}

function activeInstallWorkspace(): string {
  const configDir = getOpenCodeConfigDir();
  const cacheRoot = getOpenCodeCacheRoot();
  const packagesCacheDir = getOpenCodePackagesCacheDir();
  if (
    fs.existsSync(
      path.join(configDir, "node_modules", PACKAGE_NAME, "package.json"),
    )
  ) {
    return configDir;
  }
  if (
    fs.existsSync(
      path.join(cacheRoot, "node_modules", PACKAGE_NAME, "package.json"),
    )
  ) {
    return cacheRoot;
  }
  return packagesCacheDir;
}

export function runBunInstallForOpenCodePlugin(): Promise<boolean> {
  return new Promise((resolve) => {
    const workspace = activeInstallWorkspace();
    fs.mkdirSync(workspace, { recursive: true });
    execFile("bun", ["install"], { cwd: workspace }, (error) => {
      resolve(error === null);
    });
  });
}

function channelForEntry(entry: KibiOpencodePluginEntry): string {
  if (!entry.requestedVersion || entry.isPinned) {
    return "latest";
  }
  return entry.requestedVersion;
}

export function createAutoUpdateRunner(deps: AutoUpdateRunnerDeps) {
  return async function runAutoUpdate(
    input: AutoUpdateInput,
  ): Promise<AutoUpdateResult> {
    if (!input.enabled) {
      deps.log("auto-update: disabled");
      return { status: "disabled" };
    }

    const pluginEntry = findKibiOpencodePluginEntry(input.directory);
    if (!pluginEntry) {
      deps.log("auto-update: kibi-opencode plugin entry not found");
      return { status: "plugin-not-found" };
    }

    const currentVersion =
      deps.getCurrentVersion() ?? pluginEntry.requestedVersion;
    if (!currentVersion) {
      deps.log("auto-update: current version unknown");
      return { status: "current-version-unknown" };
    }

    const latestVersion = await deps.getLatestVersion(
      channelForEntry(pluginEntry),
    );
    if (!latestVersion) {
      deps.log("auto-update: latest version unknown");
      return { status: "latest-version-unknown", currentVersion };
    }

    if (
      currentVersion === latestVersion ||
      !isSemverGreaterThan(latestVersion, currentVersion)
    ) {
      deps.log("auto-update: plugin already up to date", {
        currentVersion,
        latestVersion,
      });
      return { status: "up-to-date", currentVersion, latestVersion };
    }

    if (pluginEntry.isPinned) {
      await deps.notify(
        `${PACKAGE_NAME} ${latestVersion} is available; current plugin entry is pinned to ${currentVersion}.`,
      );
      deps.log("auto-update: exact semver pin detected, skipping install", {
        currentVersion,
        latestVersion,
        entry: pluginEntry.entry,
      });
      return { status: "pinned", currentVersion, latestVersion };
    }

    deps.invalidatePackage();
    const installed = await deps.runInstall();
    if (!installed) {
      await deps.notify(
        `${PACKAGE_NAME} ${latestVersion} is available, but automatic install failed.`,
      );
      return { status: "install-failed", currentVersion, latestVersion };
    }

    await deps.notify(
      `${PACKAGE_NAME} updated from ${currentVersion} to ${latestVersion}. Restart OpenCode to apply.`,
    );
    return { status: "updated", currentVersion, latestVersion };
  };
}

export const runKibiOpencodeAutoUpdate = createAutoUpdateRunner({
  getCurrentVersion: getCachedPluginVersion,
  getLatestVersion: getLatestPluginVersion,
  invalidatePackage: invalidateKibiOpencodePackage,
  runInstall: runBunInstallForOpenCodePlugin,
  notify: async (message) => {
    logger.info("auto-update.notification", { message });
  },
  log: (message, metadata) => logger.info(message, metadata),
});
