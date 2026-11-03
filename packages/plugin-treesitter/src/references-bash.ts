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
  "BASH_LINENO",
  "BASH_REMATCH",
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
  "PIPESTATUS",
  "PPID",
  "PWD",
  "RANDOM",
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
  "BASH_EXECUTION_STRING",
  "OLDPWD",
  "SECONDS",
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
  "rbash",
  "ksh93",
  "pdksh",
  "posh",
  "fish",
  "csh",
  "tcsh",
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
  /** The command it runs when none is given (`xargs` runs `echo`). */
  readonly fallback?: string;
  /** A shell is started when no command is given (`sudo -s`, `chroot`). */
  readonly shellWithout?: boolean;
  /** A number is an option (`nice -10`). */
  readonly numericFlags?: boolean;
}

const set = (...items: string[]): ReadonlySet<string> => new Set(items);

/**
 * Commands that run another command named in their arguments. An option
 * that runs its argument as shell code (`sudo -s`, `env -S`, `flock -c`) is
 * refused like any option a wrapper does not list.
 */
/** `ip` options that take the next word as their argument. */
const IP_ARGUMENT_OPTIONS = ["netns", "family", "loops", "rcvbuf", "batch"];
/** `ip` options without an argument whose prefixes overlap the ones above. */
const IP_FLAG_OPTIONS = ["force", "brief", "resolve"];

const WRAPPERS: ReadonlyMap<string, Wrapper> = new Map<string, Wrapper>([
  [
    "sudo",
    {
      args: set(
        "-u",
        "-g",
        "-C",
        "-D",
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
        "-R",
        "--chroot",
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
    },
  ],
  ["doas", { args: set("-u", "-C"), flags: set("-n") }],
  [
    "env",
    {
      args: set("-u", "-C", "--unset", "--chdir", "--split-string-off"),
      flags: set("-i", "-v", "--ignore-environment", "--debug", "-"),
      assignments: true,
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
        "-w",
        "-x",
        "-y",
        "-Z",
      ),
      noCommand: set("-V", "--version", "-h", "--help"),
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
        "-w",
        "-D",
      ),
      flags: set("-c", "-C", "-d", "-f", "-i", "-r", "-S", "-t", "-T", "-b"),
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

/**
 * Programs that run code they are handed as text. busybox runs the applet
 * named next, and jq has its own check.
 */
const INTERPRETERS = new Set([
  "awk",
  "gawk",
  "mawk",
  "nawk",
  "python",
  "python2",
  "python3",
  "perl",
  "ruby",
  "node",
  "nodejs",
  "deno",
  "bun",
  "php",
  "lua",
  "tclsh",
  "Rscript",
  "osascript",
]);

/** Commands that print the whole environment when a runner starts them. */
const ENV_DUMPERS = new Set([
  "env",
  "printenv",
  "set",
  "export",
  "declare",
  "typeset",
  "compgen",
  "ps",
]);

/**
 * Text another language reads the environment through: awk's `ENVIRON`,
 * jq's `env` and `$ENV`, Perl's `%ENV`, Python's `os.environ`.
 */
const FOREIGN_ENV =
  /\bENVIRON\b|\$ENV\b|%ENV\b|\benviron\b|\bgetenv\b|process\.env\b|\benv\.[A-Za-z_]|\benv\[/;

/**
 * `read 'a[$(rm -rf x)]'`, `unset 'a[$(rm -rf x)]'`: a subscript bash
 * evaluates runs the code in it.
 */
const SUBSCRIPT_CODE = /\[[^\]]*(?:\$\(|`|\$\[)/;

/** Commands that set variables: through `command` or `builtin` they still do. */
const DECLARATIONS = new Set([
  "declare",
  "typeset",
  "local",
  "export",
  "readonly",
  "unset",
]);

/** Whether a word holds a brace expansion: `{a,b}` or `{1..3}`. */
function braces(text: string): boolean {
  return /\{[^{}]*(?:,|\.\.)[^{}]*\}/.test(text.replace(/\\./g, "__"));
}

/**
 * The literal text a word stands for after quote removal, or null when the
 * shell would change it (an expansion, a glob, a brace or tilde expansion).
 */
function wordValue(node: Node): string | null {
  switch (node.type) {
    case "command_name":
      // The grammar gives a command name one word.
      return wordValue(named(node)[0] as Node);
    case "word": {
      const text = node.text;
      // An unescaped glob character or expansion.
      // A line splice in a command is refused before its words are read.
      if (
        text.split(/\\./s).some((part) => /[*?[$`]/.test(part)) ||
        braces(text) ||
        text.startsWith("~")
      )
        return null;
      return text.replace(/\\(.)/gs, "$1");
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
  const list = node.childrenForFieldName("argument");
  // `curl >out https://x`: the grammar reads the words after a redirect as
  // more destinations of it, but only the first is the redirect's. Only a
  // redirected statement has redirects.
  const statement = node.parent as Node;
  // `sudo <<A 2>/dev/null rm -rf x`: the grammar nests the redirects that
  // follow a here-document start inside it, after the words it holds.
  const redirects: Node[] = [];
  const nested = (owner: Node): void => {
    for (const child of owner.childrenForFieldName("redirect")) {
      redirects.push(child);
      nested(child);
    }
  };
  nested(statement);
  for (const redirect of redirects) {
    list.push(...redirect.childrenForFieldName("destination").slice(1));
    // `sudo <<EOF rm -rf x`: the words after a here-document start are the
    // command's (no other redirect has arguments).
    list.push(...redirect.childrenForFieldName("argument"));
  }
  // `curl {fd}>/tmp/x URL`: `{fd}` names the redirect's descriptor.
  return list.filter(
    (word) =>
      !(
        /^\{[A-Za-z_]\w*\}$/.test(word.text) &&
        redirects.some((redirect) => redirect.startIndex === word.endIndex)
      ),
  );
}

/** The parameter an expansion reads: its name, or null for a special one. */
function parameter(node: Node): { name: string; at: Node } | null {
  const first = named(node)[0];
  if (first === undefined) return null;
  // `$1`, `${10}`: a positional parameter.
  if (first.type === "variable_name")
    return /^\d/.test(first.text) ? null : { name: first.text, at: first };
  // A subscript names its array; a special parameter has no name.
  const base = field(first, "name");
  return base === null ? null : { name: base.text, at: base };
}

/**
 * The directory a script-relative `source` path starts from:
 * `$(dirname "$0")`, `$(dirname "${BASH_SOURCE[0]}")`, `${BASH_SOURCE%/*}`.
 */
const SCRIPT_DIR =
  /^(?:\$\(dirname \$\{?(?:0|BASH_SOURCE(?:\[0\])?)\}?\)|\$\{(?:0|BASH_SOURCE(?:\[0\])?)%\/\*\})(\/[\w./-]+)$/;

/** The literal name of a command (every command has one), or null. */
function commandName(node: Node): string | null {
  return wordValue(field(node, "name") as Node);
}

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
  readonly node: Node;
  readonly start: number;
  readonly end: number;
  /** Runs before anything after it in its block: a direct statement, `=`. */
  readonly dominates: boolean;
  /** The function whose body holds it, or null at top level. */
  readonly scope: Node | null;
  readonly numeric: boolean;
}

/**
 * Whether the script runs `cd`, `pushd` or `popd` in its own shell before
 * `before` (one inside `$(...)` or `( ... )` changes a subshell's folder).
 */
function changesDirectory(node: Node, before: number): boolean {
  // rationale: no node that changes directory starts where the sourcing
  // command does, so `>` and `>=` stop at the same nodes.
  // Stryker disable next-line EqualityOperator
  if (node.startIndex >= before) return false;
  if (
    node.type === "command_substitution" ||
    node.type === "subshell" ||
    node.type === "process_substitution"
  )
    return false;
  if (
    node.type === "command" &&
    /^(?:cd|pushd|popd)$/.test((field(node, "name") as Node).text)
  )
    return true;
  return named(node).some((child) => changesDirectory(child, before));
}

/** Whether `node` is `outer` or inside it. */
function inside(node: Node, outer: Node): boolean {
  for (
    let current: Node | null = node;
    current !== null;
    current = current.parent
  )
    if (current.id === outer.id) return true;
  return false;
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
  // Only statements and their lists and redirections come here.
  const parent = node.parent as Node;
  // `X=1 &` runs in a background subshell.
  if (node.nextSibling?.type === "&") return false;
  if (parent.type === "program") return true;
  // A command with redirections runs like the command, unless opening a
  // file can fail first (`read X < missing`): input from a here-document,
  // a here-string or a process substitution always opens. The grammar gives
  // a here-string no redirect field.
  if (parent.type === "redirected_statement")
    return (
      parent.childrenForFieldName("redirect").every((redirect) => {
        if (redirect.type === "heredoc_redirect") return true;
        // `3<&-` closes a descriptor: it has no destination.
        const destination = field(redirect, "destination");
        return (
          destination !== null &&
          (destination.text === "/dev/null" ||
            destination.type === "process_substitution")
        );
      }) && direct(parent)
    );
  // The first command of `a && b` always runs.
  if (parent.type === "list")
    return (named(parent)[0] as Node).id === node.id && direct(parent);
  return (
    parent.type === "compound_statement" &&
    (parent.parent as Node).type === "function_definition"
  );
}

/** Whether a node is inside an arithmetic context or a C-style `for`. */
function inArithmetic(node: Node): boolean {
  // Every expression is inside an arithmetic context, a command or a test.
  let current = node.parent as Node;
  while (!arithmetic(current) && !ARITHMETIC_ENDS.has(current.type))
    current = current.parent as Node;
  return arithmetic(current) || current.type === "c_style_for_statement";
}

/** Operators that set the variable on their left. */
const ASSIGNMENTS = new Set([
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<=",
  ">>=",
  "++",
  "--",
]);

/** Loops that may run a statement again after a later one. */
const LOOPS = new Set([
  "while_statement",
  "for_statement",
  "c_style_for_statement",
]);

/** The operators of `[[ ]]` that compare numbers. */
const ARITHMETIC_TESTS = new Set(["-eq", "-ne", "-lt", "-le", "-gt", "-ge"]);

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

/** The option words of a declaration (`-r`, `-iA`), joined: their letters. */
function declarationFlags(node: Node): string {
  return named(node)
    .filter((child) => /^[-+]/.test(child.text))
    .map((child) => child.text)
    .join();
}

/** The builtin a declaration runs: `declare`, `local`, `export`, ... */
function keyword(node: Node): string {
  return (node.child(0) as Node).type;
}

/** `read`'s options that take an argument; `-a` names an array. */
const READ_ARGS = new Set(["a", "d", "i", "n", "N", "p", "t", "u"]);
const MAPFILE_ARGS = new Set(["-d", "-n", "-O", "-s", "-u", "-C", "-c"]);

/** No variable. */
// rationale: a name in this list is bound, and no script can read a variable
// whose name Stryker writes here, so no test can tell the lists apart.
// Stryker disable next-line ArrayDeclaration
const NONE: readonly string[] = [];

/**
 * The variable names a binding command sets (`read A B`, `mapfile -t L`,
 * `printf -v OUT`, `getopts s NAME`, `wait -p J`), or null when one is not
 * literal (`read "$name"`).
 */
function commandBinds(
  name: string | null,
  list: Node[],
): readonly string[] | null {
  const words = list.map((node) => wordValue(node));
  switch (name) {
    case "read": {
      const names: string[] = [];
      let options = true;
      for (let index = 0; index < words.length; index += 1) {
        const word = words[index] as string | null;
        if (options && word === "--") {
          options = false;
          continue;
        }
        if (
          options &&
          word !== null &&
          word.startsWith("-") &&
          word.length > 1
        ) {
          // `-rp PROMPT`: options cluster, and the first that takes an
          // argument takes the rest of the word or the next word.
          // With none (at -1), `option` is the `-` and the rest of the word
          // is attached: nothing is read.
          const at = [...word.slice(1)].findIndex((letter) =>
            READ_ARGS.has(letter),
          );
          const attached = word.slice(at + 2);
          const value = attached !== "" ? attached : words[index + 1];
          if (attached === "") index += 1;
          const option = word[at + 1];
          if (option === "a") {
            if (value === null || value === undefined) return null;
            names.push(value);
          }
          // `read -t 0` only tests for input and sets nothing.
          if (option === "t") {
            if (value === null || value === undefined) return null;
            if (/^0*(?:\.0*)?$/.test(value)) return NONE;
          }
          continue;
        }
        if (word === null) return null;
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
        const word = words[index] as string | null;
        if (word === null) return null;
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
      if (index < 0) return NONE;
      const target = words[index + 1];
      return target === null || target === undefined
        ? null
        : [arrayName(target)];
    }
    case "getopts": {
      const target = words[1];
      return target === null
        ? null
        : target === undefined
          ? NONE
          : [target, "OPTARG"];
    }
    case "wait": {
      const index = words.indexOf("-p");
      if (index < 0) return NONE;
      const target = words[index + 1];
      return target === null || target === undefined ? null : [target];
    }
  }
  return NONE;
}

/** The array a subscripted name names: `a` for `a[1]`. */
function arrayName(target: string): string {
  return target.split("[")[0] as string;
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
  /**
   * Names a function declares local: `unset NAME` in another function
   * removes the caller's local, and the caller then reads the environment's.
   */
  const localNames = new Set<string>();
  /**
   * Text that sets what a command name runs or what tracing runs:
   * `BASH_CMDS[ls]=/bin/rm` (also through `printf -v` or `read`), aliases,
   * `BASH_ARGV0`, and a prompt variable whose value is not plain text.
   */
  const rebinds =
    /\b(?:BASH_CMDS|BASH_ALIASES|BASH_ARGV0)\b/.exec(root.text) ??
    [...root.text.matchAll(/(?<![$\w{])(?:PS[0-4]|PROMPT_COMMAND)\b/g)].find(
      (match) =>
        !/^=(?:'[^'$`\\]*'|"[^"$`\\]*"|[^\s'"$`\\;&|()<>]*)(?=[\s;&|)]|$)/.test(
          root.text.slice((match.index as number) + match[0].length),
        ),
    ) ??
    null;
  /** A row at the line of a match in the script's text. */
  const textRow = (
    match: RegExpExecArray | RegExpMatchArray,
  ): UnresolvedRow => {
    const line = root.text.slice(0, match.index as number).split("\n").length;
    return {
      line,
      text: (root.text.split("\n")[line - 1] as string).trim().slice(0, 80),
    };
  };
  if (code && rebinds !== null) unresolved.push(textRow(rebinds));
  /**
   * Text through which code handed to another interpreter reads the
   * environment, wherever it sits (a word, a here-document, a variable):
   * awk's `ENVIRON`, Perl's `%ENV` and `-MEnv`, Python's `os.environ`,
   * Ruby's `ENV[...]`, C's `getenv(...)`, a `/proc/<pid>/environ` path or
   * a `/proc` path Kibi cannot follow (a glob, a variable, `cd /proc`).
   */
  const foreignEnv = !env
    ? null
    : /\bENVIRON\b|%ENV\b|\$ENV\b|\bos\.environb\b|\bos\.getenv\b|\bgetenv\s*\(|process\.env\b|\bENV\s*(?:\[|\.fetch\b)|-MEnv\b|\benviron\b|\/proc\/[^\s;&|<>)'"]*(?:env|[*?[$]|\/\.\.?\/|\/\/)|\/proc\/thread-self\b|\b(?:cd|pushd)\s+["']?\/proc\b/.exec(
        root.text,
      );
  if (foreignEnv !== null) unresolved.push(textRow(foreignEnv));
  const bindings = new Map<string, Binding[]>();
  const assoc = new Set<string>();
  const indexedToo = new Set<string>();
  /** Where a top-level `declare -A NAME` first makes NAME associative. */
  const assocAt = new Map<string, number>();
  const integers = new Set<string>();
  const noBindings: Binding[] = [];
  const bindingsOf = (name: string): Binding[] =>
    bindings.get(name) ?? noBindings;
  /**
   * `statement` runs the binding: it dominates what follows it in its block
   * when it is a direct statement. A binding with no statement never does.
   */
  const bind = (
    name: string,
    node: Node,
    statement: Node | null,
    numeric: boolean,
  ): void => {
    bindings.set(name, [
      ...bindingsOf(name),
      {
        name,
        node,
        start: node.startIndex,
        end: node.endIndex,
        dominates: statement !== null && direct(statement),
        scope: enclosingFunction(node),
        numeric,
      },
    ]);
  };

  // Pass 1: every place the script sets a variable, and its attributes.
  const collect = (node: Node): void => {
    switch (node.type) {
      case "variable_assignment": {
        const target = field(node, "name") as Node;
        const value = field(node, "value");
        const parent = node.parent as Node;
        // `FOO=bar cmd` sets FOO for that command only.
        if (parent.type === "command") break;
        // `local X=1` outside a function fails and sets nothing.
        if (keyword(parent) === "local" && enclosingFunction(parent) === null)
          break;
        const statement = parent.type === "declaration_command" ? parent : node;
        if (target.type === "variable_name")
          bind(
            target.text,
            node,
            statement,
            value?.type === "number" || value?.type === "arithmetic_expansion",
          );
        // `a[1]=x` sets one element.
        else bind((field(target, "name") as Node).text, node, null, false);
        break;
      }
      case "declaration_command": {
        const flags = declarationFlags(node);
        const word = keyword(node);
        const inFunction = enclosingFunction(node) !== null;
        // `local`, and `declare` or `typeset` without -g, in a function.
        const local =
          inFunction &&
          (word === "local" ||
            ((word === "declare" || word === "typeset") &&
              !flags.includes("g")));
        for (const child of named(node)) {
          if (
            child.type !== "variable_name" &&
            child.type !== "variable_assignment"
          )
            continue;
          const name =
            child.type === "variable_name"
              ? child.text
              : (field(child, "name") as Node).text;
          // `declare HOME=/srv` in a function is a local too.
          if (local) localNames.add(name);
          if (flags.includes("A")) {
            assoc.add(name);
            if (!inFunction)
              assocAt.set(
                name,
                Math.min(
                  assocAt.get(name) ?? Number.POSITIVE_INFINITY,
                  node.startIndex,
                ),
              );
          }
          // Declared without -A elsewhere (a local indexed array, a scalar):
          // which declaration a subscript meets is the run's.
          else indexedToo.add(name);
          if (flags.includes("i")) integers.add(name);
          // `local X` gives the function an empty X of its own; outside a
          // function `local` fails.
          // An assignment binds its name as an assignment too.
          if (local) bind(name, child, node, true);
        }
        break;
      }
      case "for_statement": {
        const variable = field(node, "variable") as Node;
        const values = node.childrenForFieldName("value");
        // `for i in 1 2 3`, `for i in {1..9}`: every value is a number.
        const numbers =
          values.length > 0 &&
          values.every(
            (value) =>
              /^-?\d+$/.test(value.text) ||
              /^\{-?\d+\.\.-?\d+(?:\.\.-?\d+)?\}$/.test(value.text),
          );
        bind(variable.text, variable, null, numbers);
        // `select` also sets REPLY.
        if ((node.child(0) as Node).type === "select")
          bind("REPLY", node, null, false);
        break;
      }
      case "binary_expression":
      case "postfix_expression":
      case "unary_expression": {
        if (!inArithmetic(node)) break;
        if (!ASSIGNMENTS.has((field(node, "operator") as Node).text)) break;
        // A target that is no name (`a[i]`, `$x`) binds a name no read uses.
        const target = named(node)[0] as Node;
        bind(target.text, target, null, true);
        break;
      }
      case "command": {
        let name = commandName(node);
        let list = args(node);
        // `command read X` and `builtin read X` still set X.
        while ((name === "command" || name === "builtin") && list.length > 0) {
          name = wordValue(list[0] as Node);
          list = list.slice(1);
        }
        // `read`, `mapfile`, `printf -v` and `getopts` set their variables
        // even at end of input; `wait -p` only when a job ends.
        for (const variable of commandBinds(name, list) ?? NONE)
          bind(variable, node, name === "wait" ? null : node, false);
        break;
      }
      case "unset_command": {
        if (named(node).some((child) => /^-.*f/s.test(child.text))) break;
        // In a function, `unset X` may uncover a caller's X.
        const own = enclosingFunction(node) === null ? node : null;
        for (const child of named(node)) {
          const name =
            child.type === "variable_name" ? child.text : wordValue(child);
          // rationale: binding a name no read uses (`-v`, `a[1]`, null for
          // `"$x"`) changes nothing, so skipping one is not observable.
          // Stryker disable next-line ConditionalExpression
          if (name !== null) bind(name, child, own, true);
        }
        break;
      }

      case "expansion": {
        // `${X:=default}` sets X when it is unset.
        const match = /\$\{(\w+):?=/.exec(node.text);
        if (match !== null) bind(match[1] as string, node, null, false);
        break;
      }
    }
    for (const child of named(node)) collect(child);
  };
  collect(root);

  /** Whether a binding ends before `node` starts. */
  const precedes = (binding: Binding, node: Node): boolean => {
    // rationale: a binding ends at a separator or after its own read of the
    // name (`${X:=a}$X`), so `<` and `<=` agree on every node that matters.
    // Stryker disable next-line EqualityOperator
    return binding.end <= node.startIndex;
  };

  /** Whether a top-level `declare -A` makes `name` associative before `node`. */
  const declaredBefore = (name: string, node: Node): boolean => {
    // rationale: a declaration and a read never start at the same place.
    // Stryker disable next-line EqualityOperator
    return (assocAt.get(name) ?? Number.POSITIVE_INFINITY) < node.startIndex;
  };

  /** Whether `command` is a `read` that sets `name`. */
  const readBinds = (command: Node | null, name: string): boolean =>
    command !== null &&
    commandName(command) === "read" &&
    (commandBinds("read", args(command)) ?? NONE).includes(name);

  /** Whether the value at `read` is certainly the script's own. */
  const dominated = (name: string, read: Node): boolean => {
    for (
      let current: Node | null = read.parent;
      current !== null;
      current = current.parent
    ) {
      if (current.type === "function_definition") break;
      // `read -r line || [[ -n $line ]]`: read sets its names even when it
      // fails at the end of its input.
      if (current.type === "list") {
        const first = named(current)[0] as Node;
        if (
          first.type === "command" &&
          !inside(read, first) &&
          readBinds(first, name)
        )
          return true;
      }
      if (current.type === "do_group") {
        const loop = current.parent as Node;
        if (
          loop.type === "for_statement" &&
          ((field(loop, "variable") as Node).text === name ||
            (name === "REPLY" && (loop.child(0) as Node).type === "select"))
        )
          return true;
        // `while read -r line; do`; a `for` loop has no condition.
        const condition = field(loop, "condition");
        if (
          readBinds(
            condition?.type === "command"
              ? condition
              : condition?.type === "list" &&
                  (named(condition)[0] as Node).type === "command"
                ? (named(condition)[0] as Node)
                : null,
            name,
          )
        )
          return true;
      }
      // `for (( i = 0; ...))`: the initializer sets i before the rest runs.
      const initializer = field(current, "initializer");
      if (
        initializer !== null &&
        field(initializer, "name")?.text === name &&
        !inside(read, initializer)
      )
        return true;
    }
    const scope = enclosingFunction(read);
    const outer = outermostFunction(read);
    for (const binding of bindingsOf(name)) {
      if (!binding.dominates) continue;
      if (
        binding.scope !== null &&
        scope !== null &&
        binding.scope.id === scope.id &&
        precedes(binding, read)
      )
        return true;
      // A top-level binding precedes a read below it, and any function
      // defined below it, which cannot run before it is defined.
      if (binding.scope === null && precedes(binding, outer ?? read))
        return true;
    }
    return false;
  };

  /** Whether the read is certainly of the environment's value. */
  const certain = (name: string, read: Node): boolean => {
    const list = bindingsOf(name);
    if (list.length === 0) return true;
    if (outermostFunction(read) !== null) return false;
    for (const binding of list) if (precedes(binding, read)) return false;
    // A loop around the read may set the variable before its next turn.
    for (let current = read.parent; current !== null; current = current.parent)
      if (
        LOOPS.has(current.type) &&
        list.some((binding) => inside(binding.node, current))
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
    if (NUMERIC_SHELL_VARIABLES.has(name) || integers.has(name)) return true;
    if (!dominated(name, place)) return false;
    return bindingsOf(name).every((binding) => binding.numeric);
  };

  /** A value evaluated as arithmetic may name another variable. */
  const evaluated = (name: string, place: Node, owner: Node): void => {
    // The value may be `a[$(rm -rf x)]`, whose subscript bash runs.
    if (!code || numeric(name, place)) return;
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

  /** Refuses a command that `special` handles. */
  const stop = (node: Node): true => {
    refuse(node);
    return true;
  };

  /**
   * Bare names in an arithmetic context are variables, and every value the
   * context expands is evaluated as an expression in turn.
   */
  const arithmeticNames = (node: Node, owner: Node): void => {
    // A bare name; a word (`a[i]`) is read below like quoted text.
    if (node.type === "variable_name") {
      read(node.text, node, owner);
      evaluated(node.text, node, owner);
      return;
    }
    // `for (( i = j; ...))`: the initializer sets i and reads j.
    if (node.type === "variable_assignment") {
      arithmeticNames(field(node, "value") as Node, owner);
      return;
    }
    if (
      node.type === "binary_expression" &&
      (field(node, "operator") as Node).text === "="
    ) {
      // `x = y + 1` sets x: only the right side is read.
      arithmeticNames(field(node, "right") as Node, owner);
      return;
    }
    if (node.type === "simple_expansion" || node.type === "expansion") {
      visit(node);
      if (node.text.startsWith("${#")) return;
      const target = parameter(node);
      if (target !== null) evaluated(target.name, node, owner);
      // `$#`, `$?`, `$$`, `$!` are numbers.
      else if (!NUMERIC_SPECIAL.has((named(node)[0] as Node).text))
        evaluated(node.text, node, owner);
      return;
    }
    // Quoted arithmetic text: its names are variables too. A string's other
    // parts are read below.
    if (
      node.type === "raw_string" ||
      node.type === "string_content" ||
      node.type === "word"
    ) {
      for (const match of node.text.matchAll(/(?<![\w$#])[A-Za-z_]\w*/g)) {
        read(match[0], node, owner);
        evaluated(match[0], node, owner);
      }
      return;
    }
    // The grammar reads no process substitution in arithmetic.
    if (node.type === "command_substitution") {
      visit(node);
      evaluated(node.text, node, owner);
      return;
    }
    for (const child of named(node)) arithmeticNames(child, owner);
  };

  /** The test command (`[[ ... ]]`, `[ ... ]`) an expression is part of. */
  // The grammar has `-v` and `-eq` expressions only in tests, so the nearest
  // test is the expression's own.
  const inTest = (node: Node): Node | null => {
    let current = node.parent;
    while (current !== null && current.type !== "test_command")
      current = current.parent;
    return current;
  };

  /**
   * An unquoted `~` that starts a word reads HOME (`~-` reads OLDPWD); in an
   * assignment value it also may follow `:`.
   */
  const tilde = (node: Node): void => {
    for (
      let current = node.parent;
      current !== null && current.type !== "command_substitution";
      current = current.parent
    )
      if (current.type === "string") return;
    const parent = node.parent as Node;
    const concat = parent.type === "concatenation" ? parent : null;
    const first = concat === null || (concat.child(0) as Node).id === node.id;
    const last =
      concat === null ||
      (concat.child(concat.childCount - 1) as Node).id === node.id;
    const holder = concat ?? node;
    const owner = holder.parent as Node;
    let text = node.text;
    let starts = first;
    // A word in an assignment is its value.
    let colons = owner.type === "variable_assignment";
    if (
      owner.type === "array" &&
      node.previousSibling?.text === "]" &&
      text.startsWith("=")
    ) {
      // `([1]=~/x)`: the element's value is an assignment value.
      text = text.slice(1);
      starts = true;
      colons = true;
    } else if (
      first &&
      owner.type === "command" &&
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
      const end = (match.index as number) + match[0].length;
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
    if ((parts[0] as Node).text !== "[") return 0;
    const close = parts.findIndex((part) => part.text === "]");
    if (close === -1) return 0;
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
    const bound = commandBinds(name, list);
    if (env && bound === null) {
      // `read "$name"`: a variable named at run time is set.
      return stop(node);
    }
    const printfTarget =
      name === "printf" ? words[words.indexOf("-v") + 1] : undefined;
    if (
      code &&
      // A null word tests as "null".
      words.some((word) => SUBSCRIPT_CODE.test(word as string))
    ) {
      return stop(node);
    }
    if (
      env &&
      ((bound as readonly string[]).some((target) =>
        /\[(?!\d+\])/.test(target),
      ) ||
        (words.includes("-v") && /\[(?!\d+\])/.test(printfTarget as string)))
    ) {
      // `read 'a[IDX]'`: the index is arithmetic on IDX.
      return stop(node);
    }
    if (env) {
      if (name === "printenv") {
        // With no words, every word is an option.
        if (
          words.includes(null) ||
          words.every((word) => (word as string).startsWith("-"))
        )
          refuse(node);
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
      // A local that copies or uncovers the caller's value.
      else if (
        name === "shopt" &&
        words.some(
          (word) => word === null || /^localvar_(?:inherit|unset)$/.test(word),
        )
      )
        refuse(node);
      // BSD `ps e` (`ps eww`, `ps aux e`) prints each process's environment.
      else if (
        posix.basename(name) === "ps" &&
        words.some(
          (word) => word === null || /^[A-Za-z]*e[A-Za-z]*$/.test(word),
        )
      )
        refuse(node);
      // A program handed code that reads the environment (`awk ENVIRON`,
      // jq's `env`), or a program Kibi cannot see (`awk "$prog"`).
      else if (
        words.some((word) => FOREIGN_ENV.test(word as string)) ||
        (posix.basename(name) === "jq" &&
          words.some(
            (word) => word === null || /\benv\b|\$ENV\b/.test(word),
          )) ||
        (INTERPRETERS.has(posix.basename(name)) && words.includes(null))
      )
        refuse(node);
      else if (name === "let") {
        // `let` evaluates its words as arithmetic text Kibi does not parse.
        refuse(node);
      } else if (name === "cd") {
        // A bare `cd` goes to $HOME, `cd -` to $OLDPWD.
        const operands = words.filter(
          (word) => !/^(?:-[LPe@]+|--)$/.test(word as string),
        );
        if (operands.length === 0) read("HOME", node, node);
        else if (operands[0] === "-") read("OLDPWD", node, node);
      } else if (name === "test" || name === "[") {
        for (let index = 0; index + 1 < words.length; index += 1)
          if (words[index] === "-v" || words[index] === "-R") {
            const target = words[index + 1] as string | null;
            if (target === null) refuse(node);
            else read(arrayName(target), list[index + 1] as Node, node);
          }
      } else if (DECLARATIONS.has(name))
        // `builtin declare -n ref=X`: Kibi reads declarations it can see as such.
        refuse(node);
    }
    if (name === "eval") {
      return stop(node);
    }
    if (name === "source" || name === ".") {
      const operands = words[0] === "--" ? list.slice(1) : list;
      const folder = scriptFolder(operands[0], node);
      const path = sourcedPath(operands[0], file) ?? folder;
      if (extract === "imports") {
        const fromZero =
          operands[0] !== undefined &&
          wordValue(operands[0]) === null &&
          (/\$\{?0\b/.test(operands[0].text) ||
            // With no folder, folderText is null: "null" has no `$0`.
            /\$\{?0\b/.test(folderText as string));
        if (
          path === null ||
          // A relative `$0` names another folder after the script changes
          // directory.
          (fromZero && changesDirectory(root, node.startIndex))
        )
          refuse(node);
        else {
          members.push(path);
          // `$0` is the script bash runs: in a file another script sources,
          // it names that script's folder. The host drops the row when no
          // project file sources this one.
          if (fromZero)
            unresolved.push({
              line: node.startPosition.row + 1,
              text: `${posix.basename(file)} may be sourced by another script, whose folder $0 names: ${at(node).text}`,
            });
        }
      }
      // The sourced file may read or set any variable; code read from a
      // stream is the script's own, unseen.
      else if (
        env ||
        operands[0]?.type === "process_substitution" ||
        /^\/dev\/(?:stdin|fd\/)/.test(path as string) ||
        operands.length === 0
      )
        refuse(node);
      // `source a.sh` is a call.
      else return false;
      return true;
    }
    if (RUNNERS.has(name)) {
      // A runner cannot run `source`; for env only a shell it may start
      // reads variables Kibi does not see.
      if (
        extract !== "imports" &&
        (!env ||
          words.some(
            (word) =>
              word === null ||
              SHELLS.has(posix.basename(word)) ||
              CODE_COMMANDS.has(posix.basename(word)) ||
              ENV_DUMPERS.has(posix.basename(word)),
          ))
      )
        return stop(node);
    }
    if (
      CODE_COMMANDS.has(name) ||
      (name === "alias" && list.length > 0) ||
      ((name === "mapfile" || name === "readarray") &&
        words.some((word) => word === null || /^-[^-]*C/.test(word))) ||
      (name === "hash" &&
        words.some((word) => word === null || /^-[^-]*p/.test(word)))
    ) {
      return stop(node);
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
        return stop(node);
      }
    }
    return false;
  };

  /**
   * A wrapper's short options clustered in one word (`sudo -nE`): how many
   * more words they take, -1 when they run no command, or null.
   */
  const cluster = (wrapper: Wrapper, word: string): number | null => {
    const letters = word.slice(1);
    // `--name`, `-o=x`: only letters and digits cluster.
    if (!/^[A-Za-z0-9]*$/.test(letters)) return null;
    for (let index = 0; index < letters.length; index += 1) {
      const option = `-${letters[index]}`;
      if (wrapper.noCommand?.has(option)) return -1;
      // The last option takes the next word, an earlier one the rest of this.
      if (wrapper.args.has(option)) return index === letters.length - 1 ? 1 : 0;
      if (!wrapper.flags.has(option)) return null;
    }
    return 0;
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
          if (value === null) refuse(node);
          else members.push(value as string);
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
        for (let index = 0; ; index += 1) {
          const word = restWords[index];
          if (word === null || word === undefined) break;
          if (word === "-s" || /^-[A-Za-z]*c[A-Za-z]*$/.test(word)) break;
          if (SHELL_OPTION_ARGS.has(word)) {
            index += 1;
            continue;
          }
          // Options, and `--`.
          if (/^[-+]/.test(word)) continue;
          // `bash /dev/stdin <<EOF` reads the script from its input.
          script =
            !/^(?:\/dev\/(?:stdin|fd\/\d+|tty)|\/proc\/\S*\/fd\/\d+)$/.test(
              word,
            );
          break;
        }
        if (!script) refuse(node);
        return;
      }
      if (base === "find") {
        // Every `-exec` runs its command, up to `;` or `+`.
        for (let index = 0; ; index += 1) {
          const word = restWords[index];
          if (word === undefined) break;
          if (word === null) {
            // `"$dir"` is one word; it could be `-exec` only with a command
            // and its `;` after it. An unquoted expansion may be several words.
            const quoted =
              (rest[index] as Node).type === "string" &&
              !/\$\{?[@*]|\[[@*]\]/.test((rest[index] as Node).text);
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
          if (!/^-(?:exec|execdir|ok|okdir)$/.test(word)) continue;
          let end = index + 1;
          // rationale: past the last word, restWords[end] is undefined, which
          // is neither `;` nor `+`: `<=` only ends the loop one step later.
          while (
            // Stryker disable next-line EqualityOperator
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
      if (base === "ip") {
        // `ip [-all] netns exec [NAME] CMD`: options may come first, and
        // `-netns`, `-family`, `-loops`, `-rcvbuf` and `-batch` (or a prefix
        // of one) take the next word as their argument. A prefix that may
        // also name an option without one (`-f`: -family or -force) leaves
        // the command unknown.
        let at = 0;
        let unsure = false;
        while (restWords[at]?.startsWith("-") === true) {
          // The word starts with its dashes, so the first match is them.
          const option = (restWords[at] as string).replace(/--?/, "");
          const takes = IP_ARGUMENT_OPTIONS.some((full) =>
            full.startsWith(option),
          );
          if (takes && IP_FLAG_OPTIONS.some((full) => full.startsWith(option)))
            unsure = true;
          at += takes ? 2 : 1;
        }
        if (unsure && restWords.includes("netns")) {
          refuse(node);
          return;
        }
        if (restWords[at] === "netns" && restWords[at + 1] === "exec") {
          const all = restWords
            .slice(0, at)
            .some((word) => /^a(?:ll?)?$/.test((word as string).slice(1)));
          const position = at + (all ? 2 : 3);
          const target = restWords[position];
          if (
            target === null ||
            target === undefined ||
            restWords.slice(0, position).includes(null)
          ) {
            refuse(node);
            return;
          }
          name = target;
          rest = rest.slice(position + 1);
          restWords = restWords.slice(position + 1);
          continue;
        }
        if (restWords.slice(0, at + 2).includes(null)) {
          refuse(node);
          return;
        }
      }
      const wrapper = WRAPPERS.get(base);
      if (wrapper === undefined) return;
      if (base === "xargs") fromXargs = true;
      let index = 0;
      let operands = wrapper.operands ?? 0;
      let next: string | null = null;
      // `env -0` prints the environment.
      const stops = (): void => {
        if (env && base === "env") refuse(node);
      };
      // After `--` no word is an option; operands (`timeout -- 5 rm`) and
      // assignments (`env -- X=1 rm`) still come before the command.
      let optionsDone = false;
      for (; index < rest.length; index += 1) {
        const word = restWords[index] as string | null;
        if (word === null) {
          refuse(node);
          return;
        }
        if (word === "--" && !optionsDone) {
          optionsDone = true;
          continue;
        }
        const option =
          word.includes("=") && word.startsWith("--")
            ? word.slice(0, word.indexOf("="))
            : word;
        if (!optionsDone && wrapper.noCommand?.has(option)) {
          stops();
          return;
        }
        // `env -` is `env -i`.
        if (
          !optionsDone &&
          word.startsWith("-") &&
          (word.length > 1 || wrapper.flags.has(word))
        ) {
          if (wrapper.args.has(word)) index += 1;
          else if (wrapper.args.has(option) || wrapper.flags.has(option)) {
            // A flag, or --name=value
          } else if (
            wrapper.numericFlags === true &&
            /^\d+$/.test(word.slice(1))
          ) {
            // nice -10
          } else {
            const kind = cluster(wrapper, word);
            if (kind === -1) {
              stops();
              return;
            }
            // -nE, -ofoo, `-u.`: flags, or an option with its argument
            // attached.
            if (kind !== null) index += kind;
            else if (!wrapper.args.has(word.slice(0, 2))) {
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
          // rationale: only xargs falls back, to echo, and echo reads none of
          // its words: what Stryker puts in these lists is never read.
          // Stryker disable next-line ArrayDeclaration
          [rest, restWords] = [[], []];
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

  /** The value text of the last script-folder variable `scriptFolder` read. */
  let folderText: string | null = null;
  /**
   * `source "$DIR/lib.sh"` where the script sets DIR once, at top level and
   * before, to its own folder: `DIR=$(dirname "$0")`,
   * `DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`.
   */
  const scriptFolder = (word: Node | undefined, place: Node): string | null => {
    folderText = null;
    if (word === undefined) return null;
    const match = /^\$\{?([A-Za-z_]\w*)\}?(\/[\w./-]+)$/.exec(
      word.text.replaceAll('"', ""),
    );
    if (match === null) return null;
    const name = match[1] as string;
    const sets = bindingsOf(name);
    if (
      sets.length !== 1 ||
      (sets[0] as Binding).scope !== null ||
      !(sets[0] as Binding).dominates ||
      !precedes(sets[0] as Binding, place) ||
      localNames.has(name)
    )
      return null;
    const value = root.text
      .slice((sets[0] as Binding).start, (sets[0] as Binding).end)
      .slice(name.length + 1)
      .replaceAll('"', "")
      .replace(/\s+--\s+/g, " ")
      .replace(/\s*(?:&>|>|2>)\s*\/dev\/null(?:\s+2>&1)?/g, "");
    const dirname = String.raw`\$\(dirname \$\{?(?:0|BASH_SOURCE(?:\[0\])?)\}?\)`;
    if (
      !new RegExp(
        `^\\$\\((?:cd ${dirname} (?:&&|;) pwd(?: -P)?|dirname \\$\\{?(?:0|BASH_SOURCE(?:\\[0\\])?)\\}?)\\)$`,
      ).test(value)
    )
      return null;
    folderText = value;
    return posix.normalize(posix.join(posix.dirname(file), match[2] as string));
  };

  /** One command: its name, what it wraps, and what its words mean. */
  const command = (node: Node): void => {
    const list = args(node);
    const name = commandName(node);
    // `$cmd`, `"${cmds[0]}"`: the command may be `source` or `printenv`.
    if (name === null) {
      refuse(node);
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
        if (node.text.startsWith("\n")) {
          // The grammar folded the next line into this word (a line that
          // starts with `\`): Kibi cannot tell where that command starts.
          refuse(node);
          return;
        }
        if (env) {
          tilde(node);
          // An expansion or a `[` splits a word: `/proc/$$/environ` is a
          // concatenation.
          if (/\/proc\/(?:self|\d|\*)\S*\/environ\b/.test(node.text))
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
          (node.parent as Node).type !== "concatenation" &&
          /\/proc\/\S*\/environ\b/.test(node.text)
        )
          refuse(node);
        break;
      case "heredoc_end": {
        // bash ends a here-document only on a line that is exactly the
        // delimiter; the grammar also accepts one with trailing blanks.
        const line = root.text.split("\n")[node.startPosition.row] as string;
        if (code && /[ \t]\r?$/.test(line)) refuse(node);
        break;
      }
      case "command_substitution":
        // An escaped backtick inside backticks starts a nested substitution.
        if (code && node.text[0] === "`" && /\\`/.test(node.text)) {
          refuse(node);
          return;
        }
        break;
      case "heredoc_body": {
        // Any quoted character in the delimiter (`'EOF'`, `E\OF`) leaves the
        // body as text.
        const quotedDelimiter = /['"\\]/.test(
          (
            named(node.parent as Node).find(
              (child) => child.type === "heredoc_start",
            ) as Node
          ).text,
        );
        if (quotedDelimiter) return;
        // The grammar reads `$(...)` in a body; it leaves these as text.
        if (code && /`|\$\[/.test(node.text)) {
          refuse(node);
          return;
        }
        break;
      }
      case "command":
        // `X=1 >/dev/null` + newline + `echo $X`: the grammar joins a line of
        // assignments and redirects to the next line's command, as if X were
        // set for that command only.
        if (
          env &&
          /[^\\]\n/.test(
            node.text.slice(
              0,
              (field(node, "name") as Node).startIndex - node.startIndex,
            ),
          )
        ) {
          refuse(node);
          return;
        }
        // `r\` + newline + `m -rf`: a line splice inside a word joins it, which
        // the grammar does not do (`source a\` + newline + `b.sh` reads ab.sh).
        if (/[^\s\\;&|]\\\r?\n[^\s]/.test(node.text)) {
          refuse(node);
          return;
        }
        command(node);
        break;
      case "array": {
        if (!env) break;
        // An array is an assignment's value.
        if (assoc.has((field(node.parent as Node, "name") as Node).text)) break;
        for (const element of named(node)) {
          if (element.type !== "concatenation") {
            visit(element);
            continue;
          }
          const parts = named(element);
          const close = bracketIndex(parts, element);
          for (const part of parts.slice(close)) visit(part);
        }
        return;
      }
      case "unset_command": {
        if (code && SUBSCRIPT_CODE.test(node.text)) {
          refuse(node);
          return;
        }
        if (!env) break;
        const children = named(node);
        for (let index = 0; index < children.length; index += 1) {
          const child = children[index] as Node;
          const next = children[index + 1];
          if (child.type === "word" && /^-/.test(child.text)) continue;
          if (localNames.has(wordValue(child) ?? child.text)) {
            // A caller's local of that name is removed, uncovering the
            // environment's value.
            refuse(child);
            continue;
          }
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
              for (const part of parts.slice(close)) visit(part);
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
          if (subscript === null) {
            if (!/^[A-Za-z_]\w*$/.test(value)) refuse(child);
            continue;
          }
          const key = subscript[2] as string;
          // bash expands the subscript: `unset 'a[$k]'` reads k. The key of
          // an associative array is text; an index is arithmetic.
          // `a[@]` names no variable.
          // `${!k}` reads a variable whose name is k's value.
          if (key.includes("${!")) {
            refuse(child);
            continue;
          }
          // `${#k}` reads k too; in `16#ff` the digits after `#` are no name.
          if (assoc.has(subscript[1] as string))
            for (const match of key.matchAll(/\$\{?#?([A-Za-z_]\w*)/g))
              read(match[1] as string, child, node);
          else
            for (const match of key.matchAll(/(?<!\w)(?<!\w#)[A-Za-z_]\w*/g)) {
              read(match[0], child, node);
              evaluated(match[0], child, node);
            }
        }
        return;
      }
      case "declaration_command": {
        // `declare 'a[$(rm -rf x)]=1'`; the grammar reads `a[$(x)]=1` as an
        // assignment, whose substitution Kibi follows.
        if (
          code &&
          named(node).some(
            (child) =>
              child.type !== "variable_assignment" &&
              SUBSCRIPT_CODE.test(child.text),
          )
        ) {
          refuse(node);
          return;
        }
        if (!env) break;
        const flags = declarationFlags(node);
        const children = named(node).filter(
          (child) => !/^[-+]/.test(child.text),
        );
        // `-n` makes a name reference; `local -I` copies the caller's value.
        if (flags.includes("n") || flags.includes("I")) refuse(node);
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
            const name = field(child, "name") as Node;
            const target = name.text;
            const base =
              name.type === "subscript"
                ? (field(name, "name") as Node).text
                : target;
            // `declare a[i]+=1` reads a.
            if ((child.child(1) as Node).type === "+=") read(base, child, node);
            // `a[@]` names no variable.
            if (name.type === "subscript" && !assoc.has(base))
              arithmeticNames(field(name, "index") as Node, child);
            if (integers.has(target)) {
              const value = field(child, "value");
              if (value !== null) arithmeticNames(value, child);
            }
          }
        break;
      }
      case "variable_assignment": {
        // `BASH_ALIASES[c]='rm -rf x'` defines an alias, `BASH_CMDS[c]=/bin/rm`
        // a command path, and `PS4='$(...)'` code that `set -x` runs.
        const target = field(node, "name") as Node;
        const name =
          target.type === "subscript"
            ? (field(target, "name") as Node).text
            : target.text;
        if (
          code &&
          (name === "BASH_ALIASES" ||
            name === "BASH_CMDS" ||
            (/^(?:PS[0-4]|PROMPT_COMMAND)$/.test(name) &&
              /\$\(|`/.test(node.text)))
        )
          refuse(node);
        if (!env || (node.parent as Node).type === "declaration_command") break;
        if ((node.child(1) as Node).type === "+=") read(name, target, node);
        // A variable name has no index.
        const index = field(target, "index");
        if (index !== null && !assoc.has(name)) arithmeticNames(index, node);
        if (integers.has(name)) {
          const value = field(node, "value");
          if (value !== null) arithmeticNames(value, node);
        }
        break;
      }
      // `$x` has none of the parts of `${x...}` below.
      case "simple_expansion":
      case "expansion": {
        // `${x@P}` expands the value as a prompt, running `$(...)` in it.
        if (code && /@P\}$/.test(node.text)) {
          refuse(node);
          return;
        }
        // `${s:1+OFF:2}`: an offset or length Kibi does not parse as arithmetic.
        if (
          env &&
          /^\$\{[^}:]*:(?![-=?+])/.test(node.text) &&
          named(node)
            .slice(1)
            .some(
              (child) =>
                child.type !== "variable_name" &&
                child.type !== "number" &&
                /[A-Za-z_]/.test(child.text),
            )
        ) {
          refuse(node);
          return;
        }
        if (node.text.startsWith("${!")) {
          // `${!}` has no part.
          const first = named(node)[0];
          const keys =
            first?.type === "subscript" &&
            /^[@*]$/.test((field(first, "index") as Node).text);
          if (!keys && env) {
            refuse(node);
            return;
          }
        }
        const target = parameter(node);
        if (target !== null) read(target.name, target.at, node);
        const first = named(node)[0];
        if (first?.type === "subscript") {
          // `${a[@]}` names no variable.
          const index = field(first, "index") as Node;
          const array = (target as { name: string }).name;
          if (!assoc.has(array)) arithmeticNames(index, node);
          // Declared other ways too, in a function, or after this read:
          // which kind of array the subscript meets is the run's.
          else if (
            env &&
            (indexedToo.has(array) || !declaredBefore(array, node)) &&
            /[A-Za-z_]/.test(index.text)
          )
            refuse(node);
          else visit(index);
        }
        // `${s:i:2}`: offsets and lengths are arithmetic.
        for (const child of named(node).slice(1))
          if (child.type === "variable_name") arithmeticNames(child, node);
          else visit(child);
        return;
      }
      case "unary_expression": {
        const operator = (field(node, "operator") as Node).text;
        if ((operator === "-v" || operator === "-R") && inTest(node)) {
          const operand = named(node).find(
            (child) => child.type !== "test_operator",
          ) as Node;
          const name = wordValue(operand);
          if (name === null) {
            if (env) refuse(node);
          } else read(arrayName(name), operand, node);
          return;
        }
        break;
      }
      case "binary_expression": {
        const operator = (field(node, "operator") as Node).text;
        const test = inTest(node)?.text.startsWith("[[") === true;
        if (test && ARITHMETIC_TESTS.has(operator)) {
          arithmeticNames(field(node, "left") as Node, node);
          arithmeticNames(field(node, "right") as Node, node);
        }
        break;
      }
      case "c_style_for_statement": {
        for (const part of ["initializer", "condition", "update"]) {
          const child = field(node, part);
          if (child !== null) arithmeticNames(child, node);
        }
        visit(field(node, "body") as Node);
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
  return callee !== "" && posix.basename(name) === callee;
}
