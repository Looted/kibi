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
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());

export interface TarballResult {
  tarballPath: string;
  version: string;
}

export interface IsolatedInstall {
  tmpDir: string;
  installDir: string;
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
    const searchDir = join(tarballEnv, "opencode");
    if (existsSync(searchDir)) {
      // Search for existing tarballs
      const files = readdirSync(searchDir).filter((f: string) =>
        f.match(/^kibi-opencode-.*\.tgz$/),
      );
      if (files.length > 0) {
        // Sort by modified time, newest first
        files.sort((a: string, b: string) => {
          const statA = statSync(join(searchDir, a));
          const statB = statSync(join(searchDir, b));
          return statB.mtimeMs - statA.mtimeMs;
        });
        const firstFile = files[0]!;
        const tarballPath = join(searchDir, firstFile);
        // Extract version from filename
        const match = firstFile.match(/kibi-opencode-(.+)\.tgz/);
        const version = match?.[1] ?? "unknown";
        log(`  📦 Using existing tarball: ${files[0]}`);
        return { tarballPath, version };
      }
    }
    // Fall through to pack if no tarballs found
  }

  // Pack fresh tarball
  log("  📦 Packing kibi-opencode...");
  const opencodeDir = join(repoRoot, "packages/opencode");

  interface PackResult {
    filename: string;
    version: string;
  }

  let packOutput: string;
  try {
    packOutput = execFileSync("npm", ["pack", "--json"], {
      cwd: opencodeDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    const err = error as Error & { stderr?: Buffer; stdout?: Buffer };
    throw new Error(
      `npm pack failed in ${opencodeDir}: ${err.message}${
        err.stderr ? `\nstderr: ${err.stderr.toString()}` : ""
      }${err.stdout ? `\nstdout: ${err.stdout.toString()}` : ""}`,
    );
  }

  const packResults = JSON.parse(packOutput) as PackResult[];
  if (!packResults?.[0]?.filename) {
    throw new Error("npm pack did not return a filename");
  }

  const tarballPath = join(opencodeDir, packResults[0].filename);
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
  try {
    execFileSync(
      "npm",
      ["install", "--legacy-peer-deps", "--no-audit", tarballPath],
      {
        cwd: installDir,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
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
