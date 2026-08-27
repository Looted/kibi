#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Return the first packed runner's compiled directory in registry order. */
export function findPackedCompiledDirectory(entries) {
  let packedDirectory = null;
  for (const entry of entries) {
    for (const step of entry.steps ?? []) {
      const runnerIndex = step.indexOf("scripts/run-packed-e2e.mjs");
      if (runnerIndex < 0) continue;
      const compiledDirectory = step[runnerIndex + 1];
      if (!compiledDirectory) {
        throw new Error(
          `Packed proof step is missing its compiled directory: ${JSON.stringify(step)}`,
        );
      }
      const resolvedDirectory = path.resolve(compiledDirectory);
      if (packedDirectory && packedDirectory !== resolvedDirectory) {
        throw new Error(
          `Packed proof steps use conflicting compiled directories: ${packedDirectory} and ${resolvedDirectory}`,
        );
      }
      packedDirectory = resolvedDirectory;
    }
  }
  return packedDirectory;
}

function parseOnly(args) {
  const onlyIndex = args.indexOf("--only");
  return onlyIndex >= 0
    ? new Set((args[onlyIndex + 1] ?? "").split(",").filter(Boolean))
    : null;
}

function selectEntries(registry, args) {
  const only = parseOnly(args);
  const entries = registry.contracts.filter(
    (entry) => !only || only.has(entry.test_id),
  );
  if (entries.length === 0) throw new Error("No proof contracts selected");
  return entries;
}

function runProcess(command, argv, options, spawnProcess) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, argv, options);
    child.once("error", reject);
    child.once("close", (code, signal) =>
      resolve(code ?? (signal === null ? 1 : 128)),
    );
  });
}

/**
 * Execute selected contracts in registry order. Dependencies are injectable
 * so this contract can be tested without a real npm pack or Kibi run.
 */
// implements REQ-test-journaled-engine-harness
export async function runProofContracts({
  registry,
  args = [],
  env = process.env,
  cwd = process.cwd(),
  spawnProcess = spawn,
  importHelpers = async (compiledDirectory) => {
    const helpersPath = path.join(compiledDirectory, "helpers.js");
    if (!existsSync(helpersPath)) {
      throw new Error(`Packed E2E helper is missing: ${helpersPath}`);
    }
    return import(pathToFileURL(helpersPath).href);
  },
  writeOut = (text) => process.stdout.write(text),
  writeErr = (text) => process.stderr.write(text),
} = {}) {
  if (!registry || !Array.isArray(registry.contracts)) {
    throw new Error("Proof registry is missing its contracts array");
  }
  const entries = selectEntries(registry, args);
  const kibi = env.KIBI_CLI ?? "kibi";
  const compiledDirectory = findPackedCompiledDirectory(entries);
  let packedHelpers = null;
  let runEnv = { ...env };
  const results = [];

  try {
    if (compiledDirectory) {
      packedHelpers = await importHelpers(compiledDirectory);
      const packedEnvironment =
        await packedHelpers.prepareSharedPackedEnvironment();
      if (
        !packedEnvironment ||
        typeof packedEnvironment.prefix !== "string" ||
        typeof packedEnvironment.tarballsRoot !== "string"
      ) {
        throw new Error(
          "Packed helper returned an invalid shared environment (expected prefix and tarballsRoot)",
        );
      }
      runEnv = {
        ...runEnv,
        KIBI_E2E_PREFIX: packedEnvironment.prefix,
        KIBI_TEST_TARBALLS: packedEnvironment.tarballsRoot,
      };
    }

    for (const entry of entries) {
      const argv = [
        "verify",
        "--test-id",
        entry.test_id,
        "--",
        ...entry.contract.command_argv,
      ];
      writeOut(`\n==> Contracted verification: ${entry.test_id}\n`);
      const exitCode = await runProcess(
        kibi,
        argv,
        { cwd, env: runEnv, shell: false, stdio: "inherit" },
        spawnProcess,
      );
      results.push({ test_id: entry.test_id, exitCode });
      if (exitCode !== 0) {
        writeErr(`Contract failed: ${entry.test_id}\n`);
        break;
      }
    }

    writeOut(
      `\n${JSON.stringify({ version: "kibi.proof-run.v1", results }, null, 2)}\n`,
    );
    return results.some((result) => result.exitCode !== 0) ? 1 : 0;
  } finally {
    if (packedHelpers) {
      packedHelpers.cleanupSharedPackedInstallation();
    }
  }
}

async function main() {
  const registry = JSON.parse(
    await readFile(path.resolve("proof/verification-registry.json"), "utf8"),
  );
  return runProofContracts({ registry, args: process.argv.slice(2) });
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
