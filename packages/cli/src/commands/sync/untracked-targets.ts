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
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import {
  isUntrackedByGit,
  writePendingSourceReceipt,
} from "../../operations/mutation/source-authoring.js";
import { KB_PATHS, isSymbolsManifestPath } from "../../utils/kb-paths.js";

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
    const normalized = relative.replaceAll("\\", "/");
    const manifest = isSymbolsManifestPath(normalized);
    if (!normalized.endsWith(".md") && !manifest) continue;
    const absolute = path.resolve(workspaceRoot, normalized);
    if (!resolved.existsSync(absolute)) continue;
    const workspaceRelative = path
      .relative(workspaceRoot, absolute)
      .replaceAll("\\", "/");
    // A pending-source receipt makes an untracked file visible to sync, so
    // the file cannot be why an id is missing.
    if (existsSync(pendingReceiptFor(workspaceRoot, workspaceRelative)))
      continue;
    let content: string;
    try {
      content = resolved.readFileSync(absolute, "utf8");
    } catch {
      continue;
    }
    const ids = manifest ? manifestIds(content) : [frontmatterId(content)];
    for (const id of ids) {
      if (id !== null && remaining.has(id)) {
        matches.set(id, workspaceRelative);
        remaining.delete(id);
      }
    }
  }
  return matches;
}

/**
 * Give an upsert-only symbol manifest the pending-source receipt kb_upsert
 * writes since it learned to (`writeSourceForUpsert`).
 *
 * Older Kibi appended symbols to the untracked `.kb/symbols.yaml` that
 * `kibi init` creates without a receipt. The upsert wrote those symbols into
 * the store directly, but sync never saw the manifest, so the store recorded
 * no content hash for it and every source its symbols reference stayed
 * "newer" after a clone or checkout, however many times sync ran.
 *
 * The manifest is adopted only when Git does not track it, no receipt covers
 * it, and at least one symbol it declares is already in the compiled store
 * (`isStored`): Kibi wrote it. A hand-written untracked manifest whose
 * symbols the store never saw keeps the tracked-only boundary and sync's
 * "stage this file" note. Returns whether a receipt was written.
 */
// implements REQ-cli-status-pre-first-sync, REQ-core-persistence
export async function adoptUpsertOnlySymbolManifest(
  workspaceRoot: string,
  isStored: (ids: readonly string[]) => Promise<boolean>,
): Promise<boolean> {
  const relative = KB_PATHS.symbolsManifest;
  const absolute = path.resolve(workspaceRoot, relative);
  if (!existsSync(absolute)) return false;
  if (existsSync(pendingReceiptFor(workspaceRoot, relative))) return false;
  let bytes: Buffer;
  try {
    bytes = readFileSync(absolute);
  } catch {
    return false;
  }
  const ids = manifestIds(bytes.toString("utf8"));
  if (ids.length === 0) return false;
  if (!isUntrackedByGit(workspaceRoot, relative)) return false;
  if (!(await isStored(ids))) return false;
  writePendingSourceReceipt(
    workspaceRoot,
    relative,
    createHash("sha256").update(bytes).digest("hex"),
  );
  return true;
}

/** Where kb_upsert records the pending-source receipt of `relative`. */
function pendingReceiptFor(workspaceRoot: string, relative: string): string {
  return path.join(
    workspaceRoot,
    ".kb",
    "recovery",
    "pending-sources",
    `${createHash("sha256").update(relative).digest("hex")}.json`,
  );
}

/** Symbol ids declared by an untracked symbols manifest. */
function manifestIds(content: string): string[] {
  try {
    const parsed = parseYAML(content) as { symbols?: unknown } | null;
    const symbols = Array.isArray(parsed?.symbols) ? parsed.symbols : [];
    return symbols.flatMap((symbol) =>
      symbol !== null &&
      typeof symbol === "object" &&
      typeof (symbol as { id?: unknown }).id === "string"
        ? [(symbol as { id: string }).id]
        : [],
    );
  } catch {
    return [];
  }
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
