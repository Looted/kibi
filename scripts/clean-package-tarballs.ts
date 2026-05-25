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

/**
 * clean-package-tarballs.ts
 *
 * Removes stale tarball artifacts from package directories to prevent accidental
 * selection of outdated packages during packing or publishing.
 *
 * Usage:
 *   bun run scripts/clean-package-tarballs.ts          # delete tarballs
 *   bun run scripts/clean-package-tarballs.ts --dry-run # list without deleting
 *
 * The script preserves tarballs under `documentation/tests/e2e/packed/fixtures/`.
 */

import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname;

/** Directories to scan for stale tarballs (repo-relative). */
const PACKAGE_DIRS = [
  "packages/core",
  "packages/cli",
  "packages/mcp",
  "packages/opencode",
];

/** Globally ignored paths (repo-relative prefixes). */
const IGNORED_PREFIXES = ["documentation/tests/e2e/packed/fixtures"];

function isDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

function findTarballs(root: string): string[] {
  const results: string[] = [];

  for (const dir of PACKAGE_DIRS) {
    const absDir = join(root, dir);
    if (!existsSync(absDir)) continue;

    const entries = readdirSync(absDir);
    for (const entry of entries) {
      if (!entry.endsWith(".tgz")) continue;
      const absPath = join(absDir, entry);
      const relPath = relative(root, absPath);

      // Skip ignored paths
      if (IGNORED_PREFIXES.some((prefix) => relPath.startsWith(prefix)))
        continue;

      results.push(absPath);
    }
  }

  return results;
}

function main(): void {
  const root = REPO_ROOT;
  const dryRun = isDryRun(process.argv.slice(2));
  const tarballs = findTarballs(root);

  if (tarballs.length === 0) {
    console.log("No stale tarballs found.");
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Would delete ${tarballs.length} tarball(s):`);
    for (const tarball of tarballs) {
      console.log(`  ${relative(root, tarball)}`);
    }
    return;
  }

  for (const tarball of tarballs) {
    unlinkSync(tarball);
    console.log(`Deleted: ${relative(root, tarball)}`);
  }

  console.log(`Removed ${tarballs.length} stale tarball(s).`);
}

if (
  import.meta.url === process.argv[1] ||
  import.meta.url === `file://${process.argv[1]}`
) {
  main();
}

export { findTarballs, isDryRun, main };
