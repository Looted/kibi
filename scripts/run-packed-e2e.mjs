#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [compiledDirectoryInput, ...testFiles] = process.argv.slice(2);
if (compiledDirectoryInput === undefined || testFiles.length === 0) {
  throw new Error(
    "Usage: node scripts/run-packed-e2e.mjs <compiled-directory> <test-files...>",
  );
}
const compiledDirectory = path.resolve(compiledDirectoryInput);
const helpersPath = path.join(compiledDirectory, "helpers.js");
if (!existsSync(helpersPath)) {
  throw new Error(`Packed E2E helper is missing: ${helpersPath}`);
}

const helpers = await import(pathToFileURL(helpersPath).href);
// implements REQ-test-journaled-engine-harness
// Publish one immutable tarball set to every isolated test worker. Without
// this handoff, concurrent workers can rebuild the same package dist tree.
const tarballs = await helpers.packAll();
const tarballRoot = mkdtempSync(path.join(tmpdir(), "kibi-e2e-tarballs-"));
for (const [packageName, tarball] of Object.entries(tarballs)) {
  const packageRoot = path.join(tarballRoot, packageName);
  mkdirSync(packageRoot, { recursive: true });
  copyFileSync(tarball, path.join(packageRoot, path.basename(tarball)));
}
const prefix = await helpers.prepareSharedPackedInstallation();
let child;
try {
  // Prepare the packed installation before Node creates isolated test-file
  // workers so every worker inherits the same immutable consumer prefix.
  // implements REQ-test-journaled-engine-harness
  child = spawn(
    process.execPath,
    [
      "--test",
      // Keep packed files deterministic. The Node test runner's parallel file
      // transport can fail while deserializing large result messages even
      // after every named subtest passed; packed fixtures already isolate
      // their own sandboxes, so file-level parallelism adds no coverage.
      "--test-concurrency=1",
      ...testFiles.map((testFile) => path.resolve(testFile)),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        KIBI_E2E_PREFIX: prefix,
        KIBI_TEST_TARBALLS: tarballRoot,
        KIBI_ENGINE_IDLE_TIMEOUT_MS: "30000",
      },
      stdio: "inherit",
    },
  );
  const forwardSigint = () => child?.kill("SIGINT");
  const forwardSigterm = () => child?.kill("SIGTERM");
  process.once("SIGINT", forwardSigint);
  process.once("SIGTERM", forwardSigterm);
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      resolve(code ?? (signal === null ? 1 : 128)),
    );
  });
  process.off("SIGINT", forwardSigint);
  process.off("SIGTERM", forwardSigterm);
  process.exitCode = status;
} finally {
  helpers.cleanupSharedPackedInstallation();
  rmSync(tarballRoot, { recursive: true, force: true });
}
