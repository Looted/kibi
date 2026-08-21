#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const compiledDirectory = await mkdtemp(
  path.join(os.tmpdir(), "kibi-e2e-packed-compiled-"),
);
const node = process.execPath;
const tsc = path.resolve(repoRoot, "node_modules/typescript/bin/tsc");

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${command} terminated by ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`${command} exited with code ${code ?? 1}`));
        return;
      }
      resolve();
    });
  });
}

try {
  await run(node, [
    tsc,
    "-p",
    path.join(repoRoot, "documentation/tests/e2e/packed/tsconfig.e2e.json"),
    "--outDir",
    compiledDirectory,
  ]);
  await run(node, [
    path.join(repoRoot, "scripts/stage-packed-brand-assets.mjs"),
    compiledDirectory,
  ]);
  await run(node, [
    tsc,
    "-p",
    path.join(repoRoot, "documentation/tests/e2e/tsconfig.local.json"),
    "--outDir",
    compiledDirectory,
  ]);

  const testFiles = (await readdir(compiledDirectory))
    .filter((file) => file.endsWith(".test.js"))
    .sort()
    .map((file) => path.join(compiledDirectory, file));
  if (testFiles.length === 0) {
    throw new Error(`No compiled E2E test files found in ${compiledDirectory}`);
  }

  await run(
    node,
    [
      path.join(repoRoot, "scripts/run-packed-e2e.mjs"),
      compiledDirectory,
      ...testFiles,
    ],
    { ...process.env, NODE_OPTIONS: "--enable-source-maps" },
  );
} finally {
  await rm(compiledDirectory, { recursive: true, force: true });
}
