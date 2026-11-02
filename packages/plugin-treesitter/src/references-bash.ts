import { posix } from "node:path";
import type { Node } from "web-tree-sitter";
import { type UnresolvedRow, at, field, named } from "./reference-nodes.js";

/**
 * Bash references. A script has no getter call to read: a variable it
 * expands but never sets is read from the environment, and one it sets
 * before every read is its own. Commands are its calls, `source` and `.`
 * its imports. Code the shell builds at run time (`eval`, `bash -c`, a
 * command name held in a variable, `trap 'code'`, an alias) and everything
 * whose meaning depends on values (indirect `${!name}`, arithmetic on a
 * value that may name another variable) is an unresolved row, so a claim is
 * never decided over a part of the script Kibi did not see.
 */

type BashExtract = "env" | "imports" | "calls" | "string_args";

interface BashRead {
  members: string[];
  unresolved: UnresolvedRow[];
}

/**
 * Variables bash sets (or resets) at start-up whatever the environment
 * holds, which are therefore not read from it: `$PWD`, `$RANDOM`,
 * `$BASH_SOURCE`, ... Variables bash only fills in when the environment does
 * not set them (`HOSTNAME`, `OSTYPE`) or sets later (`REPLY`, `OPTARG`) are
 * environment reads until the script sets them.
 */
const SHELL_VARIABLES = new Set([
  "BASH",
  "BASHPID",
  "BASH_COMMAND",
  "BASH_EXECUTION_STRING",
  "BASH_LINENO",
  "BASH_SOURCE",
  "BASH_SUBSHELL",
  "BASH_VERSINFO",
  "BASH_VERSION",
  "EPOCHREALTIME",
  "EPOCHSECONDS",
  "EUID",
  "FUNCNAME",
  "GROUPS",
  "HISTCMD",
  "IFS",
  "LINENO",
  "OPTERR",
  "OPTIND",
  "PPID",
  "PWD",
  "RANDOM",
  "SECONDS",
  "SHELLOPTS",
  "SRANDOM",
  "UID",
]);

/**
 * Variables bash may take from the environment or set itself depending on
 * how it starts (`BASHOPTS`, `OLDPWD`, `SHLVL`): a read may be of the
 * environment's value.
 */
const MAYBE_SHELL_VARIABLES = new Set([
  "BASHOPTS",
  "BASH_ARGC",
  "BASH_ARGV",
  "BASH_CMDS",
  "OLDPWD",
  "SHLVL",
]);

/** Shell variables whose value is always a number. */
const NUMERIC_SHELL_VARIABLES = new Set([
  "BASHPID",
  "BASH_SUBSHELL",
  "EPOCHSECONDS",
  "EUID",
  "HISTCMD",
  "LINENO",
  "OPTIND",
  "PPID",
  "RANDOM",
  "SECONDS",
  "SRANDOM",
  "UID",
]);

/** Special parameters (`$#`, `$?`, `$$`, `$!`) that are always numbers. */
const NUMERIC_SPECIAL = new Set(["#", "?", "$", "!"]);

const SHELLS = new Set([
  "sh",
  "bash",
  "zsh",
  "dash",
  "ksh",
  "ash",
  "mksh",
  "yash",
]);

/** Shell options that take an argument (`-o pipefail`, `-O extglob`). */
const SHELL_OPTION_ARGS = new Set([
  "-o",
  "+o",
  "-O",
  "+O",
  "--rcfile",
  "--init-file",
]);

interface Wrapper {
  /** Options followed by a separate argument. */
  readonly args: ReadonlySet<string>;
  /** Options that stand alone. */
  readonly flags: ReadonlySet<string>;
  /** Operands before the command (`timeout DURATION`, `chroot DIR`). */
  readonly operands?: number;
  /** `NAME=VALUE` words before the command (`env`, `sudo`). */
  readonly assignments?: boolean;
  /** Options after which no command runs (`command -v`, `sudo -l`). */
  readonly noCommand?: ReadonlySet<string>;
  /** Options that run their argument as shell code (`flock -c`, `env -S`). */
  readonly code?: ReadonlySet<string>;
  /** The command it runs when none is given (`xargs` runs `echo`). */
  readonly fallback?: string;
  /** A shell is started when no command is given (`sudo -s`, `chroot`). */
  readonly shellWithout?: boolean;
  /** Short flags may be clustered (`-ul` style is not used here). */
  readonly numericFlags?: boolean;
}

const set = (...items: string[]): ReadonlySet<string> => new Set(items);

/** Commands that run another command named in their arguments. */
const WRAPPERS: ReadonlyMap<string, Wrapper> = new Map<string, Wrapper>([
  [
    "sudo",
    {
      args: set(
        "-u",
        "-g",
        "-C",
        "-D",
        "-h",
        "-p",
        "-r",
        "-t",
        "-U",
        "-T",
        "--user",
        "--group",
        "--prompt",
        "--chdir",
        "--role",
        "--type",
        "--other-user",
        "--command-timeout",
        "--close-from",
        "--host",
      ),
      flags: set(
        "-A",
        "-b",
        "-E",
        "-H",
        "-n",
        "-P",
        "-S",
        "-k",
        "-B",
        "-N",
        "-R",
        "--askpass",
        "--background",
        "--preserve-env",
        "--set-home",
        "--non-interactive",
        "--preserve-groups",
        "--stdin",
        "--reset-timestamp",
        "--bell",
        "--no-update",
      ),
      assignments: true,
      noCommand: set(
        "-e",
        "-l",
        "-v",
        "-V",
        "-K",
        "--edit",
        "--list",
        "--validate",
        "--version",
        "--remove-timestamp",
        "--help",
        "-h",
      ),
      code: set("-s", "-i", "--shell", "--login"),
    },
  ],
  ["doas", { args: set("-u", "-C"), flags: set("-n"), code: set("-s") }],
  [
    "env",
    {
      args: set("-u", "-C", "--unset", "--chdir", "--split-string-off"),
      flags: set("-i", "-v", "--ignore-environment", "--debug", "-"),
      assignments: true,
      code: set("-S", "--split-string"),
      noCommand: set("-0", "--null", "--help", "--version"),
    },
  ],
  ["command", { args: set(), flags: set("-p"), noCommand: set("-v", "-V") }],
  ["builtin", { args: set(), flags: set() }],
  ["exec", { args: set("-a"), flags: set("-c", "-l") }],
  ["nohup", { args: set(), flags: set() }],
  [
    "setsid",
    { args: set(), flags: set("-c", "-f", "-w", "--ctty", "--fork", "--wait") },
  ],
  [
    "nice",
    { args: set("-n", "--adjustment"), flags: set(), numericFlags: true },
  ],
  [
    "ionice",
    {
      args: set("-c", "-n", "--class", "--classdata"),
      flags: set("-t", "--ignore"),
      noCommand: set("-p", "-P", "-u", "--pid", "--pgid", "--uid"),
    },
  ],
  [
    "stdbuf",
    {
      args: set("-i", "-o", "-e", "--input", "--output", "--error"),
      flags: set(),
    },
  ],
  [
    "time",
    {
      args: set("-f", "-o", "--format", "--output"),
      flags: set(
        "-p",
        "-a",
        "-v",
        "-q",
        "--portability",
        "--append",
        "--verbose",
        "--quiet",
      ),
    },
  ],
  [
    "timeout",
    {
      args: set("-s", "-k", "--signal", "--kill-after"),
      flags: set("-v", "--verbose", "--preserve-status", "--foreground"),
      operands: 1,
    },
  ],
  [
    "chroot",
    {
      args: set("--userspec", "--groups"),
      flags: set("--skip-chdir"),
      operands: 1,
      shellWithout: true,
    },
  ],
  [
    "flock",
    {
      args: set("-w", "-E", "--timeout", "--conflict-exit-code"),
      flags: set(
        "-s",
        "-x",
        "-u",
        "-n",
        "-o",
        "-F",
        "--shared",
        "--exclusive",
        "--unlock",
        "--nonblock",
        "--close",
        "--no-fork",
        "--verbose",
      ),
      operands: 1,
      code: set("-c", "--command"),
    },
  ],
  [
    "xargs",
    {
      args: set(
        "-a",
        "-d",
        "-E",
        "-I",
        "-L",
        "-n",
        "-P",
        "-s",
        "--arg-file",
        "--delimiter",
        "--max-lines",
        "--max-args",
        "--max-procs",
        "--max-chars",
        "--process-slot-var",
      ),
      flags: set(
        "-0",
        "-r",
        "-t",
        "-p",
        "-x",
        "-o",
        "--null",
        "--no-run-if-empty",
        "--verbose",
        "--interactive",
        "--exit",
        "--open-tty",
      ),
      fallback: "echo",
    },
  ],
  ["unbuffer", { args: set(), flags: set("-p") }],
  [
    "caffeinate",
    { args: set("-t", "-w"), flags: set("-d", "-i", "-m", "-s", "-u") },
  ],
  [
    "taskset",
    {
      args: set(),
      flags: set("-a", "--all-tasks"),
      operands: 1,
      noCommand: set("-p", "--pid"),
    },
  ],
  [
    "strace",
    {
      args: set(
        "-e",
        "-o",
        "-p",
        "-s",
        "-u",
        "-a",
        "-I",
        "-b",
        "-E",
        "-P",
        "-S",
        "-X",
      ),
      flags: set(
        "-c",
        "-C",
        "-d",
        "-D",
        "-f",
        "-F",
        "-i",
        "-k",
        "-n",
        "-q",
        "-r",
        "-t",
        "-T",
        "-v",
        "-V",
        "-w",
        "-x",
        "-y",
        "-Z",
        "-ff",
        "-tt",
        "-ttt",
        "-yy",
        "-qq",
      ),
    },
  ],
  [
    "ltrace",
    {
      args: set(
        "-e",
        "-o",
        "-p",
        "-s",
        "-u",
        "-a",
        "-n",
        "-l",
        "-L",
        "-x",
        "-F",
        "-A",
      ),
      flags: set(
        "-c",
        "-C",
        "-d",
        "-D",
        "-f",
        "-i",
        "-r",
        "-S",
        "-t",
        "-T",
        "-w",
        "-b",
        "-tt",
        "-ttt",
      ),
    },
  ],
]);

/** Commands that run shell code given as text, whatever their arguments. */
const CODE_COMMANDS = new Set([
  "watch",
  "parallel",
  "sem",
  "su",
  "coproc",
  "sg",
  "script",
]);

/**
 * Commands that run another command Kibi does not follow (their options are
 * not modelled): the command they run is unknown, so the read refuses.
 */
const RUNNERS = new Set([
  "runuser",
  "chrt",
  "unshare",
  "setpriv",
  "systemd-run",
  "pkexec",
  "fakeroot",
  "fakechroot",
  "nsenter",
  "firejail",
  "bwrap",
  "proot",
  "cgexec",
  "numactl",
  "prlimit",
  "schroot",
  "chpst",
  "softlimit",
  "envdir",
  "setuidgid",
  "dbus-run-session",
  "dbus-launch",
  "xvfb-run",
  "faketime",
  "torsocks",
  "proxychains",
  "proxychains4",
  "tsocks",
  "catchsegv",
  "valgrind",
  "start-stop-daemon",
  "daemonize",
  "chronic",
  "ssh-agent",
  "with-contenv",
  "s6-setuidgid",
  "gosu",
  "su-exec",
  "tini",
  "dumb-init",
]);

/** Commands that set variables: through `command` or `builtin` they still do. */
const DECLARATIONS = new Set([
  "declare",
  "typeset",
  "local",
  "export",
  "readonly",
  "unset",
]);

/** Whether `text` has an unescaped character of `chars` outside quotes. */
function unescaped(text: string, chars: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === "\\") index += 1;
    else if (chars.includes(char)) return true;
  }
  return false;
}

/** Whether a word holds a brace expansion: `{a,b}` or `{1..3}`. */
function braces(text: string): boolean {
  return /\{[^{}]*(?:,|\.\.)[^{}]*\}/.test(text.replace(/\\./g, "__"));
}

/**
 * The literal text a word stands for after quote removal, or null when the
 * shell would change it (an expansion, a glob, a brace or tilde expansion).
 */
function wordValue(node: Node | null | undefined): string | null {
  if (node === null || node === undefined) return null;
  switch (node.type) {
    case "command_name":
      return named(node).length === 1 ? wordValue(named(node)[0]) : null;
    case "word": {
      const text = node.text;
      if (unescaped(text, "*?[$`") || braces(text) || text.startsWith("~"))
        return null;
      return text.replace(/\\\n/g, "").replace(/\\(.)/gs, "$1");
    }
    case "number":
      return node.text;
    case "raw_string":
      return node.text.slice(1, -1);
    case "string": {
      let value = "";
      for (const part of named(node)) {
        if (part.type !== "string_content") return null;
        value += part.text.replace(/\\\n/g, "").replace(/\\([$`"\\])/g, "$1");
      }
      return value;
    }
    case "concatenation": {
      if (braces(node.text)) return null;
      let value = "";
      for (const part of named(node)) {
        const text = wordValue(part);
        if (text === null) return null;
        value += text;
      }
      return value;
    }
    default:
      return null;
  }
}

function args(node: Node): Node[] {
  const list = node
    .childrenForFieldName("argument")
    .filter((child): child is Node => child !== null);
  // `curl >out https://x`: the grammar reads the words after a redirect as
  // more destinations of it, but only the first is the redirect's.
  const statement = node.parent;
  if (statement?.type !== "redirected_statement") return list;
  for (const redirect of statement.childrenForFieldName("redirect")) {
    if (redirect === null) continue;
    const destinations = redirect
      .childrenForFieldName("destination")
      .filter((child): child is Node => child !== null);
    list.push(...destinations.slice(1));
  }
  return list.sort((a, b) => a.startIndex - b.startIndex);
}

/** The parameter an expansion reads: its name, or null for a special one. */
function parameter(node: Node): { name: string; at: Node } | null {
  const first = named(node)[0];
  if (first === undefined) return null;
  if (first.type === "variable_name")
    return /^\d+$/.test(first.text) ? null : { name: first.text, at: first };
  if (first.type === "subscript") {
    const base = field(first, "name");
    return base === null ? null : { name: base.text, at: base };
  }
  return null;
}

/**
 * The directory a script-relative `source` path starts from:
 * `$(dirname "$0")`, `$(dirname "${BASH_SOURCE[0]}")`, `${BASH_SOURCE%/*}`.
 */
const SCRIPT_DIR =
  /^(?:\$\(dirname \$\{?(?:0|BASH_SOURCE(?:\[0\])?)\}?\)|\$\{(?:0|BASH_SOURCE(?:\[0\])?)%\/\*\})(\/[\w./-]+)$/;

function sourcedPath(node: Node | undefined, file: string): string | null {
  if (node === undefined) return null;
  const value = wordValue(node);
  if (value !== null) return value;
  const match = SCRIPT_DIR.exec(node.text.replaceAll('"', ""));
  if (match === null) return null;
  return posix.normalize(posix.join(posix.dirname(file), match[1] as string));
}

interface Binding {
  readonly name: string;
  readonly start: number;
  readonly end: number;
  /** Runs before anything after it in its block: a direct statement, `=`. */
  readonly dominates: boolean;
  /** The function whose body holds it, or null at top level. */
  readonly scope: Node | null;
  readonly numeric: boolean;
}

/** The function definition a node is inside, innermost first. */
function enclosingFunction(node: Node): Node | null {
  for (let current = node.parent; current !== null; current = current.parent)
    if (current.type === "function_definition") return current;
  return null;
}

/** The outermost function definition a node is inside. */
function outermostFunction(node: Node): Node | null {
  let found: Node | null = null;
  for (let current = node.parent; current !== null; current = current.parent)
    if (current.type === "function_definition") found = current;
  return found;
}

/** Whether `node` is a statement run unconditionally in its scope. */
function direct(node: Node): boolean {
  const parent = node.parent;
  if (parent === null) return false;
  // `X=1 &` runs in a background subshell.
  if (node.nextSibling?.type === "&") return false;
  if (parent.type === "program") return true;
  // A command with redirections runs like the command, unless opening a
  // file can fail first (`read X < missing`): input from a here-document,
  // a here-string or a process substitution always opens.
  if (parent.type === "redirected_statement")
    return (
      parent
        .childrenForFieldName("redirect")
        .every(
          (redirect) =>
            redirect === null ||
            redirect.type === "heredoc_redirect" ||
            redirect.type === "herestring_redirect" ||
            /^\/dev\/null$/.test(field(redirect, "destination")?.text ?? "") ||
            field(redirect, "destination")?.type === "process_substitution",
        ) && direct(parent)
    );
  // The first command of `a && b` always runs.
  if (parent.type === "list")
    return named(parent)[0]?.id === node.id && direct(parent);
  return (
    parent.type === "compound_statement" &&
    parent.parent?.type === "function_definition"
  );
}

/** Whether a node is inside an arithmetic context or a C-style `for`. */
function inArithmetic(node: Node): boolean {
  let current = node.parent;
  while (
    current !== null &&
    !arithmetic(current) &&
    !ARITHMETIC_ENDS.has(current.type)
  )
    current = current.parent;
  return (
    current !== null &&
    (arithmetic(current) || current.type === "c_style_for_statement")
  );
}

/** Where the search for an arithmetic context stops. */
const ARITHMETIC_ENDS = new Set([
  "c_style_for_statement",
  "command",
  "test_command",
]);

/** Whether a node is an arithmetic context: `(( ))`, `$(( ))`, `$[ ]`. */
function arithmetic(node: Node): boolean {
  if (node.type === "arithmetic_expansion") return true;
  if (node.type === "compound_statement") return node.text.startsWith("((");
  return false;
}

/** The options of a declaration (`-r`, `-i`, `-A`), as letters. */
function declarationFlags(node: Node): string {
  return named(node)
    .filter((child) => child.type === "word" && /^[-+]/.test(child.text))
    .map((child) => child.text.slice(1))
    .join("");
}

function keyword(node: Node): string {
  return /^\w+/.exec(node.text)?.[0] ?? "";
}

/** `read`'s options that take an argument; `-a` names an array. */
const READ_ARGS = new Set(["-a", "-d", "-i", "-n", "-N", "-p", "-t", "-u"]);
const MAPFILE_ARGS = new Set(["-d", "-n", "-O", "-s", "-u", "-C", "-c"]);

/**
 * The variable names a binding command sets (`read A B`, `mapfile -t L`,
 * `printf -v OUT`, `getopts s NAME`, `wait -p J`), or null when one is not
 * literal (`read "$name"`).
 */
function commandBinds(name: string, list: Node[]): string[] | null {
  const words = list.map((node) => wordValue(node));
  switch (name) {
    case "read": {
      const names: string[] = [];
      let options = true;
      for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        if (options && word === "--") {
          options = false;
          continue;
        }
        if (
          options &&
          word !== null &&
          word !== undefined &&
          word.startsWith("-") &&
          word.length > 1
        ) {
          // `-rp PROMPT`: options cluster, and the last may take the next word.
          const letters = word.slice(1);
          for (let at = 0; at < letters.length; at += 1) {
            const option = `-${letters[at]}`;
            if (!READ_ARGS.has(option)) continue;
            const attached = letters.slice(at + 1);
            const value = attached !== "" ? attached : words[index + 1];
            if (attached === "") index += 1;
            if (option === "-a") {
              if (value === null || value === undefined) return null;
              names.push(value);
            }
            break;
          }
          continue;
        }
        if (word === null || word === undefined) return null;
        options = false;
        names.push(word);
      }
      // With no names, `read` sets REPLY.
      return names.length === 0 ? ["REPLY"] : names;
    }
    case "mapfile":
    case "readarray": {
      const names: string[] = [];
      for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        if (word === null || word === undefined) return null;
        if (word.startsWith("-")) {
          if (MAPFILE_ARGS.has(word)) index += 1;
          continue;
        }
        names.push(word);
      }
      return names.length === 0 ? ["MAPFILE"] : names;
    }
    case "printf": {
      const index = words.indexOf("-v");
      if (index < 0) return [];
      const target = words[index + 1];
      return target === null || target === undefined
        ? null
        : [target.replace(/\[.*$/, "")];
    }
    case "getopts": {
      const target = words[1];
      return target === null
        ? null
        : target === undefined
          ? []
          : [target, "OPTARG"];
    }
    case "wait": {
      const index = words.indexOf("-p");
      if (index < 0) return [];
      const target = words[index + 1];
      return target === null || target === undefined ? null : [target];
    }
    default:
      return [];
  }
}

/** Read one extract of a parsed Bash file. */
// implements REQ-kibi-tree-sitter-script-references
export function bashReferences(
  root: Node,
  extract: BashExtract,
  callee: string,
  file: string,
): BashRead {
  const members: string[] = [];
  const unresolved: UnresolvedRow[] = [];
  const env = extract === "env";
  const code = extract === "calls" || extract === "string_args" || env;
  const bindings = new Map<string, Binding[]>();
  const assoc = new Set<string>();
  const integers = new Set<string>();
  const bind = (
    name: string,
    node: Node,
    statement: Node,
    dominates: boolean,
    numeric: boolean,
  ): void => {
    const list = bindings.get(name) ?? [];
    list.push({
      name,
      start: node.startIndex,
      end: node.endIndex,
      dominates: dominates && direct(statement),
      scope: enclosingFunction(statement),
      numeric,
    });
    bindings.set(name, list);
  };

  // Pass 1: every place the script sets a variable, and its attributes.
  const collect = (node: Node): void => {
    switch (node.type) {
      case "variable_assignment": {
        const target = field(node, "name");
        const value = field(node, "value");
        const parent = node.parent;
        // `FOO=bar cmd` sets FOO for that command only.
        if (parent?.type === "command") break;
        // `local X=1` outside a function fails and sets nothing.
        if (
          parent?.type === "declaration_command" &&
          keyword(parent) === "local" &&
          enclosingFunction(parent) === null
        )
          break;
        const statement =
          parent?.type === "declaration_command" ? parent : node;
        if (target?.type === "variable_name")
          bind(
            target.text,
            node,
            statement,
            true,
            value?.type === "number" || value?.type === "arithmetic_expansion",
          );
        else if (target?.type === "subscript") {
          const base = field(target, "name");
          if (base !== null) bind(base.text, node, statement, false, false);
        }
        break;
      }
      case "declaration_command": {
        const flags = declarationFlags(node);
        const word = keyword(node);
        const local =
          word === "local" ||
          ((word === "declare" || word === "typeset") &&
            enclosingFunction(node) !== null &&
            !flags.includes("g"));
        for (const child of named(node)) {
          const name =
            child.type === "variable_name"
              ? child.text
              : child.type === "variable_assignment"
                ? (field(child, "name")?.text ?? null)
                : null;
          if (name === null) continue;
          if (flags.includes("A")) assoc.add(name);
          if (flags.includes("i")) integers.add(name);
          // `local X` gives the function an empty X of its own; outside a
          // function `local` fails.
          if (
            child.type === "variable_name" &&
            local &&
            enclosingFunction(node) !== null
          )
            bind(name, child, node, true, true);
        }
        break;
      }
      case "for_statement": {
        const variable = field(node, "variable");
        const values = node.childrenForFieldName("value");
        // `for i in 1 2 3`, `for i in {1..9}`: every value is a number.
        const numbers =
          values.length > 0 &&
          values.every(
            (value) =>
              value !== null &&
              (/^-?\d+$/.test(value.text) ||
                /^\{-?\d+\.\.-?\d+(?:\.\.-?\d+)?\}$/.test(value.text)),
          );
        if (variable !== null)
          bind(variable.text, variable, node, false, numbers);
        // `select` also sets REPLY.
        if (node.child(0)?.type === "select")
          bind("REPLY", node, node, false, false);
        break;
      }
      case "binary_expression":
      case "postfix_expression":
      case "unary_expression": {
        if (!inArithmetic(node)) break;
        const operator = field(node, "operator")?.text ?? "";
        if (!/^(?:[-+*/%&|^]|<<|>>)?=$|^\+\+$|^--$/.test(operator)) break;
        const target = field(node, "left") ?? named(node)[0];
        if (target?.type === "variable_name" || target?.type === "word")
          bind(target.text, target, node, false, true);
        break;
      }
      case "command": {
        let name = wordValue(field(node, "name"));
        let list = args(node);
        // `command read X` and `builtin read X` still set X.
        while ((name === "command" || name === "builtin") && list.length > 0) {
          const next = wordValue(list[0]);
          if (next === null || next.startsWith("-")) break;
          name = next;
          list = list.slice(1);
        }
        const bound = name === null ? [] : commandBinds(name, list);
        // `read`, `mapfile`, `printf -v` and `getopts` set their variables
        // even at end of input; `wait -p` only when a job ends.
        for (const variable of bound ?? [])
          bind(variable, node, node, name !== "wait", false);
        break;
      }
      case "unset_command": {
        const flags = named(node)
          .filter(
            (child) => child.type === "word" && child.text.startsWith("-"),
          )
          .map((child) => child.text);
        if (flags.some((flag) => flag.includes("f"))) break;
        // In a function, `unset X` may uncover a caller's X.
        const own = enclosingFunction(node) === null;
        for (const child of named(node)) {
          const name =
            child.type === "variable_name" ? child.text : wordValue(child);
          if (name !== null && /^[A-Za-z_]\w*$/.test(name))
            bind(name, child, node, own, true);
        }
        break;
      }

      case "expansion": {
        // `${X:=default}` sets X when it is unset.
        const match = /^\$\{(\w+):?=/.exec(node.text);
        if (match !== null) bind(match[1] as string, node, node, false, false);
        break;
      }
    }
    for (const child of named(node)) collect(child);
  };
  collect(root);

  /** Whether the value at `read` is certainly the script's own. */
  const dominated = (name: string, read: Node): boolean => {
    for (
      let current: Node | null = read.parent;
      current !== null;
      current = current.parent
    ) {
      if (current.type === "function_definition") break;
      if (current.type === "do_group") {
        const loop = current.parent;
        if (
          loop?.type === "for_statement" &&
          (field(loop, "variable")?.text === name ||
            (name === "REPLY" && loop.child(0)?.type === "select"))
        )
          return true;
        if (loop?.type === "while_statement") {
          const condition = field(loop, "condition");
          const command = condition?.type === "command" ? condition : null;
          if (
            command !== null &&
            wordValue(field(command, "name")) === "read" &&
            (commandBinds("read", args(command)) ?? []).includes(name)
          )
            return true;
        }
      }
      if (current.type === "c_style_for_statement") {
        const initializer = field(current, "initializer");
        if (
          initializer !== null &&
          initializer.id !== read.id &&
          field(initializer, "name")?.text === name &&
          !(
            read.startIndex >= initializer.startIndex &&
            read.endIndex <= initializer.endIndex
          )
        )
          return true;
      }
    }
    const scope = enclosingFunction(read);
    const outer = outermostFunction(read);
    for (const binding of bindings.get(name) ?? []) {
      if (!binding.dominates) continue;
      if (
        binding.scope !== null &&
        scope !== null &&
        binding.scope.id === scope.id &&
        binding.end <= read.startIndex
      )
        return true;
      // A top-level binding precedes a read below it, and any function
      // defined below it, which cannot run before it is defined.
      if (binding.scope === null && binding.end <= (outer ?? read).startIndex)
        return true;
    }
    return false;
  };

  /** Whether the read is certainly of the environment's value. */
  const certain = (name: string, read: Node): boolean => {
    const list = bindings.get(name) ?? [];
    if (list.length === 0) return true;
    if (outermostFunction(read) !== null) return false;
    for (const binding of list)
      if (binding.end <= read.startIndex) return false;
    // A loop around the read may set the variable before its next turn.
    for (let current = read.parent; current !== null; current = current.parent)
      if (
        /^(?:while|for|c_style_for)_statement$/.test(current.type) &&
        list.some(
          (binding) =>
            binding.start >= current.startIndex &&
            binding.end <= current.endIndex,
        )
      )
        return false;
    return true;
  };

  const maybe = new Map<string, UnresolvedRow>();
  const read = (name: string, node: Node, owner: Node): void => {
    if (!env || SHELL_VARIABLES.has(name)) return;
    if (dominated(name, node)) return;
    if (certain(name, node) && !MAYBE_SHELL_VARIABLES.has(name))
      members.push(name);
    else if (!maybe.has(name))
      maybe.set(name, {
        line: owner.startPosition.row + 1,
        text: `${name} may be read from the environment: ${at(owner).text}`.slice(
          0,
          80,
        ),
      });
  };

  /**
   * Whether every value the variable can hold at `place` is a number: it is
   * the script's own there and every value the script gives it is one.
   */
  const numeric = (name: string, place: Node): boolean => {
    if (NUMERIC_SHELL_VARIABLES.has(name) || NUMERIC_SPECIAL.has(name))
      return true;
    if (integers.has(name)) return true;
    if (!dominated(name, place)) return false;
    return (bindings.get(name) ?? []).every((binding) => binding.numeric);
  };

  /** A value evaluated as arithmetic may name another variable. */
  const evaluated = (name: string, place: Node, owner: Node): void => {
    if (!env || numeric(name, place)) return;
    unresolved.push({
      line: owner.startPosition.row + 1,
      text: `the value of ${name} is evaluated as arithmetic: ${at(owner).text}`.slice(
        0,
        80,
      ),
    });
  };

  const refuse = (node: Node): void => {
    unresolved.push(at(node));
  };

  /**
   * Bare names in an arithmetic context are variables, and every value the
   * context expands is evaluated as an expression in turn.
   */
  const arithmeticNames = (node: Node, owner: Node): void => {
    if (
      node.type === "variable_name" ||
      (node.type === "word" && /^[A-Za-z_]\w*$/.test(node.text))
    ) {
      read(node.text, node, owner);
      evaluated(node.text, node, owner);
      return;
    }
    if (
      node.type === "number" ||
      (node.type === "word" && /^\d+$/.test(node.text))
    )
      return;
    if (node.type === "variable_assignment") {
      const value = field(node, "value");
      if (value !== null) arithmeticNames(value, owner);
      return;
    }
    if (
      node.type === "binary_expression" &&
      field(node, "operator")?.text === "="
    ) {
      // `x = y + 1` sets x: only the right side is read.
      const right = field(node, "right");
      if (right !== null) arithmeticNames(right, owner);
      return;
    }
    if (node.type === "simple_expansion" || node.type === "expansion") {
      visit(node);
      if (node.text.startsWith("${#")) return;
      const target = parameter(node);
      const special = named(node)[0];
      if (target !== null) evaluated(target.name, node, owner);
      else if (
        special?.type === "special_variable_name" &&
        NUMERIC_SPECIAL.has(special.text)
      )
        return;
      else evaluated(node.text, node, owner);
      return;
    }
    if (
      node.type === "string" ||
      node.type === "raw_string" ||
      node.type === "string_content" ||
      node.type === "word"
    ) {
      // Quoted arithmetic text: its names are variables too.
      const parts = node.type === "string" ? named(node) : [node];
      for (const part of parts) {
        if (
          part.type !== "string_content" &&
          part.type !== "raw_string" &&
          part.type !== "word"
        ) {
          arithmeticNames(part, owner);
          continue;
        }
        for (const match of part.text.matchAll(/(?<![\w$#])[A-Za-z_]\w*/g)) {
          read(match[0], part, owner);
          evaluated(match[0], part, owner);
        }
      }
      return;
    }
    if (
      node.type === "command_substitution" ||
      node.type === "process_substitution"
    ) {
      visit(node);
      evaluated(node.text, node, owner);
      return;
    }
    for (const child of named(node)) arithmeticNames(child, owner);
  };

  /** The test command (`[[ ... ]]`, `[ ... ]`) an expression is part of. */
  const inTest = (node: Node): Node | null => {
    let current = node.parent;
    while (
      current !== null &&
      current.type !== "test_command" &&
      !/^(?:command|program|compound_statement|subshell|command_substitution|process_substitution|function_definition|arithmetic_expansion|expansion|redirected_statement|list|pipeline)$/.test(
        current.type,
      )
    )
      current = current.parent;
    return current?.type === "test_command" ? current : null;
  };

  /**
   * An unquoted `~` that starts a word reads HOME (`~-` reads OLDPWD); in an
   * assignment value it also may follow `:`.
   */
  const tilde = (node: Node): void => {
    if (!node.text.includes("~")) return;
    const parent = node.parent;
    const concat = parent?.type === "concatenation" ? parent : null;
    const first = concat === null || concat.child(0)?.id === node.id;
    const last =
      concat === null || concat.child(concat.childCount - 1)?.id === node.id;
    const holder = concat ?? node;
    const owner = holder.parent;
    let text = node.text;
    let starts = first;
    let colons =
      owner?.type === "variable_assignment" &&
      field(owner, "value")?.id === holder.id;
    if (
      owner?.type === "array" &&
      !first &&
      node.previousSibling?.text === "]" &&
      text.startsWith("=")
    ) {
      // `([1]=~/x)`: the element's value is an assignment value.
      text = text.slice(1);
      starts = true;
      colons = true;
    } else if (
      first &&
      owner?.type === "command" &&
      /^[A-Za-z_]\w*=/.test(text)
    ) {
      // `make P=~/x`: bash expands it as an assignment, a POSIX sh does not.
      if (/=~[+-]?(?:\/|:|$)|:~[+-]?(?:\/|:|$)/.test(text)) refuse(node);
      return;
    }
    const pattern = colons
      ? starts
        ? /(?:^|:)~([+-]?)(?=\/|:|$)/g
        : /:~([+-]?)(?=\/|:|$)/g
      : starts
        ? /^~([+-]?)(?=\/|$)/g
        : null;
    if (pattern === null) return;
    for (const match of text.matchAll(pattern)) {
      const end = (match.index ?? 0) + match[0].length;
      // `~"/x"`, `~$u`: a tilde-prefix with quoted or expanded text is not
      // expanded.
      if (end === text.length && !last) continue;
      if (match[1] === "+") continue;
      read(match[1] === "-" ? "OLDPWD" : "HOME", node, node);
    }
  };

  /**
   * `arr=([I]=v)`, `unset a[I]`: the grammar splits a subscript into
   * `[`, the index parts and `]`. The index of an indexed array is arithmetic.
   */
  const bracketIndex = (parts: Node[], owner: Node): number => {
    if (parts[0]?.text !== "[") return 0;
    const close = parts.findIndex(
      (part, index) =>
        index > 0 && part.type === "word" && part.text.startsWith("]"),
    );
    if (close < 0) return 0;
    for (const part of parts.slice(1, close)) arithmeticNames(part, owner);
    return close;
  };

  /**
   * What one command name means before Kibi follows it: true when the
   * command is handled (refused, or nothing more runs), false to go on.
   */
  const special = (
    node: Node,
    name: string,
    list: Node[],
    words: (string | null)[],
  ): boolean => {
    if (env && commandBinds(name, list) === null) {
      // `read "$name"`: a variable named at run time is set.
      refuse(node);
      return true;
    }
    if (env) {
      if (name === "printenv") {
        if (list.length === 0 || words.includes(null)) refuse(node);
        else
          for (const word of words)
            if (!(word as string).startsWith("-")) members.push(word as string);
      } else if (name === "envsubst") {
        const format = words.find(
          (word) => word !== null && !word.startsWith("-"),
        );
        if (format === undefined || words.includes(null)) refuse(node);
        else
          for (const match of (format as string).matchAll(
            /\$\{?([A-Za-z_]\w*)\}?/g,
          ))
            members.push(match[1] as string);
      } else if (
        name === "compgen" &&
        words.some(
          (word) => word === null || /^-(?:[a-z]*[ev][a-z]*|A)$/.test(word),
        )
      )
        refuse(node);
      else if (name === "set" && list.length === 0) refuse(node);
      else if (name === "let") {
        // `let` evaluates its words as arithmetic text Kibi does not parse.
        refuse(node);
        return true;
      } else if (name === "cd") {
        // A bare `cd` goes to $HOME, `cd -` to $OLDPWD.
        const operands = words.filter(
          (word) => word === null || !/^-[LPe@]+$/.test(word),
        );
        if (operands.length === 0) read("HOME", node, node);
        else if (operands[0] === "-") read("OLDPWD", node, node);
      } else if (name === "test" || name === "[") {
        for (let index = 0; index + 1 < words.length; index += 1)
          if (words[index] === "-v" || words[index] === "-R") {
            const target = words[index + 1];
            if (target === null || target === undefined) refuse(node);
            else
              read(target.replace(/\[.*$/, ""), list[index + 1] as Node, node);
          }
      } else if (DECLARATIONS.has(name) && node.type === "command") {
        // `builtin declare -n ref=X`: Kibi reads declarations it can see as such.
        refuse(node);
        return true;
      }
    }
    if (name === "eval") {
      refuse(node);
      return true;
    }
    if (name === "source" || name === ".") {
      const operands = words[0] === "--" ? list.slice(1) : list;
      const path = sourcedPath(operands[0], file);
      if (extract === "imports") {
        if (path === null) refuse(node);
        else members.push(path);
        return true;
      }
      // The sourced file may read or set any variable.
      if (env) {
        refuse(node);
        return true;
      }
      // Code read from a stream is the script's own, unseen.
      const stream =
        operands[0]?.type === "process_substitution" ||
        /^\/dev\/(?:stdin|fd\/)/.test(path ?? "");
      if (stream || operands.length === 0) {
        refuse(node);
        return true;
      }
    }
    if (RUNNERS.has(name)) {
      // A runner cannot run `source`; for env only a shell it may start
      // reads variables Kibi does not see.
      if (
        extract === "imports" ||
        (env &&
          !words.some(
            (word) =>
              word === null ||
              SHELLS.has(posix.basename(word)) ||
              CODE_COMMANDS.has(posix.basename(word)),
          ))
      )
        return true;
      refuse(node);
      return true;
    }
    if (
      CODE_COMMANDS.has(name) ||
      (name === "alias" && list.length > 0) ||
      ((name === "mapfile" || name === "readarray") &&
        words.some((word) => word === null || /^-[^-]*C/.test(word))) ||
      (name === "hash" &&
        words.some((word) => word === null || /^-[^-]*p/.test(word)))
    ) {
      refuse(node);
      return true;
    }
    if (name === "trap") {
      const actions = words[0] === "--" ? words.slice(1) : words;
      const action = actions[0];
      if (
        action === undefined ||
        action === "-" ||
        action === "" ||
        action === "-p" ||
        action === "-l"
      ) {
        // prints or resets traps
      } else if (action !== null && /^[A-Za-z_][\w-]*$/.test(action)) {
        if (extract === "calls") members.push("trap", action);
        if (extract === "string_args" && calleeMatches("trap", callee))
          members.push(action);
        return true;
      } else {
        refuse(node);
        return true;
      }
    }
    return false;
  };

  /** A wrapper's short options clustered in one word (`sudo -nE`), or null. */
  const cluster = (
    wrapper: Wrapper,
    word: string,
  ): "flags" | "argument" | "attached" | "noCommand" | "code" | null => {
    if (!/^-[A-Za-z0-9]{2,}$/.test(word)) return null;
    const letters = word.slice(1);
    for (let index = 0; index < letters.length; index += 1) {
      const option = `-${letters[index]}`;
      if (wrapper.noCommand?.has(option)) return "noCommand";
      if (wrapper.code?.has(option)) return "code";
      if (wrapper.args.has(option))
        return index === letters.length - 1 ? "argument" : "attached";
      if (!wrapper.flags.has(option)) return null;
    }
    return "flags";
  };

  /** One command and what it runs: `sudo env X=1 rm` runs all three. */
  const chain = (
    node: Node,
    first: string,
    firstList: Node[],
    firstWords: (string | null)[],
    depth: number,
    fromFind = false,
  ): void => {
    let name = first;
    let rest = firstList;
    let restWords = firstWords;
    // `xargs curl` appends (or with -I places) words read from its input.
    let fromXargs = false;
    for (let hops = 0; hops < 8 && depth < 4; hops += 1) {
      if (special(node, name, rest, restWords)) return;
      if (extract === "calls") {
        members.push(name);
        if (name.includes("/")) members.push(posix.basename(name));
      }
      if (extract === "string_args" && calleeMatches(name, callee)) {
        const first = rest[0];
        const value = restWords[0];
        if (fromXargs || (fromFind && value?.includes("{}") === true))
          refuse(node);
        else if (first !== undefined) {
          if (value === null || value === undefined) refuse(node);
          else members.push(value);
        }
      }
      const base = posix.basename(name);
      if (base === "busybox" || base === "toybox") {
        // The applet named next runs.
        const applet = restWords[0];
        if (applet === undefined) return;
        if (applet === null) {
          refuse(node);
          return;
        }
        name = applet;
        rest = rest.slice(1);
        restWords = restWords.slice(1);
        continue;
      }
      if (SHELLS.has(base)) {
        // A shell runs a script file, or code from `-c` or its input.
        let script = false;
        for (let index = 0; index < rest.length; index += 1) {
          const word = restWords[index];
          if (word === null || word === undefined) break;
          if (word === "-s" || /^-[A-Za-z]*c[A-Za-z]*$/.test(word)) break;
          if (SHELL_OPTION_ARGS.has(word)) {
            index += 1;
            continue;
          }
          if (word === "--") continue;
          if (/^[-+]/.test(word)) continue;
          script = true;
          break;
        }
        if (!script) refuse(node);
        return;
      }
      if (base === "find") {
        // Every `-exec` runs its command, up to `;` or `+`.
        for (let index = 0; index < restWords.length; index += 1) {
          const word = restWords[index];
          if (word === null) {
            // `"$dir"` is one word; it could be `-exec` only with a command
            // and its `;` after it. An unquoted expansion may be several words.
            const quoted = rest[index]?.type === "string";
            if (
              quoted &&
              !restWords
                .slice(index + 1)
                .some((later) => later === ";" || later === "+")
            )
              continue;
            refuse(node);
            return;
          }
          if (!/^-(?:exec|execdir|ok|okdir)$/.test(word as string)) continue;
          let end = index + 1;
          while (
            end < restWords.length &&
            restWords[end] !== ";" &&
            restWords[end] !== "+"
          )
            end += 1;
          const target = restWords[index + 1];
          if (target === null || target === undefined) {
            refuse(node);
            return;
          }
          chain(
            node,
            target,
            rest.slice(index + 2, end),
            restWords.slice(index + 2, end),
            depth + 1,
            true,
          );
          index = end;
        }
        return;
      }
      if (
        base === "ip" &&
        restWords[0] === "netns" &&
        restWords[1] === "exec"
      ) {
        const target = restWords[3];
        if (target === null || target === undefined) {
          refuse(node);
          return;
        }
        name = target;
        rest = rest.slice(4);
        restWords = restWords.slice(4);
        continue;
      }
      const wrapper = WRAPPERS.get(base);
      if (wrapper === undefined) return;
      if (base === "xargs") fromXargs = true;
      let index = 0;
      let operands = wrapper.operands ?? 0;
      let next: string | null = null;
      for (; index < rest.length; index += 1) {
        const word = restWords[index];
        if (word === null || word === undefined) {
          refuse(node);
          return;
        }
        if (word === "--") {
          index += 1;
          next = restWords[index] ?? null;
          if (index < rest.length && next === null) {
            refuse(node);
            return;
          }
          break;
        }
        const option =
          word.includes("=") && word.startsWith("--")
            ? word.slice(0, word.indexOf("="))
            : word;
        if (wrapper.noCommand?.has(option)) return;
        if (wrapper.code?.has(option)) {
          refuse(node);
          return;
        }
        if (word.startsWith("-") && word.length > 1) {
          if (wrapper.args.has(word)) index += 1;
          else if (wrapper.args.has(option)) {
            // --name=value
          } else if (wrapper.flags.has(word)) {
            // flag
          } else if (wrapper.numericFlags === true && /^-\d+$/.test(word)) {
            // nice -10
          } else {
            const kind = cluster(wrapper, word);
            if (kind === "noCommand") return;
            if (kind === "argument") index += 1;
            else if (kind === "flags" || kind === "attached") {
              // -nE, or -ofoo: an option with its argument attached
            } else if (
              kind === null &&
              word.length > 2 &&
              !word.startsWith("--") &&
              wrapper.args.has(word.slice(0, 2))
            ) {
              // -ofoo
            } else {
              refuse(node);
              return;
            }
          }
          continue;
        }
        if (wrapper.assignments === true && /^[A-Za-z_]\w*=/.test(word))
          continue;
        if (operands > 0) {
          operands -= 1;
          continue;
        }
        next = word;
        break;
      }
      if (next === null) {
        if (wrapper.fallback !== undefined) {
          name = wrapper.fallback;
          rest = [];
          restWords = [];
          continue;
        }
        if (wrapper.shellWithout === true) refuse(node);
        else if (env && base === "env") refuse(node);
        return;
      }
      name = next;
      rest = rest.slice(index + 1);
      restWords = restWords.slice(index + 1);
    }
    refuse(node);
  };

  /** One command: its name, what it wraps, and what its words mean. */
  const command = (node: Node): void => {
    const nameNode = field(node, "name");
    if (nameNode === null) return;
    const list = args(node);
    const name = wordValue(nameNode);
    if (name === null) {
      if (extract !== "imports" && extract !== "env") refuse(node);
      return;
    }
    chain(
      node,
      name,
      list,
      list.map((word) => wordValue(word)),
      0,
    );
  };

  const visit = (node: Node): void => {
    switch (node.type) {
      case "word":
        if (/(?:^|[^\\])\n/.test(node.text)) {
          // The grammar folded the next line into this word (a line that
          // starts with `\`): Kibi cannot tell where that command starts.
          refuse(node);
          return;
        }
        if (env) {
          tilde(node);
          if (
            /\/proc\/(?:self|\$\$|\$\{?BASHPID\}?|\d+|\*|\[)[^\s]*\/environ\b/.test(
              node.text,
            )
          )
            refuse(node);
        }
        break;
      case "string_content":
      case "raw_string":
        if (env && /\/proc\/[^\s'"]*\/environ\b/.test(node.text)) refuse(node);
        break;
      case "string":
      case "concatenation":
        // `"/proc/$$/environ"`: the path is split across parts.
        if (
          env &&
          node.parent?.type !== "string" &&
          node.parent?.type !== "concatenation" &&
          /\/proc\/\S*\/environ\b/.test(node.text)
        )
          refuse(node);
        break;
      case "heredoc_body": {
        // Any quoted character in the delimiter (`'EOF'`, `E\OF`) leaves the
        // body as text.
        const quotedDelimiter = /['"\\]/.test(
          node.parent?.namedChildren.find(
            (child) => child.type === "heredoc_start",
          )?.text ?? "",
        );
        if (quotedDelimiter) return;
        if (code)
          for (const part of named(node))
            if (part.type === "heredoc_content" && /`|\$\(/.test(part.text))
              refuse(part);
        break;
      }
      case "command":
        command(node);
        break;
      case "array": {
        if (!env) break;
        const owner = node.parent;
        const target =
          owner?.type === "variable_assignment" ? field(owner, "name") : null;
        if (target === null || assoc.has(target.text)) break;
        for (const element of named(node)) {
          if (element.type !== "concatenation") {
            visit(element);
            continue;
          }
          const parts = named(element);
          const close = bracketIndex(parts, element);
          for (const part of close > 0 ? parts.slice(close) : parts)
            visit(part);
        }
        return;
      }
      case "unset_command": {
        if (!env) break;
        const children = named(node);
        for (let index = 0; index < children.length; index += 1) {
          const child = children[index] as Node;
          const next = children[index + 1];
          if (child.type === "word" && /^-/.test(child.text)) continue;
          if (child.type === "variable_name") {
            if (
              next?.type === "concatenation" &&
              next.startIndex === child.endIndex
            ) {
              // `unset a[I]`; the key of an associative array is text.
              const parts = named(next);
              const close = assoc.has(child.text)
                ? 0
                : bracketIndex(parts, node);
              for (const part of close > 0 ? parts.slice(close + 1) : parts)
                visit(part);
              index += 1;
            }
            continue;
          }
          const value = wordValue(child);
          if (value === null) {
            // `unset "$name"`: Kibi cannot tell which variable goes.
            refuse(child);
            continue;
          }
          const subscript = /^([A-Za-z_]\w*)\[(.*)\]$/s.exec(value);
          if (
            subscript !== null &&
            !assoc.has(subscript[1] as string) &&
            !/^[@*]$/.test(subscript[2] as string)
          )
            for (const match of (subscript[2] as string).matchAll(
              /(?<![\w$#])[A-Za-z_]\w*/g,
            )) {
              read(match[0], child, node);
              evaluated(match[0], child, node);
            }
          else if (subscript === null && !/^[A-Za-z_]\w*$/.test(value))
            refuse(child);
        }
        return;
      }
      case "declaration_command": {
        if (!env) break;
        const flags = declarationFlags(node);
        const children = named(node).filter(
          (child) => !(child.type === "word" && /^[-+]/.test(child.text)),
        );
        if (flags.includes("n")) refuse(node);
        else if (
          children.length === 0 &&
          !flags.includes("f") &&
          !flags.includes("F")
        )
          refuse(node);
        for (const child of children)
          if (
            child.type !== "variable_name" &&
            child.type !== "variable_assignment"
          )
            refuse(child);
          else if (flags.includes("p") && child.type === "variable_name")
            read(child.text, child, node);
        for (const child of children)
          if (child.type === "variable_assignment") {
            const target = field(child, "name")?.text ?? "";
            if (child.text.startsWith(`${target}+=`)) read(target, child, node);
            const name = field(child, "name");
            if (name?.type === "subscript") {
              const base = field(name, "name")?.text ?? "";
              const index = field(name, "index");
              if (
                index !== null &&
                !assoc.has(base) &&
                !/^[@*]$/.test(index.text)
              )
                arithmeticNames(index, child);
            }
            if (integers.has(target)) {
              const value = field(child, "value");
              if (value !== null) arithmeticNames(value, child);
            }
          }
        break;
      }
      case "variable_assignment": {
        if (!env || node.parent?.type === "declaration_command") break;
        const target = field(node, "name");
        const name =
          target?.type === "subscript"
            ? (field(target, "name")?.text ?? "")
            : (target?.text ?? "");
        if (
          node.text.startsWith(`${name}+=`) ||
          (target?.type === "subscript" && node.text.includes("]+="))
        )
          read(name, target as Node, node);
        if (target?.type === "subscript" && !assoc.has(name)) {
          const index = field(target, "index");
          if (index !== null) arithmeticNames(index, node);
        }
        if (integers.has(name)) {
          const value = field(node, "value");
          if (value !== null) arithmeticNames(value, node);
        }
        break;
      }
      case "simple_expansion": {
        const target = parameter(node);
        if (target !== null) read(target.name, target.at, node);
        break;
      }
      case "expansion": {
        if (node.text.startsWith("${!")) {
          const first = named(node)[0];
          const keys =
            first?.type === "subscript" &&
            /^[@*]$/.test(field(first, "index")?.text ?? "");
          if (!keys && env) {
            refuse(node);
            return;
          }
        }
        const target = parameter(node);
        if (target !== null) read(target.name, target.at, node);
        const first = named(node)[0];
        if (first?.type === "subscript") {
          const index = field(first, "index");
          if (index !== null && !/^[@*]$/.test(index.text)) {
            if (target !== null && assoc.has(target.name)) visit(index);
            else arithmeticNames(index, node);
          }
        }
        // `${s:i:2}`: offsets and lengths are arithmetic.
        for (const child of named(node).slice(1))
          if (child.type === "variable_name") arithmeticNames(child, node);
          else visit(child);
        return;
      }
      case "subscript": {
        const base = field(node, "name");
        const index = field(node, "index");
        if (
          base !== null &&
          index !== null &&
          !assoc.has(base.text) &&
          !/^[@*]$/.test(index.text) &&
          node.parent?.type !== "expansion" &&
          node.parent?.type !== "variable_assignment"
        )
          arithmeticNames(index, node);
        break;
      }
      case "unary_expression": {
        const operator = field(node, "operator")?.text;
        if ((operator === "-v" || operator === "-R") && inTest(node)) {
          const operand = named(node).find(
            (child) => child.type !== "test_operator",
          );
          const name = operand === undefined ? null : wordValue(operand);
          if (name === null) {
            if (env) refuse(node);
          } else read(name.replace(/\[.*$/, ""), operand as Node, node);
          return;
        }
        break;
      }
      case "binary_expression": {
        const operator = field(node, "operator")?.text ?? "";
        const test = inTest(node)?.text.startsWith("[[") === true;
        if (test && /^-(?:eq|ne|lt|le|gt|ge)$/.test(operator)) {
          for (const side of [field(node, "left"), field(node, "right")])
            if (side !== null) arithmeticNames(side, node);
        }
        break;
      }
      case "c_style_for_statement": {
        for (const part of ["initializer", "condition", "update"]) {
          const child = field(node, part);
          if (child !== null) arithmeticNames(child, node);
        }
        const body = field(node, "body");
        if (body !== null) visit(body);
        return;
      }
    }
    if (arithmetic(node)) {
      arithmeticNames(node, node);
      return;
    }
    for (const child of named(node)) visit(child);
  };
  visit(root);
  for (const [name, row] of maybe)
    if (!members.includes(name)) unresolved.push(row);
  return { members, unresolved };
}

/** A command name is the callee when it is, or its file name is, the same. */
function calleeMatches(name: string, callee: string): boolean {
  return callee !== "" && (name === callee || posix.basename(name) === callee);
}
