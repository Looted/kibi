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

import * as path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { promisify } from "node:util";
import fg from "fast-glob";
import { getRelationshipsDir } from "../../extractors/relationships.js";
import type { KbConfigPaths } from "../../utils/config.js";

const MARKDOWN_DISCOVERY_IGNORE = ["**/README.md"] as const;
const execFileAsync = promisify(execFile);

type DiscoveryOptions = Readonly<{ trackedOnly?: boolean }>;

async function gitTrackedPaths(cwd: string): Promise<Set<string>> {
  const result = await execFileAsync(
    "git",
    ["-C", cwd, "ls-files", "--cached", "-z", "--"],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
  );
  return new Set(
    result.stdout
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((value) => value.replaceAll("\\", "/")),
  );
}

function pendingSourcePaths(cwd: string): Map<string, string> {
  const root = path.join(cwd, ".kb", "recovery", "pending-sources");
  if (!existsSync(root)) return new Map();
  const paths = new Map<string, string>();
  for (const name of readdirSync(root)) {
    if (!name.endsWith(".json")) continue;
    try {
      const receipt = JSON.parse(
        readFileSync(path.join(root, name), "utf8"),
      ) as { path?: unknown; afterHash?: unknown };
      if (
        typeof receipt.path === "string" &&
        receipt.path.length > 0 &&
        typeof receipt.afterHash === "string" &&
        /^[a-f0-9]{64}$/i.test(receipt.afterHash)
      ) {
        const relative = receipt.path.replaceAll("\\", "/");
        const absolute = path.resolve(cwd, relative);
        if (!absolute.startsWith(`${path.resolve(cwd)}${path.sep}`)) {
          throw new Error(`Pending source receipt escapes workspace: ${relative}`);
        }
        if (!existsSync(absolute)) {
          throw new Error(`Pending source is missing: ${relative}`);
        }
        const actual = createHash("sha256")
          .update(readFileSync(absolute))
          .digest("hex");
        if (actual !== receipt.afterHash) {
          throw new Error(
            `Pending source hash drift blocks sync for ${relative}; expected ${receipt.afterHash}, found ${actual}`,
          );
        }
        paths.set(relative, receipt.afterHash);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (/Pending source/.test(error.message) ||
          /Pending source receipt/.test(error.message))
      ) {
        throw error;
      }
      // Malformed receipts are ignored; an operator can remove or repair the
      // receipt through the normal recovery operation.
    }
  }
  return paths;
}

function filterTracked(
  cwd: string,
  files: readonly string[],
  tracked: ReadonlySet<string>,
  pending: ReadonlySet<string>,
): string[] {
  const retained: string[] = [];
  for (const file of files) {
    const relative = path.relative(cwd, file).replaceAll(path.sep, "/");
    if (tracked.has(relative)) {
      retained.push(file);
      continue;
    }
    if (pending.has(relative)) {
      retained.push(file);
    }
  }
  return retained;
}

export function normalizeMarkdownPath(
  pattern: string | undefined,
): string | null {
  if (!pattern) return null;
  if (pattern.includes("*")) return pattern;
  return `${pattern}/**/*.md`;
}

export async function discoverSourceFiles(
  cwd: string,
  paths: KbConfigPaths,
  options: DiscoveryOptions = {},
): Promise<{
  markdownFiles: string[];
  manifestFiles: string[];
  relationshipsDir: string;
}> {
  const markdownPatterns = [
    normalizeMarkdownPath(paths.requirements),
    normalizeMarkdownPath(paths.scenarios),
    normalizeMarkdownPath(paths.tests),
    normalizeMarkdownPath(paths.adr),
    normalizeMarkdownPath(paths.flags),
    normalizeMarkdownPath(paths.events),
    normalizeMarkdownPath(paths.facts),
  ].filter((p): p is string => Boolean(p));

  const markdownFiles = await fg(markdownPatterns, {
    cwd,
    absolute: true,
    ignore: [...MARKDOWN_DISCOVERY_IGNORE],
  });
  let entityMarkdownFiles = markdownFiles.filter(
    (file) => !file.endsWith("/README.md"),
  );

  let manifestFiles = paths.symbols
    ? await fg(paths.symbols, {
        cwd,
        absolute: true,
      })
    : [];

  if (options.trackedOnly) {
    const tracked = await gitTrackedPaths(cwd);
    const pending = pendingSourcePaths(cwd);
    entityMarkdownFiles = filterTracked(
      cwd,
      entityMarkdownFiles,
      tracked,
      new Set(pending.keys()),
    );
    manifestFiles = filterTracked(cwd, manifestFiles, tracked, new Set(pending.keys()));
    // A pending receipt is consumed as soon as Git tracks its file. This is
    // deliberately best-effort metadata; the source hash remains authoritative.
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    if (existsSync(pendingRoot)) {
      for (const name of readdirSync(pendingRoot)) {
        if (!name.endsWith(".json")) continue;
        try {
          const receipt = JSON.parse(
            readFileSync(path.join(pendingRoot, name), "utf8"),
          ) as { path?: unknown };
          if (
            typeof receipt.path === "string" &&
            tracked.has(receipt.path.replaceAll("\\", "/"))
          ) {
            unlinkSync(path.join(pendingRoot, name));
          }
        } catch {
          // Leave malformed receipts for explicit recovery diagnostics.
        }
      }
    }
  }

  const relationshipsDir = getRelationshipsDir(path.join(cwd, ".kb"));

  return {
    markdownFiles: entityMarkdownFiles,
    manifestFiles,
    relationshipsDir,
  };
}
