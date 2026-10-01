/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Resolves the SWI-Prolog executable Kibi runs, in this order:
 *
 * 1. `KIBI_SWIPL=<absolute path>` (an explicit operator choice always wins).
 * 2. The bundled platform package (`kibi-swipl-<platform>`), after its build
 *    manifest and binary checksum verify. `KIBI_SWIPL=system` skips this step.
 * 3. `swipl` on `PATH`, subject to the SWI-Prolog 9.0 minimum.
 * 4. Otherwise an error naming the platform, the platform package that would
 *    have covered it, and the OS install command.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  constants,
  accessSync,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import {
  BUNDLED_BINARY_PATH,
  MANIFEST_FILE,
  PLATFORM_PACKAGES,
  type PlatformKey,
  locatePlatformPackage,
  platformKey,
  sha256File,
  validateBuildManifest,
} from "kibi-swipl";

export type SwiplSource = "env" | "bundled" | "path";

export type ResolvedSwipl = {
  /** Absolute path to the executable. */
  bin: string;
  /** SWI_HOME_DIR for a bundled build. */
  home?: string;
  /** Upstream SWI-Prolog version, e.g. "10.0.2". */
  version: string;
  source: SwiplSource;
};

export const MINIMUM_SWIPL_MAJOR = 9;

export type SwiplResolutionErrorCode =
  | "swipl_not_found"
  | "swipl_env_invalid"
  | "swipl_bundle_corrupt";

/** Structured failure; `message` is the complete operator-facing guidance. */
export class SwiplResolutionError extends Error {
  readonly code: SwiplResolutionErrorCode;
  /** Detected host, e.g. "linux-x64 (glibc)". */
  readonly platform: string;
  /** Platform package that would have covered this host, when one exists. */
  readonly packageName: string | undefined;

  constructor(
    code: SwiplResolutionErrorCode,
    message: string,
    platform: string,
    packageName: string | undefined,
  ) {
    super(message);
    this.name = "SwiplResolutionError";
    this.code = code;
    this.platform = platform;
    this.packageName = packageName;
  }
}

export type SwiplResolverDeps = {
  platform: string;
  arch: string;
  /** True on glibc Linux, false on musl, undefined off Linux. */
  glibc: boolean | undefined;
  /** Directory of an installed platform package, or undefined. */
  locatePackage: (packageName: string) => string | undefined;
  /** Output of `<bin> --version`; throws when the executable cannot run. */
  runVersion: (bin: string) => string;
};

function detectGlibc(): boolean | undefined {
  if (process.platform !== "linux") return undefined;
  try {
    const report = process.report?.getReport?.() as
      | { header?: { glibcVersionRuntime?: unknown } }
      | undefined;
    if (report !== undefined) {
      return typeof report.header?.glibcVersionRuntime === "string";
    }
  } catch {
    // Fall back to the musl loader probe below.
  }
  return !["/lib/ld-musl-x86_64.so.1", "/lib/ld-musl-aarch64.so.1"].some(
    (loader) => existsSync(loader),
  );
}

function defaultRunVersion(bin: string): string {
  return execFileSync(bin, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function defaultDeps(): SwiplResolverDeps {
  return {
    platform: process.platform,
    arch: process.arch,
    glibc: detectGlibc(),
    locatePackage: (name) => locatePlatformPackage(name),
    runVersion: defaultRunVersion,
  };
}

/** Parse `SWI-Prolog version 10.0.2 for x86_64-linux` into its version. */
export function parseSwiplVersion(
  output: string,
): { version: string; major: number } | undefined {
  const match = /version\s+(\d+)\.(\d+)(?:\.(\d+))?/i.exec(output);
  if (match === null) return undefined;
  const [, major, minor, patch] = match;
  return {
    version: `${major}.${minor}${patch === undefined ? "" : `.${patch}`}`,
    major: Number.parseInt(major ?? "0", 10),
  };
}

function installCommand(platform: string): string {
  if (platform === "linux") {
    return "sudo apt-add-repository ppa:swi-prolog/stable && sudo apt-get update && sudo apt-get install swi-prolog";
  }
  if (platform === "darwin") return "brew install swi-prolog";
  return "download the installer from https://www.swi-prolog.org/download/stable and add swipl to PATH";
}

function hostLabel(deps: SwiplResolverDeps): string {
  const libc =
    deps.platform === "linux" && deps.glibc !== undefined
      ? ` (${deps.glibc ? "glibc" : "musl"})`
      : "";
  return `${deps.platform}-${deps.arch}${libc}`;
}

type BundleInspection =
  | { kind: "unsupported" }
  | { kind: "missing"; key: PlatformKey; packageName: string }
  | { kind: "empty"; key: PlatformKey; packageName: string }
  | {
      kind: "corrupt";
      key: PlatformKey;
      packageName: string;
      reason: string;
    }
  | {
      kind: "ok";
      key: PlatformKey;
      packageName: string;
      resolved: ResolvedSwipl;
    };

function isExecutableFile(candidate: string): boolean {
  try {
    if (!statSync(candidate).isFile()) return false;
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function inspectBundle(deps: SwiplResolverDeps): BundleInspection {
  const key = platformKey({
    platform: deps.platform,
    arch: deps.arch,
    glibc: deps.glibc,
  });
  if (key === undefined) return { kind: "unsupported" };
  const packageName = PLATFORM_PACKAGES[key].package;
  const packageDir = deps.locatePackage(packageName);
  if (packageDir === undefined) return { kind: "missing", key, packageName };

  const manifestPath = path.join(packageDir, MANIFEST_FILE);
  const binary = path.join(packageDir, BUNDLED_BINARY_PATH);
  if (!existsSync(manifestPath)) {
    // A workspace checkout links the package without the pipeline payload.
    // A binary without a manifest is a damaged install, not a placeholder.
    if (!existsSync(binary)) return { kind: "empty", key, packageName };
    return {
      kind: "corrupt",
      key,
      packageName,
      reason: `${MANIFEST_FILE} is missing next to ${BUNDLED_BINARY_PATH}`,
    };
  }

  const corrupt = (reason: string): BundleInspection => ({
    kind: "corrupt",
    key,
    packageName,
    reason,
  });
  let manifest: unknown;
  let packageJson: { kibi?: { swiplVersion?: unknown } };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return corrupt(
      `${MANIFEST_FILE} is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  try {
    packageJson = JSON.parse(
      readFileSync(path.join(packageDir, "package.json"), "utf8"),
    ) as { kibi?: { swiplVersion?: unknown } };
  } catch (error) {
    return corrupt(
      `package.json is unreadable (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const packageVersion = packageJson.kibi?.swiplVersion;
  const checked = validateBuildManifest(manifest, {
    target: key,
    swiplVersion:
      typeof packageVersion === "string" ? packageVersion : undefined,
  });
  if (!checked.ok) return corrupt(checked.reason);
  if (!isExecutableFile(binary)) {
    return corrupt(`${BUNDLED_BINARY_PATH} is missing or not executable`);
  }
  let actual: string;
  try {
    actual = sha256File(binary);
  } catch (error) {
    return corrupt(
      `${BUNDLED_BINARY_PATH} is unreadable (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (actual !== checked.binarySha256) {
    return corrupt(
      `${BUNDLED_BINARY_PATH} SHA-256 ${actual} does not match the manifest (${checked.binarySha256})`,
    );
  }
  const home = path.join(packageDir, checked.home);
  let homeIsDirectory = false;
  try {
    homeIsDirectory = statSync(home).isDirectory();
  } catch {
    // reported below
  }
  if (!homeIsDirectory) return corrupt(`${checked.home} is missing`);
  return {
    kind: "ok",
    key,
    packageName,
    resolved: {
      bin: binary,
      home,
      version: checked.swiplVersion,
      source: "bundled",
    },
  };
}

type VersionProbe =
  | { kind: "ok"; version: string }
  | { kind: "too-old"; version: string }
  | { kind: "unusable"; detail: string };

function probeVersion(bin: string, deps: SwiplResolverDeps): VersionProbe {
  let output: string;
  try {
    output = deps.runVersion(bin);
  } catch (error) {
    return {
      kind: "unusable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  const parsed = parseSwiplVersion(output);
  if (parsed === undefined) {
    return {
      kind: "unusable",
      detail: `unrecognized --version output ${JSON.stringify(output.trim().slice(0, 80))}`,
    };
  }
  if (parsed.major < MINIMUM_SWIPL_MAJOR) {
    return { kind: "too-old", version: parsed.version };
  }
  return { kind: "ok", version: parsed.version };
}

type PathLookup =
  | { kind: "ok"; resolved: ResolvedSwipl }
  | { kind: "absent" }
  | { kind: "too-old"; bin: string; version: string }
  | { kind: "unusable"; bin: string; detail: string };

function findOnPath(
  env: NodeJS.ProcessEnv,
  deps: SwiplResolverDeps,
): PathLookup {
  for (const directory of (env.PATH ?? "").split(path.delimiter)) {
    if (directory === "" || !path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, "swipl");
    if (!isExecutableFile(candidate)) continue;
    const probe = probeVersion(candidate, deps);
    if (probe.kind === "ok") {
      return {
        kind: "ok",
        resolved: { bin: candidate, version: probe.version, source: "path" },
      };
    }
    return probe.kind === "too-old"
      ? { kind: "too-old", bin: candidate, version: probe.version }
      : { kind: "unusable", bin: candidate, detail: probe.detail };
  }
  return { kind: "absent" };
}

function resolveFromEnv(
  override: string,
  deps: SwiplResolverDeps,
): ResolvedSwipl {
  const platform = hostLabel(deps);
  const key = platformKey({
    platform: deps.platform,
    arch: deps.arch,
    glibc: deps.glibc,
  });
  const packageName =
    key === undefined ? undefined : PLATFORM_PACKAGES[key].package;
  const invalid = (detail: string): SwiplResolutionError =>
    new SwiplResolutionError(
      "swipl_env_invalid",
      `KIBI_SWIPL=${override} ${detail}. Set KIBI_SWIPL to the absolute path of a SWI-Prolog ${MINIMUM_SWIPL_MAJOR}.0+ executable, to "system" to use swipl from PATH, or unset it to use the bundled runtime.`,
      platform,
      packageName,
    );
  if (!path.isAbsolute(override))
    return fail(invalid("is not an absolute path"));
  if (!isExecutableFile(override)) {
    return fail(invalid("is not an executable file"));
  }
  const probe = probeVersion(override, deps);
  if (probe.kind === "unusable") {
    return fail(invalid(`could not report its version (${probe.detail})`));
  }
  if (probe.kind === "too-old") {
    return fail(
      invalid(
        `is SWI-Prolog ${probe.version}, but ${MINIMUM_SWIPL_MAJOR}.0 or newer is required`,
      ),
    );
  }
  return { bin: override, version: probe.version, source: "env" };
}

function fail(error: SwiplResolutionError): never {
  throw error;
}

function notFoundError(
  deps: SwiplResolverDeps,
  bundle: BundleInspection | "skipped",
  lookup: PathLookup,
): SwiplResolutionError {
  const platform = hostLabel(deps);
  const command = installCommand(deps.platform);
  const lines = [
    `Kibi could not find a usable SWI-Prolog (${MINIMUM_SWIPL_MAJOR}.0 or newer is required).`,
    `Detected platform: ${platform}.`,
  ];
  let packageName: string | undefined;
  if (bundle === "skipped") {
    lines.push("Bundled SWI-Prolog: skipped because KIBI_SWIPL=system.");
    const key = platformKey({
      platform: deps.platform,
      arch: deps.arch,
      glibc: deps.glibc,
    });
    if (key !== undefined) packageName = PLATFORM_PACKAGES[key].package;
  } else if (bundle.kind === "unsupported") {
    lines.push(
      `Bundled SWI-Prolog: no bundled build exists for ${platform} (supported: ${Object.keys(PLATFORM_PACKAGES).join(", ")}).`,
    );
  } else {
    packageName = bundle.packageName;
    if (bundle.kind === "empty") {
      lines.push(
        `Bundled SWI-Prolog: package ${bundle.packageName} is installed but carries no runtime (a source checkout that was not populated from a release build).`,
      );
    } else {
      lines.push(
        `Bundled SWI-Prolog: package ${bundle.packageName} would cover this platform but is not installed. It is skipped by installs that omit optional dependencies (npm --omit=optional, --no-optional) and by pnpm supportedArchitectures settings that exclude this platform.`,
      );
      lines.push(`  Add it with: npm install --save-dev ${bundle.packageName}`);
    }
  }
  if (bundle === "skipped" && packageName !== undefined) {
    lines.push(`  To use it, unset KIBI_SWIPL and install ${packageName}.`);
  }
  switch (lookup.kind) {
    case "absent":
      lines.push("System SWI-Prolog: swipl was not found on PATH.");
      break;
    case "too-old":
      lines.push(
        `System SWI-Prolog: swipl on PATH (${lookup.bin}) is version ${lookup.version}, older than ${MINIMUM_SWIPL_MAJOR}.0.`,
      );
      break;
    case "unusable":
      lines.push(
        `System SWI-Prolog: swipl on PATH (${lookup.bin}) could not report its version (${lookup.detail}).`,
      );
      break;
    case "ok":
      break;
  }
  lines.push(`  Install it with: ${command}`);
  lines.push(
    `Or set KIBI_SWIPL to the absolute path of a SWI-Prolog ${MINIMUM_SWIPL_MAJOR}.0+ executable.`,
  );
  return new SwiplResolutionError(
    "swipl_not_found",
    lines.join("\n"),
    platform,
    packageName,
  );
}

/** Uncached resolution with injectable host facts; the test seam. */
export function resolveSwiplWith(
  env: NodeJS.ProcessEnv,
  deps: SwiplResolverDeps,
): ResolvedSwipl {
  const override = env.KIBI_SWIPL?.trim() ?? "";
  if (override !== "" && override !== "system") {
    return resolveFromEnv(override, deps);
  }
  let bundle: BundleInspection | "skipped" = "skipped";
  if (override === "") {
    bundle = inspectBundle(deps);
    if (bundle.kind === "ok") return bundle.resolved;
    if (bundle.kind === "corrupt") {
      throw new SwiplResolutionError(
        "swipl_bundle_corrupt",
        [
          `The bundled SWI-Prolog package ${bundle.packageName} is damaged: ${bundle.reason}.`,
          `Detected platform: ${hostLabel(deps)}.`,
          `Reinstall it (for example: npm install --save-dev ${bundle.packageName}), or set KIBI_SWIPL=system to use swipl from PATH instead.`,
        ].join("\n"),
        hostLabel(deps),
        bundle.packageName,
      );
    }
  }
  const lookup = findOnPath(env, deps);
  if (lookup.kind === "ok") return lookup.resolved;
  throw notFoundError(deps, bundle, lookup);
}

const cache = new Map<string, ResolvedSwipl>();

/**
 * Resolve the SWI-Prolog executable for this process. The result is cached for
 * the lifetime of the process, keyed by the inputs that select it.
 */
export function resolveSwipl(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedSwipl {
  const key = `${env.KIBI_SWIPL ?? ""}\0${env.PATH ?? ""}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const resolved = resolveSwiplWith(env, defaultDeps());
  cache.set(key, resolved);
  return resolved;
}

/** Test seam: forget every cached resolution. */
export function resetSwiplResolverCache(): void {
  cache.clear();
}

/** Stable identity of a resolved runtime, compared across engine processes. */
export function swiplIdentity(resolved: ResolvedSwipl): string {
  return `${resolved.bin}@${resolved.version}`;
}

/** Environment additions a child needs to run the resolved SWI-Prolog. */
export function swiplChildEnv(
  resolved: Pick<ResolvedSwipl, "home">,
): Record<string, string> {
  return resolved.home === undefined ? {} : { SWI_HOME_DIR: resolved.home };
}

export type BundleStatus =
  | { state: "unsupported" }
  | { state: "missing" | "empty"; packageName: string }
  | { state: "corrupt"; packageName: string; reason: string }
  | { state: "installed"; packageName: string };

/** Report the bundled package's state without resolving a runtime. */
export function inspectSwiplBundle(
  deps: SwiplResolverDeps = defaultDeps(),
): BundleStatus {
  const bundle = inspectBundle(deps);
  switch (bundle.kind) {
    case "unsupported":
      return { state: "unsupported" };
    case "missing":
    case "empty":
      return { state: bundle.kind, packageName: bundle.packageName };
    case "corrupt":
      return {
        state: "corrupt",
        packageName: bundle.packageName,
        reason: bundle.reason,
      };
    case "ok":
      return { state: "installed", packageName: bundle.packageName };
  }
}

/** Libraries Kibi loads at runtime; a SWI-Prolog lacking one cannot serve it. */
export const REQUIRED_SWIPL_LIBRARIES = [
  "semweb/rdf_db",
  "semweb/rdf_persistency",
  "semweb/sparql_client",
  "pcre",
  "crypto",
  "sha",
  "http/json",
  "http/json_convert",
  "chr",
  "clpfd",
  "thread",
  "persistency",
  "filesex",
  "readutil",
  "date",
  "aggregate",
  "solution_sequences",
] as const;

const MISSING_LIBRARY_MARKER = "__KIBI_MISSING_LIBRARY__:";

export type SwiplGoalRunner = (
  bin: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
) => { status: number | null; stdout: string; stderr: string; error?: Error };

function defaultGoalRunner(
  bin: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): ReturnType<SwiplGoalRunner> {
  const result = spawnSync(bin, [...args], {
    encoding: "utf8",
    timeout: 60_000,
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    ...(result.error === undefined ? {} : { error: result.error }),
  };
}

export type LibraryProbe =
  | { kind: "ok" }
  | { kind: "missing"; libraries: string[] }
  | { kind: "failed"; detail: string };

/**
 * Load every required library in one throwaway SWI-Prolog process and report
 * the ones that fail. A probe that cannot run is reported as such, never as a
 * pass.
 */
export function probeRequiredLibraries(
  resolved: ResolvedSwipl,
  run: SwiplGoalRunner = defaultGoalRunner,
  env: NodeJS.ProcessEnv = process.env,
): LibraryProbe {
  const goal = `forall(member(L, [${REQUIRED_SWIPL_LIBRARIES.join(", ")}]), (catch(use_module(library(L)), _, fail) -> true ; format("${MISSING_LIBRARY_MARKER}~w~n", [L])))`;
  const result = run(resolved.bin, ["-q", "-g", goal, "-t", "halt"], {
    ...env,
    ...swiplChildEnv(resolved),
  });
  if (result.error !== undefined) {
    return { kind: "failed", detail: result.error.message };
  }
  if (result.status !== 0) {
    const detail = result.stderr.trim().split("\n")[0] ?? "";
    return {
      kind: "failed",
      detail: `exit status ${result.status ?? "none"}${detail === "" ? "" : `: ${detail}`}`,
    };
  }
  const libraries = result.stdout
    .split("\n")
    .filter((line) => line.startsWith(MISSING_LIBRARY_MARKER))
    .map((line) => line.slice(MISSING_LIBRARY_MARKER.length).trim());
  return libraries.length === 0
    ? { kind: "ok" }
    : { kind: "missing", libraries };
}
