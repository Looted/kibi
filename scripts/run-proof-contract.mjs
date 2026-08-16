#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const registryPath = path.resolve("proof/verification-registry.json");
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const args = process.argv.slice(2);
const testIndex = args.indexOf("--test-id");
const testId = testIndex >= 0 ? args[testIndex + 1] : undefined;
if (!testId) throw new Error("Usage: node scripts/run-proof-contract.mjs --test-id TEST-ID");

const entry = registry.contracts.find((candidate) => candidate.test_id === testId);
if (!entry) throw new Error(`No proof contract is registered for ${testId}`);
const outputPath = process.env.KIBI_VERIFICATION_OUTPUT;
if (!outputPath) throw new Error("KIBI_VERIFICATION_OUTPUT is required");

function run(argv) {
  const [command, ...commandArgs] = argv;
  if (!command) throw new Error("Proof contract step has an empty argv");
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code, signal) =>
      resolve(code ?? (signal === null ? 1 : 128)),
    );
  });
}

const startedAt = new Date().toISOString();
let exitCode = 0;
for (const step of entry.steps) {
  exitCode = await run(step);
  if (exitCode !== 0) break;
}

const finishedAt = new Date().toISOString();
const commandArgv = JSON.parse(process.env.KIBI_VERIFICATION_COMMAND_ARGV ?? "[]");
const environmentHash =
  process.env.KIBI_LOCKFILE_DIGEST ??
  createHash("sha256")
    .update(JSON.stringify({ node: process.version, platform: process.platform }))
    .digest("hex");
const outcome = exitCode === 0 ? "passed" : "failed";
const duration = Math.max(
  0,
  new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
);
const artifact = {
  version: "kibi.playwright-run.v1",
  runner: entry.contract.runner,
  command_argv: commandArgv,
  code_snapshot: process.env.KIBI_VERIFICATION_SNAPSHOT ?? "",
  environment_hash: environmentHash,
  started_at: startedAt,
  finished_at: finishedAt,
  process_exit_code: exitCode,
  cases: entry.contract.required_case_symbols.map((symbolId) => ({
    symbol_id: symbolId,
    project: entry.contract.required_projects[0],
    outcome,
    retries: 0,
    duration_ms: duration,
  })),
};
await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
await writeFile(path.resolve(outputPath), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
process.exitCode = exitCode;
