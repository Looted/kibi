#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const requestedOutput = process.env.KIBI_E2E_COMPILED_DIR?.trim();
const compiledDirectory = requestedOutput
  ? path.resolve(repoRoot, requestedOutput)
  : await mkdtemp(path.join(os.tmpdir(), "kibi-e2e-packed-compiled-"));
const ownsOutput = !requestedOutput;
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
  console.log(`KIBI_E2E_COMPILED_DIR=${compiledDirectory}`);
  // GitHub workflow callers can consume a generated path without assuming a
  // shared /tmp directory. Local callers simply use the printed path.
  if (process.env.GITHUB_ENV) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(
      process.env.GITHUB_ENV,
      `KIBI_E2E_COMPILED_DIR=${compiledDirectory}\n`,
      "utf8",
    );
  }
} catch (error) {
  if (ownsOutput) await rm(compiledDirectory, { recursive: true, force: true });
  throw error;
}
