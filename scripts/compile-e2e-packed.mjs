#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COMPLETE_MARKER = ".kibi-packed-compile-complete";

// implements REQ-test-journaled-engine-harness
export function sanitizeCacheKey(value) {
  const key = String(value ?? "")
    .trim()
    .replaceAll(/[^A-Za-z0-9._-]/g, "_");
  return key.length > 0 ? key : null;
}

/** Hash the packed TypeScript inputs so a stale snapshot key cannot reuse JS. */
// implements REQ-test-journaled-engine-harness
export function hashPackedSources(repoRoot) {
  const packedRoot = path.join(repoRoot, "documentation/tests/e2e/packed");
  const hash = createHash("sha256");
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      if (name === "node_modules" || name === ".compiled" || name === "dist") {
        continue;
      }
      const entry = path.join(directory, name);
      const stat = statSync(entry);
      if (stat.isDirectory()) visit(entry);
      else if (name.endsWith(".ts") || name.endsWith(".json"))
        files.push(entry);
    }
  };
  visit(packedRoot);
  for (const file of files) {
    hash.update(path.relative(repoRoot, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex").slice(0, 16);
}

// implements REQ-test-journaled-engine-harness
export function packedCompileCacheArea(repoRoot, env, sourceHash) {
  const key = sanitizeCacheKey(env.KIBI_E2E_PACK_CACHE_KEY);
  if (!key || !sourceHash) return null;
  const root = path.resolve(
    repoRoot,
    env.KIBI_E2E_PACK_CACHE_ROOT?.trim() || os.tmpdir(),
  );
  const namespace = createHash("sha256")
    .update(path.resolve(repoRoot))
    .digest("hex")
    .slice(0, 12);
  return path.join(
    root,
    "kibi-e2e-compiled",
    namespace,
    `${key}-${sourceHash}`,
  );
}

// implements REQ-test-journaled-engine-harness
export function packedCompilationReady(directory) {
  return (
    existsSync(path.join(directory, "helpers.js")) &&
    existsSync(path.join(directory, COMPLETE_MARKER))
  );
}

function defaultRun(repoRoot) {
  return (command, args) =>
    new Promise((resolve, reject) => {
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

async function compileInto(directory, repoRoot, run) {
  const node = process.execPath;
  const tsc = path.resolve(repoRoot, "node_modules/typescript/bin/tsc");
  await run(node, [
    tsc,
    "-p",
    path.join(repoRoot, "documentation/tests/e2e/packed/tsconfig.e2e.json"),
    "--outDir",
    directory,
  ]);
  await run(node, [
    path.join(repoRoot, "scripts/stage-packed-brand-assets.mjs"),
    directory,
  ]);
  await writeFile(path.join(directory, COMPLETE_MARKER), "ok\n", "utf8");
}

/**
 * Return a compiled packed-test directory. A campaign cache key publishes one
 * directory per snapshot and source hash; later calls reuse it and do not
 * invoke tsc. Without a key, the directory is private to this call.
 */
// implements REQ-test-journaled-engine-harness
export async function preparePackedCompilation(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const env = options.env ?? process.env;
  const run = options.run ?? defaultRun(repoRoot);
  const sourceHash =
    options.sourceHash ??
    (sanitizeCacheKey(env.KIBI_E2E_PACK_CACHE_KEY)
      ? hashPackedSources(repoRoot)
      : null);
  const requestedOutput = env.KIBI_E2E_COMPILED_DIR?.trim();
  if (requestedOutput) {
    const directory = path.resolve(repoRoot, requestedOutput);
    const ready = packedCompilationReady(directory);
    if (!ready) await compileInto(directory, repoRoot, run);
    return { directory, ownsDirectory: false, reused: ready };
  }

  const area = packedCompileCacheArea(repoRoot, env, sourceHash);
  if (area && packedCompilationReady(area)) {
    return { directory: area, ownsDirectory: false, reused: true };
  }
  if (!area) {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "kibi-e2e-packed-compiled-"),
    );
    try {
      await compileInto(directory, repoRoot, run);
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
    return { directory, ownsDirectory: true, reused: false };
  }

  mkdirSync(path.dirname(area), { recursive: true });
  const scratch = await mkdtemp(`${area}.tmp-`);
  try {
    await compileInto(scratch, repoRoot, run);
    try {
      await rename(scratch, area);
    } catch {
      if (packedCompilationReady(area)) {
        await rm(scratch, { recursive: true, force: true });
        return { directory: area, ownsDirectory: false, reused: true };
      }
      return { directory: scratch, ownsDirectory: true, reused: false };
    }
    return { directory: area, ownsDirectory: false, reused: false };
  } catch (error) {
    await rm(scratch, { recursive: true, force: true });
    throw error;
  }
}

// implements REQ-test-journaled-engine-harness
export async function main() {
  const repoRoot = process.cwd();
  const prepared = await preparePackedCompilation({ repoRoot });
  console.log(`KIBI_E2E_COMPILED_DIR=${prepared.directory}`);
  if (process.env.GITHUB_ENV) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(
      process.env.GITHUB_ENV,
      `KIBI_E2E_COMPILED_DIR=${prepared.directory}\n`,
      "utf8",
    );
  }
  return prepared;
}

const invokedPath = process.argv[1];
if (
  invokedPath &&
  path.resolve(invokedPath) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
