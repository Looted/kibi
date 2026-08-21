#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Prepare one immutable packed environment and run all selected Node test
 * files with bounded concurrency. Dependencies are injectable for focused
 * runner tests without a real npm pack.
 */
export async function runPackedE2E({
  compiledDirectory,
  testFiles,
  env = process.env,
  spawnProcess = spawn,
  importHelpers = async (directory) => {
    const helpersPath = path.join(directory, "helpers.js");
    if (!existsSync(helpersPath)) {
      throw new Error(`Packed E2E helper is missing: ${helpersPath}`);
    }
    return import(pathToFileURL(helpersPath).href);
  },
  nodeExecutable = process.execPath,
  signalTarget = process,
} = {}) {
  if (
    !compiledDirectory ||
    !Array.isArray(testFiles) ||
    testFiles.length === 0
  ) {
    throw new Error(
      "Usage: node scripts/run-packed-e2e.mjs <compiled-directory> <test-files...>",
    );
  }

  const helpers = await importHelpers(compiledDirectory);
  let child;
  let forwardSigint;
  let forwardSigterm;
  try {
    const packedEnvironment = await helpers.prepareSharedPackedEnvironment();
    if (
      !packedEnvironment ||
      typeof packedEnvironment.prefix !== "string" ||
      typeof packedEnvironment.tarballsRoot !== "string"
    ) {
      throw new Error(
        "Packed helper returned an invalid shared environment (expected prefix and tarballsRoot)",
      );
    }

    // Prepare before Node creates isolated test-file workers so every worker
    // inherits the same immutable consumer prefix and tarball source.
    // implements REQ-test-journaled-engine-harness
    child = spawnProcess(
      nodeExecutable,
      [
        "--test",
        "--test-concurrency=2",
        ...testFiles.map((testFile) => path.resolve(testFile)),
      ],
      {
        cwd: process.cwd(),
        env: {
          ...env,
          KIBI_E2E_PREFIX: packedEnvironment.prefix,
          KIBI_TEST_TARBALLS: packedEnvironment.tarballsRoot,
          KIBI_ENGINE_IDLE_TIMEOUT_MS: "30000",
        },
        stdio: "inherit",
      },
    );
    forwardSigint = () => child?.kill("SIGINT");
    forwardSigterm = () => child?.kill("SIGTERM");
    signalTarget.once("SIGINT", forwardSigint);
    signalTarget.once("SIGTERM", forwardSigterm);
    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) =>
        resolve(code ?? (signal === null ? 1 : 128)),
      );
    });
  } finally {
    if (forwardSigint) signalTarget.off("SIGINT", forwardSigint);
    if (forwardSigterm) signalTarget.off("SIGTERM", forwardSigterm);
    helpers.cleanupSharedPackedInstallation();
  }
}

async function main() {
  const [compiledDirectoryInput, ...testFiles] = process.argv.slice(2);
  return runPackedE2E({
    compiledDirectory:
      compiledDirectoryInput && path.resolve(compiledDirectoryInput),
    testFiles,
  });
}

const invokedPath = process.argv[1];
if (
  invokedPath &&
  path.resolve(invokedPath) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = await main();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
