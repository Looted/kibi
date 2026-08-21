import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { parseNpmPackJsonOutput } from "./npm-pack-json.js";
import { writePackedInstallManifest } from "./packed-install-manifest.js";

// allow: SIZE_OK — legacy packed E2E helper API spans established tests; splitting it requires a repository-wide migration.
/**
 * E2E Test Harness for Packaged npm Packages
 *
 * Tests install packages from tarballs (npm pack) in complete isolation.
 * Each test gets:
 * - Fresh temp directory
 * - Fresh git repository
 * - Fresh npm prefix and cache
 * - Isolated PATH and HOME
 */

const REPO_ROOT = resolve(process.cwd());

/**
 * Packed sandboxes are independent Git checkouts. Host CI may set
 * `KIBI_BRANCH` for the dogfood repository's detached HEAD; leaking that
 * identity into a temp repo makes hashed stores and `kibi init`/`sync`
 * attach to the host branch instead of the sandbox branch.
 */
export function isolatedPackedSandboxEnv(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...overrides };
  env.KIBI_BRANCH = undefined;
  const explicit = overrides.KIBI_BRANCH;
  if (
    typeof explicit === "string" &&
    explicit.length > 0 &&
    explicit !== process.env.KIBI_BRANCH
  ) {
    env.KIBI_BRANCH = explicit;
  }
  return env;
}

/** Return the exact hashed compiled-store directory for a Git branch identity. */
export function exactBranchStorePath(repoDir: string, branch: string): string {
  const key = createHash("sha256").update(branch).digest("hex");
  return join(repoDir, ".kb", "branches", key);
}

type PackSource = Readonly<{
  key: string;
  externalRoot: string | null;
}>;

type SharedInstallation = Readonly<{
  prefix: string;
  promise: Promise<void>;
}>;

export interface SharedNpmCacheResolution {
  path: string;
  owned: boolean;
}

const cachedTarballs = new Map<string, Promise<Tarballs>>();
const tarballRoots = new Map<string, string>();
const sharedInstallations = new Map<string, SharedInstallation>();
let sharedPrefixPath: string | null = null;
const ownedSharedPaths = new Set<string>();

// Some artifact-only tests intentionally clear KIBI_E2E_PREFIX and create a
// worker-local fallback installation. Ensure those paths are reclaimed when
// the isolated Node test worker exits, even though only the parent runner owns
// suite-level cleanup.
// implements REQ-test-journaled-engine-harness
process.once("exit", cleanupSharedPackedInstallation);

function resolveNpmBinary(): string {
  const npmExecPath = process.env.npm_execpath;
  if (
    npmExecPath &&
    existsSync(npmExecPath) &&
    !basename(npmExecPath).toLowerCase().includes("bun")
  ) {
    return npmExecPath;
  }

  try {
    const locator = process.platform === "win32" ? "where.exe" : "which";
    const npmPath = execFileSync(locator, ["npm"], {
      encoding: "utf8",
    })
      .split(/\r?\n/)[0]
      ?.trim();
    if (npmPath) {
      return npmPath;
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }

  return "npm";
}

function resolveBunBinary(): string {
  try {
    const locator = process.platform === "win32" ? "where.exe" : "which";
    const bunPath = execFileSync(locator, ["bun"], {
      encoding: "utf8",
    })
      .split(/\r?\n/)[0]
      ?.trim();
    if (bunPath) return bunPath;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }

  return "bun";
}

function npmPackCommand(npmBinary: string): {
  command: string;
  args: string[];
} {
  if (/\.(?:c?m?js)$/i.test(npmBinary)) {
    return { command: process.execPath, args: [npmBinary] };
  }
  return { command: npmBinary, args: [] };
}

function resolveGitBinary(): string {
  try {
    const locator = process.platform === "win32" ? "where.exe" : "which";
    const gitPath = execFileSync(locator, ["git"], {
      encoding: "utf8",
    })
      .split(/\r?\n/)[0]
      ?.trim();
    if (gitPath) {
      return gitPath;
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }

  return "git";
}

/**
 * Resolve the suite-level npm cache before the install's isolated HOME is
 * applied. Explicit Kibi and ambient npm cache settings are never owned by
 * this helper; the final fallback is the only cache path we clean up.
 */
// implements REQ-test-journaled-engine-harness
export function resolveSharedNpmCache(): SharedNpmCacheResolution {
  const configuredCache =
    process.env.KIBI_E2E_NPM_CACHE?.trim() ||
    process.env.npm_config_cache?.trim();
  if (configuredCache) {
    return { path: resolve(configuredCache), owned: false };
  }

  const originalHome =
    process.env.HOME?.trim() || process.env.USERPROFILE?.trim();
  if (originalHome) {
    return { path: join(resolve(originalHome), ".npm"), owned: false };
  }

  const fallbackPath = mkdtempSync(join(tmpdir(), "kibi-e2e-cache-"));
  ownedSharedPaths.add(fallbackPath);
  return { path: fallbackPath, owned: true };
}

function getSharedPrefixPath(): string {
  if (!sharedPrefixPath) {
    sharedPrefixPath = allocateSharedPrefixPath();
  }

  return sharedPrefixPath;
}

function allocateSharedPrefixPath(): string {
  const prefix = mkdtempSync(join(tmpdir(), "kibi-e2e-prefix-"));
  ownedSharedPaths.add(prefix);
  writeFileSync(
    join(prefix, "package.json"),
    JSON.stringify({ name: "kibi-packed-e2e", private: true }, null, 2),
    "utf8",
  );
  return prefix;
}

function hasInstalledKibi(prefix: string | undefined): prefix is string {
  return (
    prefix !== undefined &&
    (existsSync(join(prefix, "bin", "kibi")) ||
      existsSync(join(prefix, "node_modules", ".bin", "kibi")))
  );
}

function findPrePackedTarball(
  prePackedDir: string,
  pkg: (typeof packagesForPack)[number],
): string | null {
  const candidateDirs = [prePackedDir, join(prePackedDir, pkg)];

  // Try version-matched tarball first
  let preferredVersion: string | null = null;
  try {
    const pkgJsonPath = join(REPO_ROOT, "packages", pkg, "package.json");
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    preferredVersion = pkgJson.version ?? null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }

  for (const dir of candidateDirs) {
    if (!existsSync(dir)) {
      continue;
    }

    const files = readdirSync(dir).filter(
      (f: string) => f.startsWith(`kibi-${pkg}-`) && f.endsWith(".tgz"),
    );

    if (files.length === 0) continue;

    // Prefer version-matched tarball
    if (preferredVersion) {
      const versionMatched = files.find(
        (f) => f === `kibi-${pkg}-${preferredVersion}.tgz`,
      );
      if (versionMatched) {
        return join(dir, versionMatched);
      }
    }

    // Fall back to first match
    const first = files[0];
    if (first) return join(dir, first);
  }

  return null;
}

const packagesForPack = [
  "core",
  "cli",
  "runtime",
  "mcp",
  "opencode",
  "codex",
  "cursor",
] as const;

function resolvePackSource(): PackSource {
  const configuredRoot = process.env.KIBI_TEST_TARBALLS;
  if (configuredRoot && existsSync(configuredRoot)) {
    const externalRoot = resolve(configuredRoot);
    return { key: `external:${externalRoot}`, externalRoot };
  }
  return { key: `workspace:${REPO_ROOT}`, externalRoot: null };
}

function tarballRootFor(source: PackSource, tarballs: Tarballs): string {
  if (source.externalRoot) return source.externalRoot;
  const root = tarballRoots.get(source.key);
  if (root) return root;
  return dirname(tarballs.core);
}

async function bootstrapSharedInstall(
  source: PackSource,
): Promise<SharedPackedEnvironment> {
  const bakedPrefix = process.env.KIBI_E2E_PREFIX;
  const useBakedPrefix = hasInstalledKibi(bakedPrefix);

  if (useBakedPrefix) {
    const tarballs = await packAll();
    return {
      prefix: bakedPrefix,
      tarballsRoot: tarballRootFor(source, tarballs),
    };
  }

  const tarballs = await packAll();
  const installKey = [
    tarballs.core,
    tarballs.cli,
    tarballs.runtime,
    tarballs.mcp,
    tarballs.opencode,
    tarballs.codex,
    tarballs.cursor,
  ].join("|");
  const existing = sharedInstallations.get(installKey);
  if (existing) {
    sharedPrefixPath = existing.prefix;
    await existing.promise;
    return {
      prefix: existing.prefix,
      tarballsRoot: tarballRootFor(source, tarballs),
    };
  }

  const npmPrefix = allocateSharedPrefixPath();
  const npmBinary = resolveNpmBinary();
  const npmDir = dirname(npmBinary);
  const gitDir = dirname(resolveGitBinary());
  const homeDir = mkdtempSync(join(tmpdir(), "kibi-e2e-home-"));
  const sharedNpmCache = resolveSharedNpmCache();
  ownedSharedPaths.add(homeDir);
  if (sharedNpmCache.owned) ownedSharedPaths.add(sharedNpmCache.path);
  const env: NodeJS.ProcessEnv = isolatedPackedSandboxEnv({
    HOME: homeDir,
    USERPROFILE: homeDir,
    npm_config_cache: sharedNpmCache.path,
    npm_config_userconfig: join(npmPrefix, "npmrc"),
    PATH: `${join(npmPrefix, "node_modules", ".bin")}:${gitDir}:${npmDir}:/usr/bin:${process.env.PATH ?? ""}`,
    NODE_ENV: "production",
  });
  const installPromise = (async () => {
    console.log("📥 Bootstrapping shared packed test installation...");
    writePackedInstallManifest(npmPrefix, tarballs);
    const installResult = await run(npmBinary, ["install", "--no-audit"], {
      cwd: npmPrefix,
      env,
      timeoutMs: 300000,
    });
    if (installResult.exitCode !== 0) {
      throw new Error(
        `Shared packed installation failed with exit code ${installResult.exitCode}.\nstdout:\n${installResult.stdout}\nstderr:\n${installResult.stderr}`,
      );
    }
    await verifyKibiCliResolutionImpl(npmPrefix, env);
  })();

  sharedInstallations.set(installKey, {
    prefix: npmPrefix,
    promise: installPromise,
  });
  try {
    await installPromise;
  } catch (error) {
    sharedInstallations.delete(installKey);
    throw error;
  }
  sharedPrefixPath = npmPrefix;
  return {
    prefix: npmPrefix,
    tarballsRoot: tarballRootFor(source, tarballs),
  };
}

/** Immutable prefix and tarball source shared by one packed test run. */
export interface SharedPackedEnvironment {
  readonly prefix: string;
  readonly tarballsRoot: string;
}

// The packed-suite runner calls this once and passes the prepared prefix and
// tarball source to every isolated test-file process. Individual test
// invocation remains supported by the module-level bootstrap at the end of
// this file.
// implements REQ-test-journaled-engine-harness
export async function prepareSharedPackedEnvironment(): Promise<SharedPackedEnvironment> {
  return bootstrapSharedInstall(resolvePackSource());
}

// Compatibility wrapper retained for callers that only need the prefix.
export async function prepareSharedPackedInstallation(): Promise<string> {
  const environment = await prepareSharedPackedEnvironment();
  return environment.prefix;
}

export function cleanupSharedPackedInstallation(): void {
  for (const ownedPath of ownedSharedPaths) {
    rmSync(ownedPath, { recursive: true, force: true });
  }
  ownedSharedPaths.clear();
  sharedPrefixPath = null;
  cachedTarballs.clear();
  tarballRoots.clear();
  sharedInstallations.clear();
}

/** Tarball paths for each package */
export interface Tarballs {
  core: string;
  cli: string;
  runtime: string;
  mcp: string;
  opencode: string;
  codex: string;
  cursor: string;
}

/** Options for running commands */
export interface RunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

/** Result from running a command */
export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function parseKibiResult<T>(stdout: string): T {
  const parsed = JSON.parse(stdout) as { data?: T };
  return (parsed.data ?? parsed) as T;
}

/** Options for kibi commands */
export interface KibiOptions {
  timeoutMs?: number;
}

/** Test sandbox with isolated environment */
export interface TestSandbox {
  /** Base temp directory */
  baseDir: string;
  /** Repository directory (git init here) */
  repoDir: string;
  /** npm prefix for global installs */
  npmPrefix: string;
  /** npm cache directory */
  npmCache: string;
  /** HOME directory for test */
  homeDir: string;
  /** Private socket/PID directory for every engine owned by this sandbox. */
  runtimeDir: string;
  /** Path to kibi binary */
  kibiBin: string;
  /** Path to kibi-mcp binary */
  kibiMcpBin: string;
  /** Isolated environment variables */
  env: NodeJS.ProcessEnv;

  /** Install packages from tarballs */
  install(tarballs: Tarballs): Promise<void>;
  /** Initialize git repository */
  initGitRepo(): Promise<void>;
  /** Cleanup sandbox */
  cleanup(): Promise<void>;
  /** Verify Node resolution for kibi-cli/prolog resolves into prefix */
  verifyKibiCliResolution(): Promise<void>;
}

/**
 * Run npm pack for all packages and return tarball paths
 * In Docker environments, checks for pre-packed tarballs first
 */
export async function packAll(): Promise<Tarballs> {
  // Artifact-only tests can switch from the runner's baked installation to a
  // downloaded-artifact directory after this module has been imported. Cache
  // by source so that a previous local pack cannot silently leak into that
  // workflow.
  const source = resolvePackSource();
  const cached = cachedTarballs.get(source.key);
  if (cached) return cached;

  const promise = (async () => {
    const tarballs: Partial<Tarballs> = {};
    const npmBinary = resolveNpmBinary();
    const bunBinary = resolveBunBinary();
    const lifecycleEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: `${dirname(bunBinary)}:${process.env.PATH ?? ""}`,
    };

    if (source.externalRoot) {
      console.log(
        `📦 Resolving/reusing pre-packed tarballs from ${source.externalRoot}...`,
      );
      for (const pkg of packagesForPack) {
        const tarballPath = findPrePackedTarball(source.externalRoot, pkg);
        if (tarballPath) {
          tarballs[pkg] = tarballPath;
          console.log(`    ✓ ${pkg}: ${basename(tarballPath)}`);
        } else {
          throw new Error(`Pre-packed tarball not found for package: ${pkg}`);
        }
      }

      tarballRoots.set(source.key, source.externalRoot);
      return tarballs as Tarballs;
    }

    console.log("📦 Packing packages...");
    const tarballsRoot = mkdtempSync(join(tmpdir(), "kibi-e2e-tarballs-"));
    ownedSharedPaths.add(tarballsRoot);
    try {
      for (const pkg of packagesForPack) {
        const pkgDir = join(REPO_ROOT, "packages", pkg);
        console.log(`  Packing packages/${pkg}...`);

        try {
          const npmCommand = npmPackCommand(npmBinary);
          const result = execFileSync(
            npmCommand.command,
            [
              ...npmCommand.args,
              "pack",
              "--json",
              "--pack-destination",
              tarballsRoot,
            ],
            {
              cwd: pkgDir,
              encoding: "utf8",
              env: lifecycleEnv,
              stdio: ["pipe", "pipe", "pipe"],
            },
          );

          const packResult = parseNpmPackJsonOutput(result);
          const filename = packResult[0]?.filename;
          if (!filename) {
            throw new Error(
              `Failed to pack package ${pkg}: no filename in output`,
            );
          }
          const tarballPath = join(tarballsRoot, basename(filename));
          if (!existsSync(tarballPath)) {
            throw new Error(`npm pack did not create ${tarballPath}`);
          }
          tarballs[pkg] = tarballPath;

          console.log(`    → ${basename(filename)}`);
        } catch (err) {
          const error = err as Error;
          throw new Error(`Failed to pack package ${pkg}: ${error.message}`);
        }
      }

      tarballRoots.set(source.key, tarballsRoot);
      return tarballs as Tarballs;
    } catch (error) {
      rmSync(tarballsRoot, { recursive: true, force: true });
      ownedSharedPaths.delete(tarballsRoot);
      throw error;
    }
  })();

  cachedTarballs.set(source.key, promise);
  try {
    return await promise;
  } catch (error) {
    cachedTarballs.delete(source.key);
    tarballRoots.delete(source.key);
    throw error;
  }
}

/**
 * Create a completely isolated test sandbox
 * Uses baked kibi installation if KIBI_E2E_PREFIX is set, otherwise installs from tarballs
 */
export function createSandbox(): TestSandbox {
  const baseDir = mkdtempSync(join(tmpdir(), "kibi-e2e-"));

  // Check if we're using a baked installation (CI image)
  const bakedPrefix = process.env.KIBI_E2E_PREFIX;
  const useBakedPrefix = hasInstalledKibi(bakedPrefix);
  const gitBinary = resolveGitBinary();
  const gitDir = dirname(gitBinary);

  // Create isolated directories
  const repoDir = join(baseDir, "repo");
  let npmPrefix = useBakedPrefix
    ? (bakedPrefix as string)
    : getSharedPrefixPath();
  const npmCache = join(baseDir, "npm-cache");
  const homeDir = join(baseDir, "home");
  const runtimeDir = join(baseDir, "runtime");

  mkdirSync(repoDir, { recursive: true });
  mkdirSync(npmCache, { recursive: true });
  mkdirSync(homeDir, { recursive: true });
  mkdirSync(runtimeDir, { recursive: true });

  // Build isolated environment
  // Include npm directory in PATH for E2E tests
  const npmBinary = resolveNpmBinary();
  const npmDir = dirname(npmBinary);
  const buildEnv = (prefix: string): NodeJS.ProcessEnv =>
    isolatedPackedSandboxEnv({
      HOME: homeDir,
      USERPROFILE: homeDir, // Windows
      npm_config_prefix: prefix,
      npm_config_cache: npmCache,
      npm_config_userconfig: join(baseDir, "npmrc"), // Empty config
      PATH: `${join(prefix, "node_modules", ".bin")}:${gitDir}:${npmDir}:/usr/bin:${process.env.PATH ?? ""}`,
      // Prevent git from using global config
      GIT_CONFIG_GLOBAL: join(baseDir, "gitconfig"),
      GIT_CONFIG_SYSTEM: "/dev/null",
      // Prevent Prolog from using user config
      XDG_CONFIG_HOME: join(baseDir, "config"),
      XDG_CACHE_HOME: join(baseDir, "cache"),
      XDG_DATA_HOME: join(baseDir, "data"),
      KIBI_ENGINE_IDLE_TIMEOUT_MS: "30000",
      KIBI_RUNTIME_DIR: runtimeDir,
      // Ensure NODE_ENV is production-like for tests
      NODE_ENV: "production",
    });
  let env = buildEnv(npmPrefix);

  // Create empty git config
  writeFileSync(
    env.GIT_CONFIG_GLOBAL ?? join(baseDir, "gitconfig"),
    "",
    "utf8",
  );

  // Store binary paths for direct execution
  let kibiBin = join(npmPrefix, "node_modules", ".bin", "kibi");
  let kibiMcpBin = join(npmPrefix, "node_modules", ".bin", "kibi-mcp");

  const useInstallation = (prefix: string): void => {
    npmPrefix = prefix;
    env = buildEnv(prefix);
    kibiBin = join(prefix, "node_modules", ".bin", "kibi");
    kibiMcpBin = join(prefix, "node_modules", ".bin", "kibi-mcp");
  };

  return {
    baseDir,
    repoDir,
    get npmPrefix() {
      return npmPrefix;
    },
    npmCache,
    homeDir,
    runtimeDir,
    get kibiBin() {
      return kibiBin;
    },
    get kibiMcpBin() {
      return kibiMcpBin;
    },
    get env() {
      return env;
    },

    async install(tarballs: Tarballs): Promise<void> {
      if (useBakedPrefix) {
        console.log("📦 Using baked kibi installation (skipping npm install)");
        await verifyKibiCliResolutionImpl(npmPrefix, env);
        return;
      }

      const installKey = [
        tarballs.core,
        tarballs.cli,
        tarballs.runtime,
        tarballs.mcp,
        tarballs.opencode,
        tarballs.codex,
        tarballs.cursor,
      ].join("|");

      const existing = sharedInstallations.get(installKey);
      if (existing) {
        useInstallation(existing.prefix);
        sharedPrefixPath = existing.prefix;
        await existing.promise;
        return;
      }

      const current = [...sharedInstallations.entries()].find(
        ([, installation]) => installation.prefix === npmPrefix,
      );
      if (current && current[0] !== installKey) {
        useInstallation(allocateSharedPrefixPath());
      }

      const installPromise = (async () => {
        console.log("📥 Installing packages into shared sandbox...");
        writePackedInstallManifest(npmPrefix, tarballs);
        await run(npmBinary, ["install", "--no-audit"], {
          cwd: npmPrefix,
          env,
          timeoutMs: 300000,
        });
        await verifyKibiCliResolutionImpl(npmPrefix, env);
        console.log("  ✓ Packages installed");
      })();

      sharedInstallations.set(installKey, {
        prefix: npmPrefix,
        promise: installPromise,
      });

      try {
        await installPromise;
        sharedPrefixPath = npmPrefix;
      } catch (error) {
        sharedInstallations.delete(installKey);
        throw error;
      }
    },

    /**
     * Verify that Node's require.resolve('kibi-cli/prolog') resolves into the
     * expected prefix. This fails fast if resolution points to an unexpected
     * location (prevents running tests against wrong build).
     */
    async verifyKibiCliResolution(): Promise<void> {
      await verifyKibiCliResolutionImpl(npmPrefix, env);
    },

    async initGitRepo(): Promise<void> {
      await run(gitBinary, ["init", "-b", "develop"], { cwd: repoDir, env });
      await run(gitBinary, ["config", "user.email", "test@example.com"], {
        cwd: repoDir,
        env,
      });
      await run(gitBinary, ["config", "user.name", "Test User"], {
        cwd: repoDir,
        env,
      });
      console.log("  ✓ Git repo initialized");
    },

    async cleanup(): Promise<void> {
      console.log(`🧹 Cleaning up ${baseDir}...`);
      await stopRuntimeEngines(runtimeDir);
      rmSync(baseDir, { recursive: true, force: true });
    },
  };
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Sandbox runtime directories contain only engines created by that sandbox,
// making their PID files safe exact targets for deterministic teardown.
// implements REQ-test-journaled-engine-harness
export async function stopRuntimeEngines(
  runtimeDir: string,
  timeoutMs = 5_000,
): Promise<number> {
  if (!existsSync(runtimeDir)) return 0;
  const pids: number[] = [];
  for (const entry of readdirSync(runtimeDir)) {
    if (!entry.endsWith(".pid")) continue;
    try {
      const pid = Number.parseInt(
        readFileSync(join(runtimeDir, entry), "utf8"),
        10,
      );
      if (Number.isInteger(pid) && pid > 1 && isProcessRunning(pid))
        pids.push(pid);
    } catch {
      // The daemon may remove its PID file during discovery.
    }
  }

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The daemon exited after discovery.
    }
  }
  const deadline = Date.now() + timeoutMs;
  while (pids.some(isProcessRunning) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  for (const pid of pids.filter(isProcessRunning)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The daemon exited between the liveness check and escalation.
    }
  }
  return pids.length;
}

/**
 * Run a command with timeout and output capture
 */
export function run(
  cmd: string,
  args: string[],
  options: RunOptions,
): Promise<RunResult> {
  const { cwd, env, timeoutMs = 120000 } = options;

  return new Promise((resolve, reject) => {
    const isDebug = process.env.E2E_LOG_LEVEL === "debug";
    if (isDebug) {
      console.log(`  $ ${cmd} ${args.join(" ")}`);
    }

    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      // Force kill after grace period
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (exitCode: number | null) => {
      clearTimeout(timeout);

      if (killed) {
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
        return;
      }

      // Log output for debugging
      if (isDebug) {
        if (stdout) console.log("  stdout:", stdout.slice(0, 500));
        if (stderr) console.log("  stderr:", stderr.slice(0, 500));
      } else if (exitCode !== 0) {
        // In non-debug mode, only log on failure
        if (stdout) console.log("  stdout:", stdout.slice(0, 500));
        if (stderr) console.log("  stderr:", stderr.slice(0, 500));
      }

      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

/**
 * Run kibi command in sandbox
 */
export async function kibi(
  sandbox: TestSandbox,
  args: string[],
  options: KibiOptions = {},
): Promise<RunResult> {
  // Use node to execute the bin file directly (bypass shebang permission issues in Docker)
  return run("node", [sandbox.kibiBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: options.timeoutMs ?? 120000,
  });
}

/**
 * Run kibi-mcp command in sandbox
 */
export async function kibiMcp(
  sandbox: TestSandbox,
  args: string[],
  options: KibiOptions = {},
): Promise<RunResult> {
  // Use node to execute the bin file directly (bypass shebang permission issues in Docker)
  return run("node", [sandbox.kibiMcpBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: options.timeoutMs ?? 120000,
  });
}

/** Frontmatter data for markdown files */
export interface Frontmatter {
  [key: string]: string | string[] | undefined;
}

/**
 * Create a test markdown file with frontmatter
 */
export function createMarkdownFile(
  sandbox: TestSandbox,
  relativePath: string,
  frontmatter: Frontmatter,
  content: string,
): void {
  const fullPath = join(sandbox.repoDir, relativePath);
  mkdirSync(join(fullPath, ".."), { recursive: true });

  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (v === undefined) return "";
      return `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : v}`;
    })
    .filter(Boolean)
    .join("\n");

  const fileContent = `---
${fmLines}
---

${content}
`;

  writeFileSync(fullPath, fileContent, "utf8");
  // Source-first sync intentionally ignores arbitrary untracked files. E2E
  // fixtures represent authored project inputs, so stage each fixture before
  // asking Kibi to compile it; this keeps the test workflow aligned with Git's
  // authority instead of weakening the compiler policy.
  execFileSync(resolveGitBinary(), ["add", "--", relativePath], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    stdio: "pipe",
  });
  console.log(`  📝 Created ${relativePath}`);
}

/** Mark a fixture path as Git-tracked so source compilation may consume it. */
export function stageSourceFile(
  sandbox: TestSandbox,
  relativePath: string,
): void {
  execFileSync(resolveGitBinary(), ["add", "--", relativePath], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    stdio: "pipe",
  });
}

/**
 * Assert that a file exists and is executable
 */
export function assertExecutable(filePath: string): void {
  try {
    // Check file exists
    const stats = execFileSync("stat", ["-c", "%a", filePath], {
      encoding: "utf8",
    }).trim();
    const mode = Number.parseInt(stats, 8);
    const isExecutable = (mode & 0o111) !== 0;

    if (!isExecutable) {
      throw new Error(`File ${filePath} is not executable (mode: ${stats})`);
    }
  } catch (err) {
    const error = err as Error;
    throw new Error(
      `Failed to check executable status of ${filePath}: ${error.message}`,
    );
  }
}

/**
 * Check if Prolog is available in environment
 */
export function checkPrologAvailable(): boolean {
  try {
    execFileSync("swipl", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/** Implementation: spawn node to require.resolve kibi-cli/prolog and assert prefix */
async function verifyKibiCliResolutionImpl(
  prefix: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const isDebug = process.env.E2E_LOG_LEVEL === "debug";

  if (isDebug) {
    if (process.env.KIBI_E2E_PREFIX) {
      console.log(
        `E2E debug: using baked prefix ${process.env.KIBI_E2E_PREFIX}`,
      );
    } else {
      console.log(`E2E debug: using sandbox-installed prefix ${prefix}`);
    }
  }

  // Node script that resolves the module and prints resolved path
  const script = `
    try {
      const p = require.resolve('kibi-cli/prolog');
      console.log(p);
      process.exit(0);
    } catch (e) {
      console.error('RESOLVE_ERROR', e && e.message ? e.message : String(e));
      process.exit(2);
    }
  `;

  const { stdout, stderr, exitCode } = await run("node", ["-e", script], {
    cwd: prefix,
    env,
    timeoutMs: 10000,
  });

  if (exitCode === 2) {
    throw new Error(`Failed to require.resolve('kibi-cli/prolog'):\n${stderr}`);
  }

  const resolved = (stdout || "").trim();
  if (!resolved) {
    throw new Error(
      `Empty resolution result for kibi-cli/prolog. stderr: ${stderr}`,
    );
  }

  const normalizedPrefix = prefix.replace(/\\/g, "/");
  const normalizedResolved = resolved.replace(/\\/g, "/");

  if (!normalizedResolved.startsWith(normalizedPrefix)) {
    throw new Error(
      `kibi-cli/prolog resolved to ${resolved} which is outside expected prefix ${prefix}`,
    );
  }

  if (isDebug)
    console.log(`E2E debug: require.resolve('kibi-cli/prolog') -> ${resolved}`);
}

await bootstrapSharedInstall(resolvePackSource());
