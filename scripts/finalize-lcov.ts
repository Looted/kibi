#!/usr/bin/env bun
/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { existsSync, renameSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

function newestTemporaryLcovFile(
  coverageDir: string,
  entries: readonly string[],
): string | null {
  return (
    entries
      .filter(
        (entry) => entry.startsWith(".lcov.info.") && entry.endsWith(".tmp"),
      )
      .map((entry) => ({
        path: join(coverageDir, entry),
        modifiedMs: statSync(join(coverageDir, entry)).mtimeMs,
      }))
      .sort((left, right) => right.modifiedMs - left.modifiedMs)[0]?.path ??
    null
  );
}

// implements REQ-014
export async function finalizeLcov(coverageDir: string): Promise<string> {
  const lcovPath = join(coverageDir, "lcov.info");
  if (existsSync(lcovPath)) return lcovPath;

  const temporaryPath = newestTemporaryLcovFile(
    coverageDir,
    await readdir(coverageDir),
  );
  if (temporaryPath === null) {
    throw new Error(
      `No lcov.info or temporary LCOV file found in ${coverageDir}`,
    );
  }

  renameSync(temporaryPath, lcovPath);
  return lcovPath;
}

export async function finalizeLcovIfMain(
  isMain = import.meta.main,
  argv: readonly string[] = process.argv,
): Promise<void> {
  if (!isMain) return;
  await finalizeLcov(argv[2] ?? "coverage/unit");
}

await finalizeLcovIfMain();
