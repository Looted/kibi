#!/usr/bin/env node
// Command-proof step runner for the repository self-proof integration.
// kibi prove spawns this with KIBI_PROOF_TEST_IDS and evaluates the aggregate
// exit code against each selected test's proof contract. The script reports
// what happened (step outcomes); Kibi evaluates proof.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const workspaceRoot = process.env.KIBI_PROOF_WORKSPACE ?? process.cwd();
const testIds = JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]");
const allSteps = JSON.parse(
  readFileSync(path.join(workspaceRoot, "proof", "steps.json"), "utf8"),
);

const selected = allSteps.filter((entry) => testIds.includes(entry.test_id));
if (selected.length === 0) {
  console.error(
    `run-proof-producer: no proof steps found for ${JSON.stringify(testIds)}`,
  );
  process.exit(1);
}

let failed = 0;
for (const entry of selected) {
  for (const [index, argv] of entry.steps.entries()) {
    const [command, ...args] = argv;
    const label = `${entry.test_id} step ${index + 1}: ${command} ${args.join(" ")}`;
    console.log(`[proof] ${label}`);
    const result = spawnSync(command, args, {
      cwd: workspaceRoot,
      env: process.env,
      stdio: "inherit",
      shell: false,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error !== undefined || result.status !== 0) {
      console.error(
        `[proof] FAILED ${label}${
          result.status === null ? "" : ` (exit ${result.status})`
        }`,
      );
      failed += 1;
    }
  }
}

if (failed > 0) {
  console.error(`[proof] ${failed} step(s) failed`);
  process.exit(1);
}
console.log(`[proof] all steps passed for ${selected.length} test(s)`);
process.exit(0);
