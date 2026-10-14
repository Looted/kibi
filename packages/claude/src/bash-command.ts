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

// Simple commands of a command line: `;`, `&&`, `||`, `|` and newlines end one.
const SIMPLE_COMMAND_SEPARATOR = /&&|\|\||[;|\n]/g;
// `> file`, `>> file` (not `2>&1`, `&>`, `>&2` or a here-document marker).
const REDIRECT_TARGET = /(?:^|[^0-9&<>])>>?\s*("[^"]+"|'[^']+'|[^\s;&|<>()]+)/g;
// sed and perl edit in place with -i (alone, bundled as -pi or -ni, or with a
// backup suffix as -i.bak) or sed's --in-place.
const IN_PLACE_FLAG = /^(-[A-Za-z]*i\S*|--in-place(=\S*)?)$/;
const IN_PLACE_EDITORS = new Set(["sed", "gsed", "perl"]);
// Words that run the next word as the command.
const COMMAND_PREFIXES = new Set(["sudo", "env", "command", "exec", "nice"]);

/**
 * The command with every quoted or backslash-escaped character replaced by
 * `_`, keeping its length. A `|` or `;` inside `sed -i 's|a|b|'` is part of
 * the script, not a pipe, so separators are looked for in this copy and the
 * words are then cut from the original at the same positions.
 */
function maskQuoted(command: string): string {
  let masked = "";
  let quote: string | null = null;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] ?? "";
    if (quote === null && (char === "'" || char === '"')) {
      quote = char;
      masked += "_";
    } else if (char === "\\" && quote !== "'" && index + 1 < command.length) {
      masked += "__";
      index += 1;
    } else if (quote !== null) {
      if (char === quote) quote = null;
      masked += "_";
    } else masked += char;
  }
  return masked;
}

/** The words of each simple command, quotes kept, in order. */
function simpleCommandWords(command: string, masked: string): string[][] {
  const commands: string[][] = [];
  let start = 0;
  const cut = (end: number) => {
    const words: string[] = [];
    for (const word of masked.slice(start, end).matchAll(/\S+/g)) {
      const from = start + (word.index ?? 0);
      words.push(command.slice(from, from + word[0].length));
    }
    commands.push(words);
  };
  for (const separator of masked.matchAll(SIMPLE_COMMAND_SEPARATOR)) {
    cut(separator.index ?? 0);
    start = (separator.index ?? 0) + separator[0].length;
  }
  cut(masked.length);
  return commands;
}

/**
 * Absolute paths of existing files a command will write in place before it
 * runs: the files of `sed -i` / `perl -i`, the targets of `>` and `>>`
 * redirections, and the files `tee` writes. A subset of
 * {@link commandFilePaths}, so the hook can treat them as edits up front
 * (what must stay true) instead of reads. Quoted text (a sed script, an
 * echoed string) is never read as a separator or a redirection.
 */
// implements REQ-claude-code-kibi-plugin-v1
export function commandEditPaths(command: string, cwd: string): string[] {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const masked = maskQuoted(scanned);
  const targets: string[] = [];
  for (const match of masked.matchAll(REDIRECT_TARGET)) {
    const end = (match.index ?? 0) + match[0].length;
    targets.push(unquote(scanned.slice(end - (match[1] ?? "").length, end)));
  }
  for (const words of simpleCommandWords(scanned, masked)) {
    let start = 0;
    while (
      start < words.length &&
      (COMMAND_PREFIXES.has(words[start] ?? "") ||
        /^\w+=/.test(words[start] ?? ""))
    )
      start += 1;
    const name = path.basename(words[start] ?? "");
    const args = words.slice(start + 1);
    if (IN_PLACE_EDITORS.has(name) && args.some((a) => IN_PLACE_FLAG.test(a)))
      targets.push(...args.filter((arg) => !arg.startsWith("-")));
    else if (name === "tee")
      targets.push(...args.filter((arg) => !arg.startsWith("-")));
  }
  if (targets.length === 0) return [];
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const wanted = new Set<string>();
  for (const target of targets) {
    const name = unquote(target);
    if (!name) continue;
    for (const base of path.isAbsolute(name) ? [""] : bases)
      wanted.add(path.resolve(base, name));
  }
  return commandFilePaths(scanned, cwd).filter((absolute) =>
    wanted.has(absolute),
  );
}
