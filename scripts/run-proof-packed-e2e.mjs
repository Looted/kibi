#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const [testInput] = process.argv.slice(2);
if (testInput === undefined || process.argv.length !== 3) {
  throw new Error(
    "Usage: node scripts/run-proof-packed-e2e.mjs <packed-test-source>",
  );
}

const repoRoot = process.cwd();
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
const compiledDirectory = await mkdtemp(
  path.join(os.tmpdir(), "kibi-proof-packed-compiled-"),
);
const node = process.execPath;
const tsc = path.resolve(repoRoot, "node_modules/typescript/bin/tsc");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
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

try {
  const compileExitCode = await run(node, [
    tsc,
    "-p",
    path.join(repoRoot, "documentation/tests/e2e/packed/tsconfig.e2e.json"),
    "--outDir",
    compiledDirectory,
  ]);
  if (compileExitCode !== 0) process.exitCode = compileExitCode;
  else {
    const stageExitCode = await run(node, [
      path.join(repoRoot, "scripts/stage-packed-brand-assets.mjs"),
      compiledDirectory,
    ]);
    if (stageExitCode !== 0) process.exitCode = stageExitCode;
    else {
      process.exitCode = await run(node, [
        path.join(repoRoot, "scripts/run-packed-e2e.mjs"),
        compiledDirectory,
        path.join(compiledDirectory, testName),
      ]);
    }
  }
} finally {
  await rm(compiledDirectory, { recursive: true, force: true });
}
