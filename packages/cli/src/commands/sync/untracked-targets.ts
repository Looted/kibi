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

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

interface UntrackedTargetsDeps {
  execFileSync: (
    file: string,
    args: readonly string[],
    options: { encoding: "utf8"; maxBuffer: number; stdio: "pipe" },
  ) => string;
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: "utf8") => string;
}

const defaultDeps: UntrackedTargetsDeps = {
  execFileSync: (file, args, options) => execFileSync(file, args, options),
  existsSync,
  readFileSync,
};

/**
 * Match missing relationship-target ids against untracked `.kb` documents.
 *
 * Sync discovery intentionally enumerates only git-tracked (or
 * pending-receipt) documents, so a freshly authored but unstaged `.kb` doc is
 * invisible to sync while relationships that reference it fail with a
 * misleading "Target entity does not exist". This helper powers the sync
 * warning that tells the author to stage the document instead.
 *
 * Best effort by design: any git or filesystem failure yields no matches so
 * the diagnostic can never break a sync run.
 */
// implements REQ-core-persistence
export function findUntrackedDocumentMatches(
  workspaceRoot: string,
  missingIds: readonly string[],
  deps: Partial<UntrackedTargetsDeps> = {},
): Map<string, string> {
  const resolved = { ...defaultDeps, ...deps };
  const matches = new Map<string, string>();
  if (missingIds.length === 0) return matches;
  let untracked: string[];
  try {
    const output = resolved.execFileSync(
      "git",
      [
        "-C",
        workspaceRoot,
        "ls-files",
        "--others",
        "--exclude-standard",
        "-z",
        "--",
        ".kb",
      ],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: "pipe" },
    );
    untracked = output.split("\0").filter(Boolean);
  } catch {
    return matches;
  }
  const remaining = new Set(missingIds);
  for (const relative of untracked) {
    if (remaining.size === 0) break;
    if (!relative.endsWith(".md")) continue;
    const absolute = path.resolve(
      workspaceRoot,
      relative.replaceAll("\\", "/"),
    );
    if (!resolved.existsSync(absolute)) continue;
    let content: string;
    try {
      content = resolved.readFileSync(absolute, "utf8");
    } catch {
      continue;
    }
    const id = frontmatterId(content);
    if (id !== null && remaining.has(id)) {
      const workspaceRelative = path
        .relative(workspaceRoot, absolute)
        .replaceAll("\\", "/");
      matches.set(id, workspaceRelative);
      remaining.delete(id);
    }
  }
  return matches;
}

/**
 * Extract `id:` from a markdown document's YAML frontmatter (the first
 * `---` block). Documents whose id never appears in the frontmatter region
 * are not entity candidates.
 */
function frontmatterId(content: string): string | null {
  const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length && index < 64; index++) {
    const line = lines[index] ?? "";
    if (line.trim() === "---") return null;
    const match = line.match(/^id:\s*(?:"([^"]+)"|'([^']+)'|(\S+))/);
    if (match) {
      const id = (match[1] ?? match[2] ?? match[3])?.trim();
      return id && id.length > 0 ? id : null;
    }
  }
  return null;
}
