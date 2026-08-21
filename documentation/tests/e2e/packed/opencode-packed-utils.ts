// Shared utilities for kibi-opencode packed e2e tests
//
// This module provides:
// - resolveOpencodeTarball: Find or create the opencode tarball
// - createIsolatedInstall: Create an isolated npm prefix for testing
// - installOpencodeTarball: Install the tarball into the isolated prefix

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createOwnedPackedTempDirectory } from "./helpers.js";
import {
  type NpmPackResult,
  parseNpmPackJsonOutput,
  resolveNpmPackFilename,
} from "./npm-pack-json.js";

const REPO_ROOT = resolve(process.cwd());

export interface TarballResult {
  tarballPath: string;
  version: string;
}

export interface IsolatedInstall {
  tmpDir: string;
  installDir: string;
}

type KibiPackage = "core" | "cli" | "runtime" | "mcp" | "opencode";

const REQUIRED_DEP_PACKAGES: ReadonlyArray<KibiPackage> = [
  "core",
  "cli",
  "runtime",
];

function findTarballFromEnv(
  tarballEnv: string,
  pkg: KibiPackage,
): string | null {
  const candidateDirs = [join(tarballEnv, pkg), tarballEnv];

  // Determine the expected version from the package manifest
  let preferredVersion: string | null = null;
  try {
    const pkgJsonPath = join(REPO_ROOT, "packages", pkg, "package.json");
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    preferredVersion = pkgJson.version ?? null;
  } catch {
    // If we can't read the package.json, proceed without version matching
  }

  for (const dir of candidateDirs) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f: string) =>
      f.match(new RegExp(`^kibi-${pkg}-.*\.tgz$`)),
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

    // Fall back to newest by mtime
    files.sort((a: string, b: string) => {
      const statA = statSync(join(dir, a));
      const statB = statSync(join(dir, b));
      return statB.mtimeMs - statA.mtimeMs;
    });

    const latest = files[0];
    if (!latest) continue;
    return join(dir, latest);
  }

  return null;
}

/**
 * Log a message only when KIBI_E2E_VERBOSE is set.
 * This prevents noisy console output in CI while allowing debugging when needed.
 */
function log(message: string): void {
  if (process.env.KIBI_E2E_VERBOSE) {
    console.log(message);
  }
}

function packKibiPackageTarball(
  pkg: KibiPackage,
  repoRoot: string = REPO_ROOT,
): string {
  const pkgDir = join(repoRoot, "packages", pkg);
  const packDestination = createOwnedPackedTempDirectory(
    "kibi-opencode-tarballs-",
  );

  let packOutput: string;
  try {
    packOutput = execFileSync(
      "npm",
      ["pack", "--json", "--pack-destination", packDestination],
      {
        cwd: pkgDir,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch (error) {
    const err = error as Error & { stderr?: Buffer; stdout?: Buffer };
    throw new Error(
      `npm pack failed in ${pkgDir}: ${err.message}${
        err.stderr ? `\nstderr: ${err.stderr.toString()}` : ""
      }${err.stdout ? `\nstdout: ${err.stdout.toString()}` : ""}`,
    );
  }

  const packResults = parseNpmPackJsonOutput(packOutput);
  if (!packResults?.[0]?.filename) {
    throw new Error(`npm pack did not return a filename for kibi-${pkg}`);
  }

  const tarballPath = resolveNpmPackFilename(
    packDestination,
    packResults[0].filename,
  );
  if (!existsSync(tarballPath)) {
    throw new Error(`Tarball not found: ${tarballPath}`);
  }

  return tarballPath;
}

export {
  type NpmPackResult,
  parseNpmPackJsonOutput,
} from "./npm-pack-json.js";

/**
 * Resolve the kibi-opencode tarball.
 *
 * If KIBI_TEST_TARBALLS env is set, searches that directory for existing tarballs.
 * Otherwise, runs `npm pack` in packages/opencode to create a fresh one.
 */
export function resolveOpencodeTarball(
  repoRoot: string = REPO_ROOT,
): TarballResult {
  // implements REQ-opencode-kibi-plugin-v1
  const tarballEnv = process.env.KIBI_TEST_TARBALLS;

  if (tarballEnv) {
    const found = findTarballFromEnv(tarballEnv, "opencode");
    if (found) {
      const filename = found.split("/").pop() ?? "";
      const match = filename.match(/kibi-opencode-(.+)\.tgz/);
      const version = match?.[1] ?? "unknown";
      log(`  📦 Using existing tarball: ${filename}`);
      return { tarballPath: found, version };
    }
    // Fall through to pack if no tarballs found
  }

  // Pack fresh tarball
  log("  📦 Packing kibi-opencode...");
  const opencodeDir = join(repoRoot, "packages/opencode");
  const packDestination = createOwnedPackedTempDirectory(
    "kibi-opencode-tarballs-",
  );

  let packOutput: string;
  try {
    packOutput = execFileSync(
      "npm",
      ["pack", "--json", "--pack-destination", packDestination],
      {
        cwd: opencodeDir,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch (error) {
    const err = error as Error & { stderr?: Buffer; stdout?: Buffer };
    throw new Error(
      `npm pack failed in ${opencodeDir}: ${err.message}${
        err.stderr ? `\nstderr: ${err.stderr.toString()}` : ""
      }${err.stdout ? `\nstdout: ${err.stdout.toString()}` : ""}`,
    );
  }

  const packResults = parseNpmPackJsonOutput(packOutput);
  if (!packResults?.[0]?.filename) {
    throw new Error("npm pack did not return a filename");
  }

  const tarballPath = resolveNpmPackFilename(
    packDestination,
    packResults[0].filename,
  );
  if (!existsSync(tarballPath)) {
    throw new Error(`Tarball not found: ${tarballPath}`);
  }

  log(`  ✓ Packed: ${packResults[0].filename}`);
  return { tarballPath, version: packResults[0].version };
}

/**
 * Create an isolated npm prefix for testing.
 *
 * Creates a temporary directory with a minimal package.json.
 */
export function createIsolatedInstall(prefix?: string): IsolatedInstall {
  // implements REQ-opencode-kibi-plugin-v1
  const tmpDir = mkdtempSync(
    join(prefix || tmpdir(), "kibi-opencode-packed-e2e-"),
  );
  const installDir = join(tmpDir, "install");
  mkdirSync(installDir, { recursive: true });

  // Write minimal package.json
  writeFileSync(
    join(installDir, "package.json"),
    JSON.stringify(
      {
        name: "kibi-opencode-packed-e2e",
        private: true,
        type: "module",
      },
      null,
      2,
    ),
    "utf8",
  );

  return { tmpDir, installDir };
}

/**
 * Install a tarball into an isolated prefix.
 */
export function installOpencodeTarball(
  installDir: string,
  tarballPath: string,
): void {
  // implements REQ-opencode-kibi-plugin-v1
  log("  📥 Installing kibi-opencode from tarball...");
  const installArgs = ["install", "--no-audit"];
  const tarballEnv = process.env.KIBI_TEST_TARBALLS;

  for (const dep of ["core", "cli", "runtime"] as const) {
    if (tarballEnv) {
      const depTarball = findTarballFromEnv(tarballEnv, dep);
      if (depTarball) {
        installArgs.push(depTarball);
      } else if (REQUIRED_DEP_PACKAGES.includes(dep)) {
        throw new Error(
          `Required dependency tarball for kibi-${dep} not found in KIBI_TEST_TARBALLS=${tarballEnv}. ` +
            `Ensure the tarball is present in ${tarballEnv}/${dep}/ or ${tarballEnv}/ before running packed tests.`,
        );
      }
    } else {
      installArgs.push(packKibiPackageTarball(dep));
    }
  }

  installArgs.push(tarballPath);

  try {
    execFileSync("npm", installArgs, {
      cwd: installDir,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    const err = error as Error & { stderr?: Buffer; stdout?: Buffer };
    throw new Error(
      `npm install failed for ${tarballPath} in ${installDir}: ${err.message}${
        err.stderr ? `\nstderr: ${err.stderr.toString()}` : ""
      }${err.stdout ? `\nstdout: ${err.stdout.toString()}` : ""}`,
    );
  }
  log("  ✓ Installed");
}
