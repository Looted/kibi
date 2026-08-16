#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const registry = JSON.parse(
  await readFile(path.resolve("proof/verification-registry.json"), "utf8"),
);
const args = process.argv.slice(2);
const onlyIndex = args.indexOf("--only");
const only = onlyIndex >= 0 ? new Set((args[onlyIndex + 1] ?? "").split(",").filter(Boolean)) : null;
const entries = registry.contracts.filter((entry) => !only || only.has(entry.test_id));
if (entries.length === 0) throw new Error("No proof contracts selected");

const kibi = process.env.KIBI_CLI ?? "kibi";
function run(argv) {
  return new Promise((resolve, reject) => {
    const child = spawn(kibi, argv, {
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

const results = [];
for (const entry of entries) {
  const argv = [
    "verify",
    "--test-id",
    entry.test_id,
    "--",
    ...entry.contract.command_argv,
  ];
  process.stdout.write(`\n==> Contracted verification: ${entry.test_id}\n`);
  const exitCode = await run(argv);
  results.push({ test_id: entry.test_id, exitCode });
  if (exitCode !== 0) {
    process.stderr.write(`Contract failed: ${entry.test_id}\n`);
    process.exitCode = 1;
    break;
  }
}

process.stdout.write(`\n${JSON.stringify({ version: "kibi.proof-run.v1", results }, null, 2)}\n`);
if (results.some((result) => result.exitCode !== 0)) process.exitCode = 1;
