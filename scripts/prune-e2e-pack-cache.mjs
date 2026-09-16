#!/usr/bin/env node

/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Prune old shared pack cache areas (see
 * documentation/tests/e2e/packed/helpers.ts for the layout). Test processes
 * never delete cache areas because sibling runners may still be using them;
 * runners and developers call this utility instead.
 *
 * Usage: node scripts/prune-e2e-pack-cache.mjs [--keep <n>] [--root <dir>]
 * - --keep   areas to retain per repository namespace, newest first (default 3)
 * - --root   cache root; defaults to KIBI_E2E_PACK_CACHE_ROOT or the OS temp dir
 */

function parseArgs(argv) {
  let keep = 3;
  let root = null;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--keep") {
      keep = Number.parseInt(argv[++index] ?? "", 10);
      if (!Number.isInteger(keep) || keep < 0) {
        throw new Error(
          `--keep expects a non-negative integer, got ${argv[index]}`,
        );
      }
    } else if (arg === "--root") {
      root = argv[++index];
      if (!root) throw new Error("--root expects a directory");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { keep, root };
}

const { keep, root: rootArg } = parseArgs(process.argv.slice(2));
const cacheRoot =
  rootArg ?? process.env.KIBI_E2E_PACK_CACHE_ROOT?.trim() ?? tmpdir();
const namespacesPath = path.join(cacheRoot, "kibi-e2e-pack");

let namespaces = [];
try {
  namespaces = readdirSync(namespacesPath);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

let removed = 0;
let retained = 0;
for (const namespace of namespaces) {
  const namespacePath = path.join(namespacesPath, namespace);
  const entries = readdirSync(namespacePath)
    .map((name) => {
      const entryPath = path.join(namespacePath, name);
      try {
        return { name, path: entryPath, mtimeMs: statSync(entryPath).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const [index, entry] of entries.entries()) {
    // Staging trees (".tmp-*") belong to a live or crashed publisher; drop
    // only the ones older than an hour so an in-flight population survives.
    const isStaging = entry.name.includes(".tmp-");
    if (isStaging && Date.now() - entry.mtimeMs < 3_600_000) continue;
    if (index < keep && !isStaging) {
      retained++;
      continue;
    }
    rmSync(entry.path, { recursive: true, force: true });
    removed++;
  }
}

process.stdout.write(
  `${JSON.stringify({ cacheRoot: namespacesPath, removed, retained })}\n`,
);
