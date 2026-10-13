// implements REQ-claude-code-kibi-plugin-v1
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * What a Bash call touches in the workspace.
 *
 * Agents often read with `cat`/`sed -n`/`grep` and write with `sed -i`, a
 * heredoc or a short script instead of the Read and Edit tools, which bypasses
 * the file hooks. These helpers recover the workspace files a command names
 * (before it runs) and the files it changed (after it runs), so the same
 * snippets and edit tracking apply.
 */

/** Longest command scanned for paths; longer ones are scanned up to here. */
const MAX_COMMAND_CHARS = 20_000;
/** Most path candidates taken from one command. */
const MAX_CANDIDATES = 200;
/** Allowed lag between a command start and a file mtime it caused. */
const MTIME_TOLERANCE_MS = 1_000;

const TOKEN_SEPARATOR = /[\s;|&<>()'"`,=[\]{}]+/;
const PATH_LIKE =
  /^[\w@.~/+-]*[\w-]\.[A-Za-z0-9]{1,8}$|^[\w@.~+-]*\/[\w@.~/+-]*$/;
const SEARCH_COMMAND =
  /(^|[\s;|&(])(grep|egrep|rg|ag|ack|find|fd|git\s+(grep|ls-files))(\s|$)/;
const CD_TARGET = /(?:^|[\s;&|(])cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g;

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

/** Directories a command `cd`s into, absolute, in order. */
function cdTargets(command: string, cwd: string): string[] {
  const targets: string[] = [];
  let base = cwd;
  for (const match of command.matchAll(CD_TARGET)) {
    const target = unquote(match[1] ?? "");
    if (!target || target === "-") continue;
    base = path.resolve(base, target);
    targets.push(base);
  }
  return targets;
}

/**
 * Absolute paths of existing files a command names, relative names resolved
 * against the call's cwd and any directory the command `cd`s into.
 */
export function commandFilePaths(command: string, cwd: string): string[] {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const found = new Set<string>();
  let candidates = 0;
  for (const token of scanned.split(TOKEN_SEPARATOR)) {
    if (!PATH_LIKE.test(token) || token.startsWith("-")) continue;
    if (++candidates > MAX_CANDIDATES) break;
    for (const base of path.isAbsolute(token) ? [""] : bases) {
      const absolute = path.resolve(base, token);
      try {
        if (fs.statSync(absolute).isFile()) {
          found.add(absolute);
          break;
        }
      } catch {
        // Not a file from this base; try the next one.
      }
    }
  }
  return [...found];
}

/** True for a command that searches the tree (grep, rg, find, git grep). */
export function isSearchCommand(command: string): boolean {
  return SEARCH_COMMAND.test(command.slice(0, MAX_COMMAND_CHARS));
}

/**
 * Workspace-relative files git reports as modified or new (untracked, not
 * ignored) whose modification time is not older than `sinceMs`, so files left
 * dirty before the command are not attributed to it. Empty outside a git work
 * tree or when git fails.
 */
export function filesChangedSince(root: string, sinceMs: number): string[] {
  // ls-files prints paths relative to its cwd, so a workspace below the
  // repository root gets workspace-relative paths and only its own files.
  const listed = spawnSync(
    "git",
    ["ls-files", "--modified", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", timeout: 3_000 },
  );
  if (listed.status !== 0 || typeof listed.stdout !== "string") return [];
  const changed = new Set<string>();
  for (const relative of listed.stdout.split("\0")) {
    if (relative.length === 0) continue;
    try {
      const { mtimeMs } = fs.statSync(path.join(root, relative));
      if (mtimeMs >= sinceMs - MTIME_TOLERANCE_MS) changed.add(relative);
    } catch {
      // Deleted, or removed since git looked.
    }
  }
  return [...changed];
}
