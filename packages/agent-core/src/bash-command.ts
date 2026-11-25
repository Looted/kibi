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

// One separator per split: a run of them only adds empty tokens, which are
// never path-like.
const TOKEN_SEPARATOR = /[\s;|&<>()'"`,=[\]{}]/;
const PATH_LIKE =
  /^[\w@.~/+-]*[\w-]\.[A-Za-z0-9]{1,8}$|^[\w@.~+-]*\/[\w@.~/+-]*$/;
const SEARCH_COMMAND =
  /(^|[\s;|&(])(grep|egrep|rg|ag|ack|find|fd|git\s+(grep|ls-files))(\s|$)/;
// A quote may open the script around it (`bash -lc 'cd src && ...'`).
const CD_TARGET = /(?:^|[\s;&|('"])cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g;

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

/** Directories a command `cd`s into, absolute, in order. */
function* cdTargets(command: string, cwd: string): Generator<string> {
  let base = cwd;
  for (const match of command.matchAll(CD_TARGET)) {
    // The target group always takes part in a match. An empty target (`cd
    // ""`) resolves to the base itself, which adds nothing.
    const target = unquote(match[1] as string);
    if (target === "-") continue;
    base = path.resolve(base, target);
    yield base;
  }
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
    // An absolute token resolves to itself from every base.
    for (const base of bases) {
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
  // Exit status 0 means git ran, and with an encoding stdout is then a string.
  if (listed.status !== 0) return [];
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
// `> file`, `>> file`, `>| file`, `&> file` and `&>> file` (not `2>&1`,
// `>&2` or a here-document marker). It runs on the masked copy, where a
// quoted target is a run of `_`.
const REDIRECT_TARGET = /(?:^|[^0-9&<>])(?:&>>?|>>?\|?)\s*([^\s;&|<>()]+)/g;
// sed and perl edit in place with -i (alone, bundled as -pi or -ni, or with a
// backup suffix as -i.bak) or sed's --in-place.
const IN_PLACE_FLAG = /^(-[A-Za-z]*i\S*|--in-place(=\S*)?)$/;
const IN_PLACE_EDITORS = new Set(["sed", "gsed", "perl"]);
// Words that run the next word as the command, and the shell keywords and
// grouping that open a command (`(sed ...)`, `{ sed ...; }`, `then sed ...`).
const COMMAND_PREFIXES = new Set([
  "sudo",
  "env",
  "command",
  "exec",
  "nice",
  "time",
  "xargs",
  "timeout",
  "(",
  "{",
  "then",
  "do",
  "else",
  "!",
]);
// Shells whose `-c` script is a command line of its own (`bash -lc "..."`).
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const SCRIPT_FLAG = /^-[A-Za-z]*c[A-Za-z]*$/;

/** The script of `bash -c <script>` (any shell, flags bundled), if any. */
function shellScript(words: readonly string[]): string | undefined {
  const [name, ...args] = words;
  if (!SHELLS.has(path.basename(String(name)))) return undefined;
  const flag = args.findIndex((arg) => SCRIPT_FLAG.test(arg));
  return flag === -1 ? undefined : args[flag + 1];
}

/**
 * The command with every quoted or backslash-escaped character replaced by
 * `_`, keeping its length. A `|` or `;` inside `sed -i 's|a|b|'` is part of
 * the script, not a pipe, so separators are looked for in this copy and the
 * words are then cut from the original at the same positions.
 */
function maskQuoted(command: string): string {
  let masked = "";
  let quote: string | null = null;
  let escaped = false;
  // UTF-16 units, so the copy keeps the original's positions.
  for (const char of command.split("")) {
    if (escaped) {
      escaped = false;
      masked += "_";
    } else if (quote === null && (char === "'" || char === '"')) {
      quote = char;
      masked += "_";
    } else if (char === "\\" && quote !== "'") {
      escaped = true;
      masked += "_";
    } else if (quote !== null) {
      if (char === quote) quote = null;
      masked += "_";
    } else masked += char;
  }
  return masked;
}

/** The words of each simple command, quotes kept, in order. */
function* simpleCommandWords(
  command: string,
  masked: string,
): Generator<string[]> {
  let start = 0;
  const cut = (end: number) =>
    [...masked.slice(start, end).matchAll(/\S+/g)].map((word) => {
      const from = start + word.index;
      return command.slice(from, from + word[0].length);
    });
  for (const separator of masked.matchAll(SIMPLE_COMMAND_SEPARATOR)) {
    yield cut(separator.index);
    start = separator.index + separator[0].length;
  }
  yield cut(masked.length);
}

function isCommandWord(word: string): boolean {
  return !COMMAND_PREFIXES.has(word) && !/^\w+=/.test(word);
}

/**
 * Where the command word starts. A flag (`xargs -0`) or a
 * duration (`timeout 5`, `5s`) right after a prefix belongs to the prefix.
 */
function commandStart(words: readonly string[]): number {
  let afterPrefix = false;
  for (const [index, word] of words.entries()) {
    if (!isCommandWord(word)) {
      afterPrefix = afterPrefix || COMMAND_PREFIXES.has(word);
      continue;
    }
    if (afterPrefix && (/^-/.test(word) || /^\d+(?:\.\d+)?[smhd]?$/.test(word)))
      continue;
    return index;
  }
  return -1;
}

/** The words with a subshell's or group's brackets taken off. */
function unbracketed(words: readonly string[]): string[] {
  return words.flatMap((word) => {
    const opened = /^\(+./.test(word) ? word.replace(/^\(+/, "") : word;
    const closed = /.\)+$/.test(opened) ? opened.replace(/\)+$/, "") : opened;
    return closed === ")" || closed === "}" ? [] : [closed];
  });
}

/** Names a command line writes: redirection targets and editor/tee operands. */
function* writtenNames(command: string): Generator<string> {
  const masked = maskQuoted(command);
  for (const match of masked.matchAll(REDIRECT_TARGET)) {
    const end = match.index + match[0].length;
    // The target group always takes part in a match.
    yield unquote(command.slice(end - (match[1] as string).length, end));
  }
  for (const words of simpleCommandWords(command, masked)) {
    // Without a command word (an empty or all-prefix command) this is the
    // last word or none, which never names an editor or tee.
    const plain = unbracketed(words);
    const commandWords = plain.slice(commandStart(plain));
    const script = shellScript(commandWords);
    if (script !== undefined) {
      yield* writtenNames(unquote(script));
      continue;
    }
    const [name, ...args] = commandWords;
    const program = path.basename(String(name));
    // Flags are kept: commandFilePaths never reports a `-` word.
    if (
      (IN_PLACE_EDITORS.has(program) &&
        args.some((arg) => IN_PLACE_FLAG.test(arg))) ||
      program === "tee"
    )
      yield* args;
  }
}

/**
 * Absolute paths of existing files a command will write in place before it
 * runs: the files of `sed -i` / `perl -i`, the targets of `>` and `>>`
 * redirections, and the files `tee` writes. A subset of
 * {@link commandFilePaths}, so the hook can treat them as edits up front
 * (what must stay true) instead of reads. Quoted text (a sed script, an
 * echoed string) is never read as a separator or a redirection.
 */
export function commandEditPaths(command: string, cwd: string): string[] {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const wanted = new Set<string>();
  for (const target of writtenNames(scanned)) {
    // An empty name resolves to a directory, which is never a named file,
    // and an absolute one resolves to itself from every base.
    const name = unquote(target);
    for (const base of bases) wanted.add(path.resolve(base, name));
  }
  return commandFilePaths(scanned, cwd).filter((absolute) =>
    wanted.has(absolute),
  );
}

/** Hosts' shell tool names: a `sed -i` or `>` through them edits files too. */
const SHELL_TOOLS = new Set([
  "Bash",
  "Shell",
  "shell",
  "local_shell",
  "exec_command",
  "run_shell_command",
]);

/**
 * The command line of a shell tool call, or undefined when the call is not
 * a shell call. Hosts pass the command as a string or an argv array; both
 * are read, and `["bash", "-lc", "<script>"]` is its script.
 */
export function shellToolCommand(
  toolName: string | undefined,
  toolInput: unknown,
): string | undefined {
  if (toolName === undefined || !SHELL_TOOLS.has(toolName)) return undefined;
  const raw =
    toolInput !== null && typeof toolInput === "object"
      ? (toolInput as { command?: unknown }).command
      : undefined;
  const argv = Array.isArray(raw)
    ? raw.filter((part): part is string => typeof part === "string")
    : undefined;
  const command =
    argv === undefined ? raw : (shellScript(argv) ?? argv.join(" "));
  return typeof command === "string" ? command : undefined;
}

/**
 * Absolute paths of existing files a shell tool call writes in place, or
 * none when the call is not a shell call.
 */
export function shellToolEditPaths(
  toolName: string | undefined,
  toolInput: unknown,
  cwd: string,
): string[] {
  const command = shellToolCommand(toolName, toolInput);
  return command === undefined ? [] : commandEditPaths(command, cwd);
}

/**
 * What a shell tool call shows of each file it names (see
 * {@link commandReadViews}), or nothing when the call is not a shell call.
 * Files the call writes in place are left out: they are edits.
 */
export function shellToolReadViews(
  toolName: string | undefined,
  toolInput: unknown,
  cwd: string,
): ShellRead[] {
  const command = shellToolCommand(toolName, toolInput);
  if (command === undefined) return [];
  const edited = new Set(commandEditPaths(command, cwd));
  return commandReadViews(command, cwd).filter(
    (view) => !edited.has(view.absolute),
  );
}

/** Lines of a file, 1-based and inclusive. */
export type ShellLineRange = { start: number; end: number };

/** How a shell search matches lines (grep, egrep, fgrep, rg). */
export type ShellGrep = {
  pattern: string;
  /** `-i`: case-insensitive. */
  ignoreCase: boolean;
  /** `-F` or fgrep: the pattern is a literal string. */
  fixed: boolean;
  /** grep without `-E`/`-P`: basic regular expression syntax. */
  basic: boolean;
  /** `-w`: the match is a whole word. */
  word: boolean;
};

/**
 * What one shell command shows of a file or directory: the lines in view
 * (`sed -n 'a,bp'`, `head`, `tail`), the lines a search matches (`grep`,
 * `rg`), or the whole file (`cat`, any other command naming it).
 */
export type ShellRead = {
  /** Absolute path of an existing file or, for a search, a directory. */
  absolute: string;
  directory: boolean;
  /** Lines in view; absent when the whole file is (or for a search). */
  focus?: ShellLineRange[];
  /** The search whose matching lines are in view. */
  grep?: ShellGrep;
};

const SEARCH_PROGRAMS = new Set(["grep", "egrep", "fgrep", "rg"]);
const WHOLE_FILE_PROGRAMS = new Set(["cat", "nl", "bat", "less", "more"]);
// grep and rg options that take the next word as their value.
const GREP_VALUE_FLAGS = new Set([
  "-A",
  "-B",
  "-C",
  "-m",
  "-g",
  "-t",
  "-T",
  "-f",
  "--glob",
  "--type",
  "--max-count",
  "--context",
  "--after-context",
  "--before-context",
  "--include",
  "--exclude",
  "--exclude-dir",
]);
const SED_PRINT = /^(\d+)(?:,(\d+|\$))?p$/;
/** Lines a `tail` with no length shows, and `head` alike. */
const DEFAULT_HEAD_LINES = 10;

/** The value of `-n N`, `-nN`, `-N` or `--lines=N`, and the words it used. */
function lineCount(
  args: readonly string[],
  index: number,
): { value: string; used: number } | undefined {
  const arg = args[index] as string;
  if (arg === "-n" || arg === "--lines") {
    const value = args[index + 1];
    return value === undefined ? undefined : { value, used: 2 };
  }
  const attached =
    /^(?:-n|--lines=)(\+?\d+)$/.exec(arg) ?? /^-(\d+)$/.exec(arg);
  return attached ? { value: attached[1] as string, used: 1 } : undefined;
}

/** A file's text, or undefined when it cannot be read. */
export function readText(absolute: string): string | undefined {
  try {
    return fs.readFileSync(absolute, "utf8");
  } catch {
    return undefined;
  }
}

/** Number of lines of a file; an unreadable file has none. */
function fileLineCount(absolute: string): number {
  const content = readText(absolute) ?? "";
  const lines = content.split("\n").length;
  return content.endsWith("\n") || content === "" ? lines - 1 : lines;
}

type Stage = {
  /** Operand words (files or directories) the stage names. */
  operands: string[];
  /** Lines the stage keeps of what it reads, when it narrows them. */
  range?: (absolute: string) => ShellLineRange;
  grep?: ShellGrep;
  /** A recursive search with no operand searches the working directory. */
  recursive: boolean;
  whole: boolean;
};

/** One simple command of a pipeline, read as a view of the files it names. */
function readStage(words: readonly string[]): Stage | undefined {
  const [name, ...args] = words;
  const program = path.basename(String(name));
  if (program === "sed") {
    if (!args.includes("-n")) return undefined;
    const rest = args.filter((arg) => arg !== "-n");
    const scriptIndex = rest.findIndex((arg) => !arg.startsWith("-"));
    if (scriptIndex === -1) return undefined;
    const print = SED_PRINT.exec(unquote(rest[scriptIndex] as string));
    if (!print) return undefined;
    const start = Number(print[1]);
    const endText = print[2] ?? print[1];
    return {
      operands: rest
        .slice(scriptIndex + 1)
        .filter((arg) => !arg.startsWith("-")),
      range: (absolute) => ({
        start,
        end: endText === "$" ? fileLineCount(absolute) : Number(endText),
      }),
      recursive: false,
      whole: false,
    };
  }
  if (program === "head" || program === "tail") {
    let count = String(DEFAULT_HEAD_LINES);
    const operands: string[] = [];
    for (let index = 0; index < args.length; index++) {
      const found = lineCount(args, index);
      if (found) {
        count = found.value;
        index += found.used - 1;
      } else if (!(args[index] as string).startsWith("-"))
        operands.push(args[index] as string);
    }
    const lines = Number(count.replace(/^\+/, ""));
    return {
      operands,
      range: (absolute) => {
        if (program === "head") return { start: 1, end: lines };
        const total = fileLineCount(absolute);
        return count.startsWith("+")
          ? { start: lines, end: total }
          : { start: Math.max(1, total - lines + 1), end: total };
      },
      recursive: false,
      whole: false,
    };
  }
  if (SEARCH_PROGRAMS.has(program)) return searchStage(program, args);
  if (WHOLE_FILE_PROGRAMS.has(program))
    return {
      operands: args.filter((arg) => !arg.startsWith("-")),
      recursive: false,
      whole: true,
    };
  return undefined;
}

/** The pattern, flags and operands of a grep, egrep, fgrep or rg command. */
function searchStage(program: string, args: readonly string[]): Stage {
  let pattern: string | undefined;
  let ignoreCase = false;
  let fixed = program === "fgrep";
  let basic = program === "grep";
  let word = false;
  let recursive = program === "rg";
  const operands: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] as string;
    if (arg === "--") {
      for (const rest of args.slice(index + 1)) {
        if (pattern === undefined) pattern = unquote(rest);
        else operands.push(rest);
      }
      break;
    }
    if (arg === "-e" || arg === "--regexp") {
      pattern = unquote(String(args[++index]));
      continue;
    }
    if (GREP_VALUE_FLAGS.has(arg)) {
      index++;
      continue;
    }
    if (arg.startsWith("--")) {
      if (arg === "--ignore-case") ignoreCase = true;
      else if (arg === "--fixed-strings") fixed = true;
      else if (arg === "--extended-regexp" || arg === "--perl-regexp")
        basic = false;
      else if (arg === "--word-regexp") word = true;
      else if (arg === "--recursive") recursive = true;
      continue;
    }
    if (arg.startsWith("-") && arg.length > 1) {
      // Bundled short flags (`-rn`, `-inE`); a trailing value flag such as
      // `-A3` carries its value.
      for (const flag of arg.slice(1)) {
        if (flag === "i") ignoreCase = true;
        else if (flag === "F") fixed = true;
        else if (flag === "E" || flag === "P") basic = false;
        else if (flag === "w") word = true;
        else if (flag === "r" || flag === "R") recursive = true;
      }
      continue;
    }
    if (pattern === undefined) pattern = unquote(arg);
    else operands.push(arg);
  }
  return {
    operands,
    ...(pattern === undefined || pattern.length === 0
      ? {}
      : { grep: { pattern, ignoreCase, fixed, basic: basic && !fixed, word } }),
    recursive,
    whole: false,
  };
}

/** The pipelines of a command line, each a list of stages' words. */
function* pipelines(command: string): Generator<string[][]> {
  const masked = maskQuoted(command);
  const separator = /&&|\|\||[;\n]/g;
  let start = 0;
  const pieces: Array<[number, number]> = [];
  for (const match of masked.matchAll(separator)) {
    pieces.push([start, match.index]);
    start = match.index + match[0].length;
  }
  pieces.push([start, masked.length]);
  for (const [from, to] of pieces) {
    const stages: string[][] = [];
    let stageStart = from;
    const cut = (end: number) => {
      const words = [...masked.slice(stageStart, end).matchAll(/\S+/g)].map(
        (word) => {
          const at = stageStart + word.index;
          return command.slice(at, at + word[0].length);
        },
      );
      const plain = unbracketed(words);
      stages.push(plain.slice(Math.max(0, commandStart(plain))));
    };
    for (let index = from; index < to; index++) {
      if (masked[index] === "|") {
        cut(index);
        stageStart = index + 1;
      }
    }
    cut(to);
    yield stages;
  }
}

/**
 * What a shell command shows of each workspace file or directory it names,
 * before it runs: line ranges from `sed -n 'a,bp'`, `head` and `tail` (also
 * when they read a piped `cat` or `nl` of one file), the search of a `grep`
 * or `rg` (over named files, or over directories when recursive), and the
 * whole file for `cat` or any other command that names it. A file named in
 * several ways keeps its narrowest view; nothing is lost when parsing fails,
 * since every file the command names is still listed whole.
 */
export function commandReadViews(command: string, cwd: string): ShellRead[] {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const views = new Map<string, ShellRead>();
  const resolve = (
    word: string,
  ): { absolute: string; directory: boolean } | undefined => {
    const name = unquote(word);
    for (const base of bases) {
      const absolute = path.resolve(base, name);
      try {
        const stat = fs.statSync(absolute);
        if (stat.isFile() || stat.isDirectory())
          return { absolute, directory: stat.isDirectory() };
      } catch {
        // Not here; try the next base.
      }
    }
    return undefined;
  };
  const add = (view: ShellRead) => {
    const known = views.get(view.absolute);
    // A focused or searched view says more than a whole-file one.
    if (!known || (!known.focus && !known.grep)) views.set(view.absolute, view);
  };
  const visit = (line: string, depth: number) => {
    for (const stages of pipelines(line)) {
      let source: string | undefined;
      for (const words of stages) {
        const script = shellScript(words);
        if (script !== undefined && depth < 2) {
          visit(unquote(script), depth + 1);
          continue;
        }
        const stage = readStage(words);
        if (!stage) {
          source = undefined;
          continue;
        }
        const operands = stage.operands
          .map(resolve)
          .filter((target) => target !== undefined);
        if (stage.grep) {
          const targets =
            operands.length === 0 && stage.recursive
              ? [
                  {
                    absolute: path.resolve(bases.at(-1) as string),
                    directory: true,
                  },
                ]
              : operands;
          for (const target of targets)
            if (!target.directory || stage.recursive)
              add({ ...target, grep: stage.grep });
          if (operands.length === 0 && source)
            add({ absolute: source, directory: false, grep: stage.grep });
          source = undefined;
          continue;
        }
        const files = operands.filter((target) => !target.directory);
        if (stage.range) {
          const targets =
            files.length === 0 && source
              ? [{ absolute: source, directory: false }]
              : files;
          for (const target of targets)
            add({ ...target, focus: [stage.range(target.absolute)] });
          source = undefined;
          continue;
        }
        for (const target of files) add(target);
        source =
          files.length === 1
            ? (files[0] as { absolute: string }).absolute
            : undefined;
      }
    }
  };
  visit(scanned, 0);
  for (const absolute of commandFilePaths(scanned, cwd))
    if (!views.has(absolute))
      views.set(absolute, { absolute, directory: false });
  return [...views.values()];
}
