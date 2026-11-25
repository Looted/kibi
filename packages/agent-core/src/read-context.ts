import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { type ShellGrep, type ShellRead, readText } from "./bash-command.js";
import type { IndexedSymbol } from "./knowledge-index.js";
import {
  type LineRange,
  type Summarize,
  claimSnippetSlot,
  describeEntity,
  focusedSymbols,
  implementedRequirementIds,
  isRetiredStatus,
} from "./snippets.js";

/**
 * Requirement rows for the code an agent reads or searches, shared by every
 * host adapter.
 *
 * A read hook names the requirements implemented by the symbols in view:
 * the lines read, the lines a search matches, or a whole file that
 * implements few requirements. Each requirement is one compact row, shown
 * at most once per session, within a small per-event and per-session
 * budget, so reading and searching never flood the context. Hooks never
 * search the store by text: only requirements linked to the code in view
 * are named.
 */

/** Rows per event when lines are in view. */
export const MAX_ROWS_PER_EVENT = 3;
/** Rows for a whole file read that implements few requirements. */
export const MAX_WHOLE_FILE_ROWS = 5;
/** Characters per event, and for the whole-file case. */
export const MAX_EVENT_CHARS = 700;
export const MAX_WHOLE_FILE_EVENT_CHARS = 1100;
/** Rows and characters the read and search hooks add per session. */
export const MAX_SESSION_ROWS = 10;
export const MAX_SESSION_CHARS = 2300;
/** A search names nothing when more requirements than this qualify. */
export const MAX_SEARCH_REQUIREMENTS = 6;
/** Files a recursive search is matched over, and their largest size. */
const MAX_SEARCH_FILES = 300;
const MAX_SEARCH_FILE_BYTES = 1024 * 1024;
const MAX_TITLE_SYMBOL = 60;
/** Characters of the one-line id list for a busy whole file. */
const MAX_BUSY_LINE = 600;

const HEADER = "Kibi requirements for the code in view:";
const HINT = `kb_query({id:"<id>", includeBody:true}) gives a requirement's full text and why it exists.`;

/** One file as an agent sees it in a read or search. */
export type ReadView = {
  relativePath: string;
  symbols: readonly IndexedSymbol[];
  /** Lines in view; absent for a whole-file read. */
  focus?: readonly LineRange[] | undefined;
  /** Lines a search matched; present only for a search. */
  matches?: readonly number[] | undefined;
};

export type ReadContextInput = {
  views: readonly ReadView[];
  summarize: Summarize;
  /** Where the once-per-session markers and budget live. */
  stateDir: string | undefined;
  /**
   * Session key the markers are scoped to. A host whose context can be
   * cleared mid-session passes a key that changes with each reset.
   */
  sessionKey: string | undefined;
  /** Requirement ids a Kibi tool result already showed this session. */
  alreadyShown?: ReadonlySet<string> | undefined;
};

export type ReadContext = {
  text: string;
  /** Requirement ids the text names. */
  ids: string[];
  /** Workspace-relative files the text describes. */
  paths: string[];
};

type Candidate = {
  id: string;
  symbol: string;
  relativePath: string;
  /** A firm requirement of a symbol in view. */
  firmFocus: boolean;
};

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function isCurrent(summarize: Summarize, id: string): boolean {
  const summary = summarize(id);
  return !isRetiredStatus(summary.status) && summary.supersededBy === undefined;
}

function isFirm(summarize: Summarize, id: string): boolean {
  return summarize(id).firmness === "firm";
}

/** Symbols that hold at least one of the lines, with how many they hold. */
function matchedSymbols(
  symbols: readonly IndexedSymbol[],
  lines: readonly number[],
): Array<{ symbol: IndexedSymbol; count: number }> {
  return focusedSymbols(
    symbols,
    lines.map((line) => ({ start: line, end: line })),
  )
    .map((symbol) => ({
      symbol,
      count: lines.filter(
        (line) =>
          line >= Number(symbol.line) &&
          line <= Number(symbol.endLine ?? symbol.line),
      ).length,
    }))
    .sort((left, right) => right.count - left.count);
}

/**
 * Requirements of the symbols in view, best first: a search's requirements
 * by matching lines, a read's by its innermost symbol, firm before others.
 */
function rankedCandidates(view: ReadView, summarize: Summarize): Candidate[] {
  const ordered: Array<{ symbol: IndexedSymbol; weight: number }> =
    view.matches !== undefined
      ? matchedSymbols(view.symbols, view.matches).map(({ symbol, count }) => ({
          symbol,
          weight: count,
        }))
      : focusedSymbols(view.symbols, view.focus).map((symbol, index) => ({
          symbol,
          weight: -index,
        }));
  const best = new Map<string, Candidate & { weight: number }>();
  for (const { symbol, weight } of ordered) {
    for (const id of symbol.implements) {
      if (!isCurrent(summarize, id)) continue;
      // Symbols come best first, so the first one to name a requirement wins.
      if (best.has(id)) continue;
      best.set(id, {
        id,
        symbol: symbol.title,
        relativePath: view.relativePath,
        firmFocus: isFirm(summarize, id),
        weight,
      });
    }
  }
  return [...best.values()]
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        Number(right.firmFocus) - Number(left.firmFocus) ||
        left.id.localeCompare(right.id),
    )
    .map(({ weight: _weight, ...candidate }) => candidate);
}

/** Every current requirement of a whole file, most symbols first. */
function wholeFileCandidates(
  view: ReadView,
  summarize: Summarize,
): Candidate[] {
  const symbolsOf = new Map<string, string[]>();
  for (const symbol of view.symbols)
    for (const id of symbol.implements) {
      if (!isCurrent(summarize, id)) continue;
      symbolsOf.set(id, [...(symbolsOf.get(id) ?? []), symbol.title]);
    }
  return [...symbolsOf.entries()]
    .sort(
      ([leftId, left], [rightId, right]) =>
        right.length - left.length ||
        Number(isFirm(summarize, rightId)) -
          Number(isFirm(summarize, leftId)) ||
        leftId.localeCompare(rightId),
    )
    .map(([id, symbols]) => ({
      id,
      symbol: symbols[0] as string,
      relativePath: view.relativePath,
      firmFocus: false,
    }));
}

type Ledger = { rows: number; chars: number };

function ledgerFile(stateDir: string, sessionKey: string | undefined): string {
  const key = createHash("sha256")
    .update(String(sessionKey))
    .digest("hex")
    .slice(0, 32);
  return path.join(stateDir, "read-rows", `${key}.jsonl`);
}

/** Rows and characters the read and search hooks added this session. */
function readLedger(
  stateDir: string | undefined,
  sessionKey: string | undefined,
): Ledger {
  const total: Ledger = { rows: 0, chars: 0 };
  if (!stateDir) return total;
  let text: string;
  try {
    text = fs.readFileSync(ledgerFile(stateDir, sessionKey), "utf8");
  } catch {
    return total;
  }
  for (const line of text.split("\n")) {
    try {
      const entry = JSON.parse(line) as Partial<Ledger>;
      total.rows += Number(entry.rows) || 0;
      total.chars += Number(entry.chars) || 0;
    } catch {
      // A torn or empty line counts nothing.
    }
  }
  return total;
}

function appendLedger(
  stateDir: string | undefined,
  sessionKey: string | undefined,
  entry: Ledger,
): void {
  if (!stateDir) return;
  const file = ledgerFile(stateDir, sessionKey);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`);
  } catch {
    // An unwritable state directory only loses the session budget.
  }
}

function slotKey(sessionKey: string | undefined, ...parts: string[]): string {
  return [String(sessionKey), "read-row", ...parts].join("\u0000");
}

/** True when the slot was claimed before, without claiming it. */
function slotTaken(stateDir: string | undefined, key: string): boolean {
  if (!stateDir) return false;
  const marker = path.join(
    stateDir,
    "shown-snippets",
    createHash("sha256").update(key).digest("hex").slice(0, 32),
  );
  return fs.existsSync(marker);
}

function rowText(
  candidate: Candidate,
  summarize: Summarize,
  withPath: boolean,
): string {
  const where = withPath
    ? `${truncate(candidate.symbol, MAX_TITLE_SYMBOL)} (${candidate.relativePath})`
    : truncate(candidate.symbol, MAX_TITLE_SYMBOL);
  return `- ${describeEntity(summarize(candidate.id))} — ${where}`;
}

function busyLine(view: ReadView, ids: readonly string[]): string {
  const line = `- ${view.relativePath} implements ${ids.length} requirements: ${ids.join(", ")}; reading a line range narrows them to the code in view.`;
  return truncate(line, MAX_BUSY_LINE);
}

/**
 * Rows for the code a read or search puts in view, or undefined when there
 * is nothing new to say: no symbol in view implements a current
 * requirement, all of them were already shown this session, a search
 * qualifies more than {@link MAX_SEARCH_REQUIREMENTS} requirements, or the
 * session budget is spent.
 *
 * A search (views with `matches`) is judged as a whole, across its files.
 * A whole-file read lists every requirement of a file that implements at
 * most {@link MAX_WHOLE_FILE_ROWS}, and names the ids of a busier one on a
 * single line. A firm requirement of a symbol in view is shown once even
 * when a Kibi tool result already listed it.
 */
export function readContext(input: ReadContextInput): ReadContext | undefined {
  const { summarize, stateDir, sessionKey } = input;
  const alreadyShown = input.alreadyShown ?? new Set<string>();
  const ledger = readLedger(stateDir, sessionKey);
  if (ledger.rows >= MAX_SESSION_ROWS || ledger.chars >= MAX_SESSION_CHARS)
    return undefined;

  const search = input.views.filter((view) => view.matches !== undefined);
  const reads = input.views.filter((view) => view.matches === undefined);
  const candidates: Candidate[] = [];
  const busy: Array<{ view: ReadView; ids: string[] }> = [];
  let wholeFile = false;

  if (search.length > 0) {
    const ranked = search
      .flatMap((view) =>
        rankedCandidates(view, summarize).map((candidate, rank) => ({
          candidate,
          count:
            matchedSymbols(view.symbols, view.matches ?? []).find((entry) =>
              entry.symbol.implements.includes(candidate.id),
            )?.count ?? 0,
          rank,
        })),
      )
      .sort(
        (left, right) => right.count - left.count || left.rank - right.rank,
      );
    const distinct = new Set(ranked.map((entry) => entry.candidate.id));
    if (distinct.size <= MAX_SEARCH_REQUIREMENTS)
      candidates.push(...ranked.map((entry) => entry.candidate));
  }
  for (const view of reads) {
    if (view.focus !== undefined) {
      candidates.push(...rankedCandidates(view, summarize));
      continue;
    }
    const all = wholeFileCandidates(view, summarize);
    if (all.length <= MAX_WHOLE_FILE_ROWS) {
      wholeFile = wholeFile || all.length > 0;
      candidates.push(...all);
    } else busy.push({ view, ids: all.map((candidate) => candidate.id) });
  }

  const perEvent =
    wholeFile && search.length === 0 && !reads.some((view) => view.focus)
      ? MAX_WHOLE_FILE_ROWS
      : MAX_ROWS_PER_EVENT;
  const eventChars =
    perEvent === MAX_WHOLE_FILE_ROWS
      ? MAX_WHOLE_FILE_EVENT_CHARS
      : MAX_EVENT_CHARS;
  const hintKey = slotKey(sessionKey, "hint");
  const hint = slotTaken(stateDir, hintKey) ? undefined : HINT;
  const withPath =
    new Set(input.views.map((view) => view.relativePath)).size > 1;

  const lines: string[] = [HEADER];
  const ids: string[] = [];
  const paths = new Set<string>();
  const seen = new Set<string>();
  const fixed = (extra: number) => lines.join("\n").length + extra;
  let rows = 0;
  for (const candidate of candidates) {
    if (rows >= perEvent || ledger.rows + rows >= MAX_SESSION_ROWS) break;
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    if (alreadyShown.has(candidate.id) && !candidate.firmFocus) continue;
    const row = rowText(candidate, summarize, withPath);
    const length = fixed(row.length + 1);
    if (length > eventChars || ledger.chars + length > MAX_SESSION_CHARS)
      continue;
    if (!claimSnippetSlot(stateDir, slotKey(sessionKey, candidate.id)))
      continue;
    lines.push(row);
    ids.push(candidate.id);
    paths.add(candidate.relativePath);
    rows++;
  }
  for (const { view, ids: busyIds } of busy) {
    if (ledger.rows + rows >= MAX_SESSION_ROWS) break;
    const line = busyLine(view, busyIds);
    const length = fixed(line.length + 1);
    if (
      length > MAX_WHOLE_FILE_EVENT_CHARS ||
      ledger.chars + length > MAX_SESSION_CHARS
    )
      continue;
    if (
      !claimSnippetSlot(
        stateDir,
        slotKey(sessionKey, "busy", view.relativePath),
      )
    )
      continue;
    lines.push(line);
    paths.add(view.relativePath);
    rows++;
  }
  if (rows === 0) return undefined;
  // The hint goes only where it still fits; rows come first.
  const withHint = fixed((hint?.length ?? 0) + 1);
  if (
    hint &&
    withHint <= eventChars &&
    ledger.chars + withHint <= MAX_SESSION_CHARS &&
    claimSnippetSlot(stateDir, hintKey)
  )
    lines.push(hint);
  const text = lines.join("\n");
  appendLedger(stateDir, sessionKey, { rows, chars: text.length });
  return { text, ids, paths: [...paths] };
}

/**
 * The source of a JavaScript regular expression for a grep pattern: a
 * literal for `-F`, basic syntax (`\|`, `\(`, `\+` are operators, bare
 * `|()+?{}` are literal) translated, and `-w` as word bounds.
 */
export function grepRegExp(grep: ShellGrep): RegExp {
  const flags = grep.ignoreCase ? "i" : "";
  const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let source: string;
  if (grep.fixed) source = literal(grep.pattern);
  else if (grep.basic) {
    source = "";
    for (let index = 0; index < grep.pattern.length; index++) {
      const char = grep.pattern[index] as string;
      const next = grep.pattern[index + 1];
      if (char === "\\" && next !== undefined && "|()+?{}".includes(next)) {
        source += next;
        index++;
      } else if (char === "\\" && next !== undefined) {
        source += `\\${next}`;
        index++;
      } else if ("|()+?{}".includes(char)) source += `\\${char}`;
      else source += char;
    }
  } else source = grep.pattern;
  if (grep.word) source = `\\b(?:${source})\\b`;
  try {
    return new RegExp(source, flags);
  } catch {
    // A pattern JavaScript reads differently falls back to its words.
    return new RegExp(literal(grep.pattern), flags);
  }
}

/** 1-based numbers of the lines of a file that a search matches. */
export function matchingLines(absolute: string, grep: ShellGrep): number[] {
  const pattern = grepRegExp(grep);
  const content = readText(absolute);
  if (content === undefined || content.length > MAX_SEARCH_FILE_BYTES)
    return [];
  const lines: number[] = [];
  for (const [index, line] of content.split("\n").entries())
    if (pattern.test(line)) lines.push(index + 1);
  return lines;
}

/** Linked files under a directory, workspace-relative. */
function linkedFilesUnder(
  files: Readonly<Record<string, readonly IndexedSymbol[]>>,
  relativeDirectory: string,
): string[] {
  const prefix = relativeDirectory === "" ? "" : `${relativeDirectory}/`;
  return Object.keys(files)
    .filter(
      (file) =>
        file.startsWith(prefix) &&
        implementedRequirementIds(files[file] ?? []).length > 0,
    )
    .sort()
    .slice(0, MAX_SEARCH_FILES);
}

export type ResolveInput = {
  workspaceRoot: string;
  /** Workspace-relative source file -> symbols with relationships. */
  files: Readonly<Record<string, readonly IndexedSymbol[]>>;
  /** Only workspace source files are described (no `.kb/`, no other). */
  isSource: (relativePath: string) => boolean;
  /** Keeps a file a search's glob or type filter admits. */
  admits?: ((relativePath: string) => boolean) | undefined;
};

function relativeTo(root: string, absolute: string): string | undefined {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
  return relative;
}

/**
 * The views of linked workspace files that shell reads (or a search tool's
 * paths and pattern) put in view: a search becomes the lines it matches in
 * each linked file it covers, a ranged read its lines, anything else the
 * whole file. Files with no linked symbol are left out.
 */
export function resolveReadViews(
  reads: readonly ShellRead[],
  input: ResolveInput,
): ReadView[] {
  const views = new Map<string, ReadView>();
  for (const read of reads) {
    const relative = relativeTo(input.workspaceRoot, read.absolute);
    if (relative === undefined) continue;
    if (read.grep) {
      const targets = read.directory
        ? linkedFilesUnder(input.files, relative)
        : [relative];
      for (const file of targets) {
        if (!input.isSource(file) || !(input.admits?.(file) ?? true)) continue;
        const symbols = input.files[file] ?? [];
        if (implementedRequirementIds(symbols).length === 0) continue;
        const matches = matchingLines(
          path.join(input.workspaceRoot, file),
          read.grep,
        );
        if (matches.length === 0) continue;
        views.set(file, { relativePath: file, symbols, matches });
      }
      continue;
    }
    if (read.directory || !input.isSource(relative)) continue;
    const symbols = input.files[relative] ?? [];
    if (implementedRequirementIds(symbols).length === 0) continue;
    if (views.has(relative)) continue;
    views.set(relative, {
      relativePath: relative,
      symbols,
      ...(read.focus ? { focus: read.focus } : {}),
    });
  }
  return [...views.values()];
}

/**
 * A glob filter as a test on workspace-relative paths: `**` crosses
 * directories, `*` and `?` stay inside one, `{a,b}` is a choice. A pattern
 * without a slash matches the file name anywhere, as grep and rg read it.
 */
export function globFilter(glob: string): (relativePath: string) => boolean {
  let source = "";
  let depth = 0;
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index] as string;
    if (char === "*" && glob[index + 1] === "*") {
      source += ".*";
      index++;
      if (glob[index + 1] === "/") index++;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else if (char === "{") {
      source += "(?:";
      depth++;
    } else if (char === "}" && depth > 0) {
      source += ")";
      depth--;
    } else if (char === "," && depth > 0) source += "|";
    else source += char.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  const anchored = glob.includes("/")
    ? new RegExp(`^${source}$`)
    : new RegExp(`(?:^|/)${source}$`);
  return (relativePath) => anchored.test(relativePath);
}

export type HookRowsInput = ResolveInput & {
  summarize: Summarize;
  stateDir: string | undefined;
  sessionKey: string | undefined;
  /** Requirement ids a Kibi tool result showed this session. */
  shownIds?: Iterable<string> | undefined;
  /** Files a Kibi tool result listed (`kb_query` with `sourceFile`). */
  shownPaths?: ReadonlySet<string> | undefined;
};

/**
 * Rows for what shell reads or a search tool put in view, for a host hook:
 * the reads resolved to linked source files, then {@link readContext}, with
 * a file Kibi already listed, or whose shared edit snippet this session
 * showed (see `editKnowledgeContext`), counted as showing its requirements.
 */
export function hookReadRows(
  reads: readonly ShellRead[],
  input: HookRowsInput,
): ReadContext | undefined {
  const views = resolveReadViews(reads, input);
  if (views.length === 0) return undefined;
  const alreadyShown = new Set(input.shownIds ?? []);
  for (const view of views)
    if (
      input.shownPaths?.has(view.relativePath) ||
      // The shared edit snippet already named this file's requirements.
      slotTaken(
        input.stateDir,
        `${String(input.sessionKey)}\u0000edit\u0000${view.relativePath}`,
      )
    )
      for (const id of implementedRequirementIds(view.symbols))
        alreadyShown.add(id);
  return readContext({
    views,
    summarize: input.summarize,
    stateDir: input.stateDir,
    sessionKey: input.sessionKey,
    alreadyShown,
  });
}

/**
 * A search tool call (Grep, grep_search and the like) as a shell read: its
 * pattern over its path (a file or a directory searched recursively),
 * resolved against `cwd`, or over `cwd` itself. Undefined without a pattern
 * or when the path does not exist.
 */
export function searchToolRead(search: {
  pattern: unknown;
  path?: unknown;
  cwd: string;
  ignoreCase?: boolean | undefined;
  /** The pattern is literal text, not a regular expression. */
  fixed?: boolean | undefined;
}): ShellRead | undefined {
  if (typeof search.pattern !== "string" || search.pattern.length === 0)
    return undefined;
  const absolute =
    typeof search.path === "string" && search.path.trim().length > 0
      ? path.resolve(search.cwd, search.path)
      : search.cwd;
  let directory: boolean;
  try {
    directory = fs.statSync(absolute).isDirectory();
  } catch {
    return undefined;
  }
  return {
    absolute,
    directory,
    grep: {
      pattern: search.pattern,
      ignoreCase: search.ignoreCase === true,
      fixed: search.fixed === true,
      basic: false,
      word: false,
    },
  };
}
