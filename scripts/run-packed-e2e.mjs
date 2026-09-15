#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Node 22 only accepts the experimental isolation flag. Node 24+ stabilized
 * `--test-isolation`. In-process isolation avoids worker IPC deserialize
 * flakes (`Unable to deserialize cloned data`) that fail passing packed runs.
 */
export function packedTestIsolationArg(nodeVersion = process.versions.node) {
  const major = Number.parseInt(String(nodeVersion).split(".")[0] ?? "0", 10);
  return Number.isFinite(major) && major >= 24
    ? "--test-isolation=none"
    : "--experimental-test-isolation=none";
}

/**
 * Proof runs use the TAP reporter so that a successful Node process cannot
 * hide a suite with skipped or todo cases from an unavailable prerequisite.
 * The normal packed runner keeps the child output unchanged for local/CI
 * diagnostics and does not apply this proof-only policy.
 */
export function validatePackedProofSummary(output) {
  const summary = new Map();
  for (const line of String(output).split(/\r?\n/)) {
    const match = /^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/.exec(
      line,
    );
    if (match) summary.set(match[1], Number.parseInt(match[2], 10));
  }
  const fields = ["tests", "pass", "fail", "cancelled", "skipped", "todo"];
  if (fields.some((field) => !Number.isInteger(summary.get(field)))) {
    throw new Error("Packed proof E2E did not produce a complete TAP summary");
  }
  const tests = summary.get("tests");
  const pass = summary.get("pass");
  const fail = summary.get("fail");
  const cancelled = summary.get("cancelled");
  const skipped = summary.get("skipped");
  const todo = summary.get("todo");
  if (tests <= 0) {
    throw new Error("Packed proof E2E executed zero tests");
  }
  if (
    tests !== pass + fail + cancelled + skipped + todo ||
    pass <= 0 ||
    fail !== 0 ||
    cancelled !== 0 ||
    skipped !== 0 ||
    todo !== 0 ||
    tests - skipped - todo <= 0
  ) {
    throw new Error(
      `Packed proof E2E executed no passing runnable tests (tests=${tests}, pass=${pass}, fail=${fail}, cancelled=${cancelled}, skipped=${skipped}, todo=${todo})`,
    );
  }
}

export async function defaultImportHelpers(directory) {
  const helpersPath = path.join(directory, "helpers.js");
  if (!existsSync(helpersPath)) {
    throw new Error(`Packed E2E helper is missing: ${helpersPath}`);
  }
  return import(pathToFileURL(helpersPath).href);
}

/**
 * Prepare one immutable packed environment and run all selected Node test
 * files with bounded concurrency. Dependencies are injectable for focused
 * runner tests without a real npm pack.
 */
export async function runPackedE2E(options = {}) {
  const compiledDirectory = options.compiledDirectory;
  const testFiles = options.testFiles;
  const env = options.env ?? process.env;
  const spawnProcess = options.spawnProcess ?? spawn;
  const importHelpers = options.importHelpers ?? defaultImportHelpers;
  const nodeExecutable = options.nodeExecutable ?? process.execPath;
  const signalTarget = options.signalTarget ?? process;
  const proofMode = options.proofMode ?? env.KIBI_PROOF_PACKED === "1";
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
    const childArguments = [
      "--test",
      "--test-concurrency=1",
      "--test-force-exit",
      packedTestIsolationArg(),
      ...(proofMode ? ["--test-reporter=tap"] : []),
      ...testFiles.map((testFile) => path.resolve(testFile)),
    ];
    child = spawnProcess(nodeExecutable, childArguments, {
      cwd: process.cwd(),
      env: {
        ...env,
        KIBI_E2E_PREFIX: packedEnvironment.prefix,
        KIBI_TEST_TARBALLS: packedEnvironment.tarballsRoot,
        KIBI_ENGINE_IDLE_TIMEOUT_MS: "30000",
      },
      stdio: proofMode ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    let proofOutput = "";
    if (proofMode && child.stdout?.on) {
      child.stdout.on("data", (chunk) => {
        const text = typeof chunk === "string" ? chunk : chunk.toString();
        proofOutput += text;
        process.stdout.write(text);
      });
    }
    forwardSigint = () => child?.kill("SIGINT");
    forwardSigterm = () => child?.kill("SIGTERM");
    signalTarget.once("SIGINT", forwardSigint);
    signalTarget.once("SIGTERM", forwardSigterm);
    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      const complete = (code, signal) => {
        const exitCode = code ?? (signal === null ? 1 : 128);
        try {
          if (proofMode && exitCode === 0)
            validatePackedProofSummary(proofOutput);
          resolve(exitCode);
        } catch (error) {
          reject(error);
        }
      };
      // A piped stdout stream may still contain reporter output after the
      // child emits `exit`; wait for `close` before parsing the TAP summary.
      if (proofMode && child.stdout?.on) child.once("close", complete);
      else child.once("exit", complete);
    });
  } finally {
    if (forwardSigint) signalTarget.off("SIGINT", forwardSigint);
    if (forwardSigterm) signalTarget.off("SIGTERM", forwardSigterm);
    helpers.cleanupSharedPackedInstallation();
  }
}

export async function main() {
  const [compiledDirectoryInput, ...testFiles] = process.argv.slice(2);
  return runPackedE2E({
    compiledDirectory:
      compiledDirectoryInput && path.resolve(compiledDirectoryInput),
    testFiles,
  });
}

export async function runPackedE2EIfEntrypoint(
  invokedPath = process.argv[1],
  moduleUrl = import.meta.url,
  start = main,
) {
  if (!invokedPath || path.resolve(invokedPath) !== fileURLToPath(moduleUrl)) {
    return;
  }
  try {
    process.exitCode = await start();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

await runPackedE2EIfEntrypoint();
