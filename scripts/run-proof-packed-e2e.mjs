#!/usr/bin/env node

import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { preparePackedCompilation } from "./compile-e2e-packed.mjs";

const [testInput] = process.argv.slice(2);
if (testInput === undefined || process.argv.length !== 3) {
  throw new Error(
    "Usage: node scripts/run-proof-packed-e2e.mjs <packed-test-source>",
  );
}

const repoRoot = process.cwd();
// Packed tests resolve repo-root anchors (e.g. the frozen MCP contract
// fixtures) against this root; a sandbox helper may chdir the process.
process.env.KIBI_PROOF_REPO_ROOT = repoRoot;
const packedRoot = path.resolve(repoRoot, "documentation/tests/e2e/packed");
const testSource = path.resolve(repoRoot, testInput);
const relativeTestSource = path.relative(packedRoot, testSource);
if (
  relativeTestSource.startsWith(`..${path.sep}`) ||
  path.isAbsolute(relativeTestSource) ||
  !relativeTestSource.endsWith(".test.ts")
) {
  throw new Error(
    `Proof packed E2E test must be a .test.ts file under ${packedRoot}: ${testInput}`,
  );
}

const testName = path.basename(relativeTestSource).replace(/\.ts$/, ".js");
const node = process.execPath;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        KIBI_PROOF_PACKED: "1",
      },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${command} terminated by ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

const prepared = await preparePackedCompilation({ repoRoot });
try {
  process.exitCode = await run(node, [
    path.join(repoRoot, "scripts/run-packed-e2e.mjs"),
    prepared.directory,
    path.join(prepared.directory, testName),
  ]);
} finally {
  if (prepared.ownsDirectory) {
    await rm(prepared.directory, { recursive: true, force: true });
  }
}
