import type { Node } from "web-tree-sitter";

/**
 * Reference extraction for source proofs. Each reader lists what a file
 * references exactly, from its syntax tree, and reports every construct whose
 * meaning it cannot know without running or compiling the program as an
 * unresolved row. The host refuses a read with any unresolved row, so the
 * rules lean towards refusal: a macro, a reflective call or a conditional
 * compilation block may hide a reference, so it is never read as absent.
 */

export const REFERENCE_LANGUAGES = ["go", "java", "csharp", "rust"] as const;
export type ReferenceLanguage = (typeof REFERENCE_LANGUAGES)[number];

export type ReferenceExtract =
  | "env"
  | "imports"
  | "calls"
  | "string_args"
  | "thrown"
  | "property";

export interface ReferenceRequest {
  readonly extract: ReferenceExtract;
  readonly callee?: string;
  readonly key?: string;
}

export interface Unresolved {
  readonly line: number;
  readonly text: string;
}

export type ReferenceRead =
  | { readonly ok: true; members: string[]; unresolved: Unresolved[] }
  | { readonly ok: false; code: string; message: string };

const LANGUAGE_NAMES: Readonly<Record<ReferenceLanguage, string>> = {
  go: "Go",
  java: "Java",
  csharp: "C#",
  rust: "Rust",
};

/** A method called on an expression the reader cannot name is `*.name`. */
const ANY_RECEIVER = "*";

function at(node: Node): Unresolved {
  return {
    line: node.startPosition.row + 1,
    text: node.text.replace(/\s+/g, " ").slice(0, 80),
  };
}

function field(node: Node, name: string): Node | null {
  return node.childForFieldName(name);
}

function named(node: Node): Node[] {
  const children: Node[] = [];
  for (let index = 0; index < node.namedChildCount; index += 1) {
    const child = node.namedChild(index);
    if (child !== null) children.push(child);
  }
  return children;
}

function firstError(root: Node): Node | null {
  if (!root.hasError) return null;
  const pending = [root];
  while (pending.length > 0) {
    /* node:coverage disable */
    const node = pending.shift();
    if (node === undefined) break;
    /* node:coverage enable */
    if (node.type === "ERROR" || node.isMissing) return node;
    for (let index = 0; index < node.childCount; index += 1) {
      const child = node.child(index);
      if (child !== null && (child.hasError || child.isMissing))
        pending.push(child);
    }
    // A tree with an error always holds an ERROR or missing node.
    /* node:coverage disable */
  }
  return root;
  /* node:coverage enable */
}

/** Remove generic arguments: `Vec::<u8>::new` is `Vec::new`. */
function withoutGenerics(text: string): string {
  let current = text.replace(/\s+/g, "");
  for (;;) {
    const next = current.replace(/(?:::)?<[^<>]*>/g, "");
    if (next === current) return current;
    current = next;
  }
}

/**
 * A string literal's value, or null when it is not a plain literal (an
 * interpolated string, or escapes this reader does not decode).
 */
function literal(node: Node | null | undefined): string | null {
  if (node === null || node === undefined) return null;
  const text = node.text;
  switch (node.type) {
    case "interpreted_string_literal": // Go
    case "string_literal": {
      // Go, Java, C#, Rust (C# verbatim and interpolated strings are other
      // node types)
      if (text.startsWith('"""')) return null;
      const body = text.startsWith('"') && text.endsWith('"') ? text : null;
      if (body === null) return null;
      try {
        // A quoted JSON text is a string.
        return JSON.parse(body) as string;
      } catch {
        return null;
      }
    }
    case "raw_string_literal": {
      // Go `...`, Rust r"..." / r#"..."#
      if (text.startsWith("`") && text.endsWith("`")) return text.slice(1, -1);
      const content = named(node).find(
        (child) => child.type === "string_content",
      );
      /* node:coverage disable */
      return content?.text ?? text.match(/^r(#*)"([\s\S]*)"\1$/)?.[2] ?? null;
      /* node:coverage enable */
    }
    case "verbatim_string_literal": // C# @"..."
      /* node:coverage disable */
      return text.startsWith('@"') && text.endsWith('"')
        ? text.slice(2, -1).replaceAll('""', '"')
        : null;
    /* node:coverage enable */
    default:
      return null;
  }
}

/**
 * Whether a call name is the callee a `string_args` read asks for: the
 * same name, or one that ends with it at a segment boundary (`Command::new`
 * is `std::process::Command::new`, `Printf` is `fmt.Printf`).
 */
function calleeMatches(name: string, callee: string): boolean {
  if (name === callee) return true;
  return name.endsWith(`.${callee}`) || name.endsWith(`::${callee}`);
}

/** The final segment of a dotted or `::` path. */
function finalName(name: string): string {
  return lastOf(lastOf(name, "::"), ".");
}

interface Reader {
  /**
   * A function named but not called here (passed on, assigned): listed in
   * `calls`, since whatever receives it may call it.
   */
  valueReference?(node: Node, context: FileContext): string | null;
  /** Names a macro's unparsed arguments mention (Rust). */
  macroNames?(node: Node): string[];
  /** Name of a call target, `*.name` for a method on an unnamed receiver, or null. */
  callName(call: Node, context: FileContext): string | null;
  /** The call nodes of the language. */
  isCall(node: Node): boolean;
  /** The callee node of a call, when the grammar has one. */
  callee(call: Node): Node | null;
  /** A call of a function literal or `nameof`: nothing is referenced by name. */
  ignoredCall(call: Node): boolean;
  /** Arguments of a call, in order. */
  callArguments(call: Node): Node[];
  /** Per-file import aliases and the imports that make bare names ambiguous. */
  context(root: Node): FileContext;
  /**
   * The names a spelled call target may stand for once import aliases,
   * static imports and fully qualified prefixes are resolved; the first is
   * the canonical one.
   */
  candidates(name: string, context: FileContext, at: Node): string[];
  /**
   * Whether the call or macro at `node` makes `extract` unknowable there:
   * its target may be a getter or a claimed callee under a name the reader
   * cannot follow (a receiver of unknown type, an owner it cannot see).
   */
  refuses?(
    node: Node,
    callName: string | null,
    names: readonly string[],
    context: FileContext,
    extract: ReferenceExtract,
    callee: string,
  ): boolean;
  /** A name used as a value (not called), for a maximal reference node. */
  reference(node: Node): string | null;
  /** Calls that read one environment variable named by their first argument. */
  readonly envGetters: ReadonlySet<string>;
  /** Calls that read the whole environment or a template of variables. */
  readonly envWhole: ReadonlySet<string>;
  /** Environment reads that are not calls (Rust `env!`, Java `System::getenv`). */
  envSpecial?(
    node: Node,
    context: FileContext,
    members: string[],
    unresolved: Unresolved[],
  ): boolean;
  imports(
    node: Node,
    members: string[],
    unresolved: Unresolved[],
    context: FileContext,
  ): void;
  thrown(
    node: Node,
    catchNames: readonly string[],
    members: string[],
    unresolved: Unresolved[],
    context: FileContext,
  ): void;
  /** Constructs that make `calls` and `thrown` unknowable (reflection, macros). */
  hidesCalls(
    node: Node,
    names: readonly string[],
    context: FileContext,
  ): boolean;
  /** Constructs that make every extract unknowable at that place. */
  conditional(node: Node): boolean;
  /** Skip the subtree entirely (e.g. Rust `#[cfg(test)]` items). */
  skip(node: Node): boolean;
  property?(
    node: Node,
    key: string,
    members: string[],
    unresolved: Unresolved[],
  ): void;
  /** Name of the catch variable bound by a catch clause, if any. */
  catchName(node: Node): string | null;
  /**
   * Types or packages a method call's receiver may come from, so that it is
   * listed under each of them too (`l.Error` on a logrus logger is
   * `logrus.Error`).
   */
  methodOwners?(call: Node, context: FileContext): string[];
  /**
   * A name another file of the project may bind instead (a `System` class
   * of the same Java package, a crate's `macro_rules! println`): the start
   * of an unresolved row the host may drop once it has checked those files.
   * The construct is read as usual too.
   */
  shadowed?(
    node: Node,
    callName: string | null,
    names: readonly string[],
    context: FileContext,
    extract: ReferenceExtract,
    callee: string,
  ): string | null;
  /** A callable passed by name, such as Java's `System.out::println`. */
  methodReference?(node: Node, context: FileContext): string | null;
}

interface FileContext {
  /** Local name (an alias, or a statically imported member) to what it names. */
  readonly aliases: ReadonlyMap<string, string>;
  /** C# `using static` types whose members bare names may be. */
  readonly staticTypes: readonly string[];
  /** Imports that make a bare environment read impossible to name. */
  readonly envAmbiguous: readonly Unresolved[];
  /** Imports that make a bare call impossible to name. */
  readonly callsAmbiguous: readonly Unresolved[];
  readonly imported: ReadonlySet<string>;
  /** Go: the local names imported packages are used under. */
  readonly packages: ReadonlySet<string>;
  /** Go: local package name to import path; Java: simple name to import. */
  readonly paths: ReadonlyMap<string, string>;
  /** Java: the file's package. */
  readonly packageName: string;
  /** Rust: a glob `use` brings names in unqualified. */
  readonly globbed: boolean;
}

function emptyContext(): {
  aliases: Map<string, string>;
  staticTypes: string[];
  envAmbiguous: Unresolved[];
  callsAmbiguous: Unresolved[];
  imported: Set<string>;
  packages: Set<string>;
  paths: Map<string, string>;
  packageName: string;
  globbed: boolean;
} {
  return {
    aliases: new Map(),
    staticTypes: [],
    envAmbiguous: [],
    callsAmbiguous: [],
    imported: new Set(),
    packages: new Set(),
    paths: new Map(),
    packageName: "",
    globbed: false,
  };
}

function descendants(root: Node, type: string): Node[] {
  return root
    .descendantsOfType(type)
    .filter((node): node is Node => node !== null);
}

/** Replace the first segment of a name by what an alias names. */
function aliased(
  name: string,
  separator: string,
  aliases: ReadonlyMap<string, string>,
): string {
  const cut = name.indexOf(separator);
  const head = cut === -1 ? name : name.slice(0, cut);
  const target = aliases.get(head);
  return target === undefined
    ? name
    : `${target}${cut === -1 ? "" : name.slice(cut)}`;
}

function unique(names: readonly string[]): string[] {
  return [...new Set(names)];
}

/** The text before the first `separator`, or all of it. */
function before(text: string, separator: string): string {
  const cut = text.indexOf(separator);
  return cut === -1 ? text : text.slice(0, cut);
}

/** The text after the last `separator`, or all of it. */
function lastOf(text: string, separator: string): string {
  const cut = text.lastIndexOf(separator);
  return cut === -1 ? text : text.slice(cut + separator.length);
}

/** A dotted name without comments and whitespace (`java . sql . A`). */
function plainName(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").replace(/\s+/g, "");
}

/** Chain node types that are part of a longer reference, per language. */
const REFERENCE_PARENTS = new Set([
  "selector_expression",
  "field_access",
  "scoped_identifier",
  "scoped_type_identifier",
  "qualified_name",
  "member_access_expression",
  "field_expression",
  "generic_name",
  "use_declaration",
  "use_as_clause",
  "use_list",
  "scoped_use_list",
  "import_spec",
  "import_declaration",
  "using_directive",
]);

// ---------------------------------------------------------------- Go

const GO_ENV_GETTERS = new Set([
  "os.Getenv",
  "os.LookupEnv",
  "syscall.Getenv",
  "unix.Getenv",
  "windows.Getenv",
]);
// Expand and ExpandEnv read every variable their template names, and any
// `Environ()` method (`exec.Cmd.Environ`) returns the whole environment.
const GO_ENV_WHOLE = new Set([
  "os.Environ",
  "syscall.Environ",
  "unix.Environ",
  "windows.Environ",
  "os.ExpandEnv",
  "os.Expand",
  `${ANY_RECEIVER}.Environ`,
]);
/** The packages with environment getters, by the name they are used under. */
const GO_ENV_PACKAGES: ReadonlyMap<string, string> = new Map([
  ["os", "os"],
  ["syscall", "syscall"],
  ["unix", "golang.org/x/sys/unix"],
  ["windows", "golang.org/x/sys/windows"],
]);
const GO_ENV_PATHS = new Set(GO_ENV_PACKAGES.values());

/**
 * Packages a short name is known to mean: the standard library's, x/sys,
 * and common loggers. A file that uses another package under one of these
 * names (`exec "github.com/fake/exec"`, `"github.com/charmbracelet/log"`,
 * `logrus "github.com/other/notlogrus"`) has its members listed under the
 * quoted import path, so they are never taken for the known package's.
 */
const GO_KNOWN_PACKAGES: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const known = new Map<string, Set<string>>();
  const add = (name: string, path: string) => {
    const paths = known.get(name) ?? new Set<string>();
    paths.add(path);
    known.set(name, paths);
  };
  for (const path of [
    "archive/tar",
    "archive/zip",
    "bufio",
    "bytes",
    "cmp",
    "compress/bzip2",
    "compress/flate",
    "compress/gzip",
    "compress/lzw",
    "compress/zlib",
    "container/heap",
    "container/list",
    "container/ring",
    "context",
    "crypto",
    "crypto/aes",
    "crypto/cipher",
    "crypto/des",
    "crypto/dsa",
    "crypto/ecdh",
    "crypto/ecdsa",
    "crypto/ed25519",
    "crypto/elliptic",
    "crypto/hmac",
    "crypto/md5",
    "crypto/rand",
    "crypto/rc4",
    "crypto/rsa",
    "crypto/sha1",
    "crypto/sha256",
    "crypto/sha512",
    "crypto/subtle",
    "crypto/tls",
    "crypto/x509",
    "database/sql",
    "database/sql/driver",
    "embed",
    "encoding",
    "encoding/ascii85",
    "encoding/asn1",
    "encoding/base32",
    "encoding/base64",
    "encoding/binary",
    "encoding/csv",
    "encoding/gob",
    "encoding/hex",
    "encoding/json",
    "encoding/pem",
    "encoding/xml",
    "errors",
    "expvar",
    "flag",
    "fmt",
    "go/ast",
    "go/build",
    "go/format",
    "go/parser",
    "go/printer",
    "go/token",
    "go/types",
    "hash",
    "hash/crc32",
    "hash/crc64",
    "hash/fnv",
    "html",
    "html/template",
    "image",
    "image/color",
    "image/gif",
    "image/jpeg",
    "image/png",
    "io",
    "io/fs",
    "io/ioutil",
    "iter",
    "log",
    "log/slog",
    "log/syslog",
    "maps",
    "math",
    "math/big",
    "math/bits",
    "math/cmplx",
    "math/rand",
    "math/rand/v2",
    "mime",
    "mime/multipart",
    "net",
    "net/http",
    "net/http/httptest",
    "net/http/httputil",
    "net/http/pprof",
    "net/mail",
    "net/netip",
    "net/rpc",
    "net/smtp",
    "net/textproto",
    "net/url",
    "os",
    "os/exec",
    "os/signal",
    "os/user",
    "path",
    "path/filepath",
    "plugin",
    "reflect",
    "regexp",
    "regexp/syntax",
    "runtime",
    "runtime/debug",
    "runtime/pprof",
    "slices",
    "sort",
    "strconv",
    "strings",
    "sync",
    "sync/atomic",
    "syscall",
    "testing",
    "testing/fstest",
    "text/scanner",
    "text/tabwriter",
    "text/template",
    "time",
    "unicode",
    "unicode/utf16",
    "unicode/utf8",
    "unique",
    "unsafe",
    ...GO_ENV_PATHS,
    "github.com/sirupsen/logrus",
    "github.com/Sirupsen/logrus",
    "go.uber.org/zap",
    "github.com/rs/zerolog",
  ])
    add(goPackageName(path), path);
  return known;
})();

/** The known name a package path is used under, if it is a known package. */
function goKnownName(path: string): string | null {
  for (const [name, paths] of GO_KNOWN_PACKAGES)
    if (paths.has(path)) return name;
  return null;
}

/**
 * Whether the file's local package name `local` (or the name its import
 * guesses) is a known name that means another package than the one imported.
 */
function goNamedElsewhere(local: string, context: FileContext): boolean {
  /* node:coverage disable */
  const path = context.paths.get(local) ?? local;
  /* node:coverage enable */
  const usedAs = context.aliases.get(local) ?? local;
  return [local, usedAs].some((name) => {
    const paths = GO_KNOWN_PACKAGES.get(name);
    return paths !== undefined && !paths.has(path);
  });
}

/**
 * How members of the package a file uses under `local` are listed: under
 * its package name, or under its quoted import path when that name means
 * another package.
 */
function goPackageSpelling(local: string, context: FileContext): string {
  const usedAs = context.aliases.get(local) ?? local;
  if (!goNamedElsewhere(local, context)) return usedAs;
  /* node:coverage disable */
  const path = context.paths.get(local) ?? local;
  /* node:coverage enable */
  return goKnownName(path) ?? `"${path}"`;
}
const GO_REFLECT_CALLS = new Set(["Call", "CallSlice", "MethodByName"]);
const GO_PLUGIN_CALLS = new Set(["plugin.Open", "*.Lookup"]);

/** The name a Go package is used under, guessed from its import path. */
function goPackageName(path: string): string {
  const tail = lastOf(path, "/");
  const versioned = /^v\d+$/.test(tail) && path.includes("/");
  const name = versioned ? lastOf(path.slice(0, -tail.length - 1), "/") : tail;
  return name
    .replace(/\.v\d+$/, "")
    .replace(/^go-|-go$/g, "")
    .replace(/[^\w]/g, "_");
}

function goChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "package_identifier":
    case "field_identifier":
    case "type_identifier":
      return node.text;
    case "selector_expression": {
      /* node:coverage disable */
      const operand = field(node, "operand");
      const name = field(node, "field");
      if (operand === null || name === null) return null;
      /* node:coverage enable */
      const left = goChain(operand);
      return left === null ? null : `${left}.${name.text}`;
    }
    case "parenthesized_expression": {
      const inner = named(node)[0];
      /* node:coverage disable */
      return inner === undefined ? null : goChain(inner);
      /* node:coverage enable */
    }
    case "generic_type": {
      // Map[int](x): an explicitly instantiated generic function.
      const base = field(node, "type");
      /* node:coverage disable */
      return base === null ? null : goChain(base);
      /* node:coverage enable */
    }
    default:
      // An element access (handlers[name]()) names no function.
      return null;
  }
}

function goIdentifiers(node: Node | null): string[] {
  /* node:coverage disable */
  if (node === null) return [];
  /* node:coverage enable */
  return named(node)
    .filter((child) => child.type === "identifier")
    .map((child) => child.text);
}

/** The node of `statement` that declares `name` in its scope, or null. */
function goDeclares(statement: Node, name: string): Node | null {
  switch (statement.type) {
    case "parameter_list":
      return (
        named(statement).find((parameter) =>
          goIdentifiers(parameter).includes(name),
        ) ?? null
      );
    case "short_var_declaration":
      return goIdentifiers(field(statement, "left")).includes(name)
        ? statement
        : null;
    case "range_clause":
    case "receive_statement":
      // `for os := range xs` declares; `for os = range xs` assigns.
      return statement.children.some((token) => token?.type === ":=") &&
        goIdentifiers(field(statement, "left")).includes(name)
        ? statement
        : null;
    case "for_clause": {
      const initializer = field(statement, "initializer");
      return initializer === null ? null : goDeclares(initializer, name);
    }
    case "var_declaration":
    case "const_declaration":
    case "type_declaration":
    case "var_spec_list":
      for (const spec of named(statement)) {
        if (spec.type === "var_spec_list") {
          const found = goDeclares(spec, name);
          if (found !== null) return found;
          continue;
        }
        const names = spec.type.startsWith("type_")
          ? [field(spec, "name")?.text]
          : goIdentifiers(spec);
        if (names.includes(name)) return spec;
      }
      return null;
    default:
      return null;
  }
}

/**
 * The declaration that binds `name` where `node` is, walking out through
 * the blocks, clauses and parameter lists around it; null when nothing in
 * the function binds it (it is then a package or a package-level name).
 * A declaration binds only after it ends (`os := os.Getenv("X")` reads the
 * package), as Go scopes do.
 */
function goBinding(node: Node, name: string): Node | null {
  let scope = node.parent;
  for (; scope !== null && scope.type !== "source_file"; scope = scope.parent) {
    if (scope.type === "type_switch_statement") {
      const value = field(scope, "value");
      if (
        value !== null &&
        node.startIndex >= value.endIndex &&
        goIdentifiers(field(scope, "alias")).includes(name)
      )
        return value;
    }
    for (const statement of named(scope)) {
      if (statement.endIndex > node.startIndex) break;
      const found = goDeclares(statement, name);
      if (found !== null) return found;
    }
  }
  // A package-level var, const or type of this file binds in every order.
  /* node:coverage disable */
  if (scope === null) return null;
  /* node:coverage enable */
  for (const declaration of named(scope)) {
    const found = goDeclares(declaration, name);
    if (found !== null) return found;
  }
  return null;
}

/** Whether `name` is an imported package where `node` is (not shadowed). */
function goPackageAt(name: string, node: Node, context: FileContext): boolean {
  return context.packages.has(name) && goBinding(node, name) === null;
}

/**
 * A spelled call or value name as the reader lists it: a method on any
 * value (one the file declares, or a package-level name of another file) is
 * `*.Method`, and a package that is not the standard
 * library's os or syscall but is used under that name (`os
 * "github.com/x/env"`) is spelled by its import path.
 */
function goName(name: string, context: FileContext, at: Node): string {
  const cut = name.indexOf(".");
  if (cut === -1) return name;
  const root = name.slice(0, cut);
  const method = `${ANY_RECEIVER}.${lastOf(name, ".")}`;
  // A qualifier that is not an imported package is a value or type of the
  // package (declared here, or in another of its files): its type is not
  // known, so the method is `*.Method`.
  if (!context.packages.has(root) || goBinding(at, root) !== null)
    return method;
  // A package used under a name that means another package (`os
  // "github.com/x/env"`, `exec "github.com/fake/exec"`, `log
  // "github.com/sirupsen/logrus"`) is spelled by its import path, so the
  // name's usual meaning is never listed.
  if (goNamedElsewhere(root, context)) {
    /* node:coverage disable */
    const path = context.paths.get(root) ?? root;
    /* node:coverage enable */
    return `"${path}"${name.slice(cut)}`;
  }
  return name;
}

/** The leftmost name of a receiver expression and how many steps lead to it. */
function goReceiverRoot(node: Node, hops = 0): [Node, number] | null {
  switch (node.type) {
    case "identifier":
    case "package_identifier":
    case "type_identifier":
      return [node, hops];
    case "selector_expression":
    case "index_expression":
    case "slice_expression":
    case "type_assertion_expression":
    case "unary_expression": {
      const operand = field(node, "operand");
      /* node:coverage disable */
      if (operand === null) return null;
      /* node:coverage enable */
      return goReceiverRoot(
        operand,
        node.type === "unary_expression" ? hops : hops + 1,
      );
    }
    case "call_expression": {
      const target = field(node, "function");
      /* node:coverage disable */
      if (target === null) return null;
      /* node:coverage enable */
      return goReceiverRoot(target, hops + 1);
    }
    case "composite_literal": {
      const type = field(node, "type");
      /* node:coverage disable */
      if (type === null) return null;
      /* node:coverage enable */
      return goReceiverRoot(type, hops);
    }
    case "qualified_type": {
      const pkg = field(node, "package");
      /* node:coverage disable */
      if (pkg === null) return null;
      /* node:coverage enable */
      return [pkg, hops];
    }
    case "parenthesized_expression":
    case "pointer_type": {
      const inner = named(node)[0];
      /* node:coverage disable */
      if (inner === undefined) return null;
      /* node:coverage enable */
      return goReceiverRoot(inner, hops);
    }
    default:
      return null;
  }
}

/**
 * The packages a method's receiver visibly comes from: the package a call
 * chain starts at (`logrus.WithField(..).Error`), or the packages the
 * receiver's declaration names (`l := logrus.StandardLogger()`, `l
 * *logrus.Logger`), and for a field of a struct this file declares, the
 * packages that struct's fields name. `l.Error` may then be logrus's own
 * Error, so it is listed as `logrus.Error` too.
 */
function goOwners(call: Node, context: FileContext): string[] {
  // Only a selector call is a method on a receiver (`*.name`).
  /* node:coverage disable */
  const target =
    call.type === "selector_expression" ? call : field(call, "function");
  const operand = target === null ? null : field(target, "operand");
  if (operand === null) return [];
  /* node:coverage enable */
  const found = goReceiverRoot(operand);
  if (found === null) return [];
  const [root, hops] = found;
  const usedAs = (name: string) => goPackageSpelling(name, context);
  if (goPackageAt(root.text, call, context)) return [usedAs(root.text)];
  const binding = goBinding(call, root.text);
  if (binding === null) return [];
  const texts = [binding.text];
  const type = field(binding, "type");
  if (hops > 0 && type !== null) {
    const typeName = type.text.replace(/^\*+/, "");
    let file: Node = call;
    while (file.parent !== null) file = file.parent;
    for (const spec of descendants(file, "type_spec"))
      if (field(spec, "name")?.text === typeName) texts.push(spec.text);
  }
  return unique(
    [...context.packages]
      .filter((name) =>
        texts.some((text) =>
          new RegExp(`(?<![\\w.])${name}\\s*\\.`).test(text),
        ),
      )
      .map(usedAs),
  );
}

/** Go's predeclared identifiers: no file of the package declares them. */
const GO_PREDECLARED = new Set([
  "_",
  "true",
  "false",
  "nil",
  "iota",
  "any",
  "bool",
  "byte",
  "comparable",
  "complex64",
  "complex128",
  "error",
  "float32",
  "float64",
  "int",
  "int8",
  "int16",
  "int32",
  "int64",
  "rune",
  "string",
  "uint",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "uintptr",
  "append",
  "cap",
  "clear",
  "close",
  "complex",
  "copy",
  "delete",
  "imag",
  "len",
  "make",
  "max",
  "min",
  "new",
  "panic",
  "print",
  "println",
  "real",
  "recover",
]);

/**
 * Whether an identifier is spelled by a declaration (a function, type,
 * variable, constant, parameter or type parameter name, the left side of
 * `:=`) or is a composite literal's key, rather than used.
 */
function goDeclaredName(node: Node): boolean {
  const parent = node.parent;
  /* node:coverage disable */
  if (parent === null) return true;
  /* node:coverage enable */
  if (parent.childrenForFieldName("name").some((name) => name.id === node.id))
    return true;
  if (parent.type === "literal_element")
    return (
      parent.parent?.type === "keyed_element" && parent.previousSibling === null
    );
  const statement = parent.parent;
  return (
    parent.type === "expression_list" &&
    statement !== null &&
    field(statement, "left")?.id === parent.id &&
    statement.children.some((token) => token?.type === ":=")
  );
}

/**
 * Whether `name` is declared where `node` is by this file: a local, a
 * package-level var, const, type or function of the file, a type parameter
 * around it, or an imported package.
 */
function goDeclaredHere(
  node: Node,
  name: string,
  context: FileContext,
): boolean {
  if (goBinding(node, name) !== null || context.packages.has(name)) return true;
  let file: Node = node;
  for (let scope = node.parent; scope !== null; scope = scope.parent) {
    file = scope;
    const parameters = field(scope, "type_parameters");
    if (
      parameters !== null &&
      named(parameters).some((declaration) =>
        goIdentifiers(declaration).includes(name),
      )
    )
      return true;
  }
  return named(file).some(
    (declaration) =>
      declaration.type === "function_declaration" &&
      field(declaration, "name")?.text === name,
  );
}

/** Whether an expression is a value stored, passed on or returned. */
function goValue(node: Node): boolean {
  const parent = node.parent;
  /* node:coverage disable */
  if (parent === null) return false;
  /* node:coverage enable */
  switch (parent.type) {
    case "argument_list":
    case "literal_element":
      return true;
    case "expression_list": {
      // Not the left side of an assignment (`l.x = 1`).
      const statement = parent.parent;
      return statement === null || field(statement, "left")?.id !== parent.id;
    }
    default:
      return false;
  }
}

/**
 * For calls: a bare function name the file does not declare, called or
 * handed on as a value (`command("rm")` with `var command = exec.Command`
 * in another file of the package). What it calls is not known here, so the
 * row is kept: `X may be a function of another file of the package`.
 */
function goUndeclaredCall(
  node: Node,
  callName: string | null,
  context: FileContext,
): string | null {
  // A dot import or an undecoded path already refuses every call.
  if (context.callsAmbiguous.length > 0) return null;
  let name: string | null = null;
  if (node.type === "call_expression") {
    if (callName !== null && !/[."]/.test(callName)) name = callName;
  } else if (
    node.type === "identifier" &&
    goValue(node) &&
    !goDeclaredName(node)
  )
    name = node.text;
  if (
    name === null ||
    GO_PREDECLARED.has(name) ||
    goDeclaredHere(node, name, context)
  )
    return null;
  return `${name} may be a function of another file of the package`;
}

const GO: Reader = {
  isCall: (node) =>
    node.type === "call_expression" ||
    (node.type === "type_conversion_expression" &&
      field(node, "type")?.type === "generic_type"),
  callee: (call) => field(call, "function") ?? field(call, "type"),
  ignoredCall: (call) => field(call, "function")?.type === "func_literal",
  callName(call, context) {
    /* node:coverage disable */
    const target = field(call, "function") ?? field(call, "type");
    if (target === null) return null;
    /* node:coverage enable */
    if (target.type === "func_literal") return null;
    const name = goChain(target);
    if (name !== null) return goName(name, context, call);
    if (target.type === "selector_expression") {
      const method = field(target, "field");
      /* node:coverage disable */
      return method === null ? null : `${ANY_RECEIVER}.${method.text}`;
      /* node:coverage enable */
    }
    return null;
  },
  callArguments(call) {
    /* node:coverage disable */
    const args = field(call, "arguments") ?? field(call, "operand");
    if (args === null) return [];
    /* node:coverage enable */
    return args.type === "argument_list" ? named(args) : [args];
  },
  context(root) {
    const context = emptyContext();
    for (const spec of descendants(root, "import_spec")) {
      const path = literal(field(spec, "path"));
      if (path === null) {
        // A path with escapes this reader does not decode: which package it
        // is, and so what its calls and getters are, is not known here.
        context.callsAmbiguous.push(at(spec));
        context.envAmbiguous.push(at(spec));
        continue;
      }
      context.imported.add(path);
      // cgo: C code (the preamble, or any C function called) can read the
      // environment where the reader cannot see it.
      if (path === "C") context.envAmbiguous.push(at(spec));
      const packageName = lastOf(path, "/");
      const alias = field(spec, "name");
      if (alias === null) {
        for (const name of unique([packageName, goPackageName(path)])) {
          context.packages.add(name);
          context.paths.set(name, path);
        }
        continue;
      }
      if (alias.type === "dot") {
        // Every exported name of the package is in scope unqualified.
        context.callsAmbiguous.push(at(spec));
        if (GO_ENV_PATHS.has(path)) context.envAmbiguous.push(at(spec));
      } else if (alias.type === "package_identifier") {
        context.aliases.set(alias.text, packageName);
        context.packages.add(alias.text);
        context.paths.set(alias.text, path);
      }
    }
    // `//go:linkname local os.Getenv` binds a local name to any function.
    for (const comment of descendants(root, "comment"))
      if (comment.text.startsWith("//go:linkname")) {
        context.envAmbiguous.push(at(comment));
        context.callsAmbiguous.push(at(comment));
      }
    return context;
  },
  candidates(name, context, at) {
    // `"github.com/sirupsen/logrus".Error` (used as log) is logrus.Error.
    const quoted = /^"([^"]*)"(\..*)$/.exec(name);
    if (quoted !== null) {
      const known = goKnownName(quoted[1] as string);
      return known === null ? [name] : [name, `${known}${quoted[2]}`];
    }
    const spelled = goName(name, context, at);
    const cut = spelled.indexOf(".");
    if (cut === -1 || spelled.startsWith('"')) return [spelled];
    const root = spelled.slice(0, cut);
    // `os.Getenv` is the os package's only when the file imports os; a
    // local variable or parameter named os is just a value.
    if (!context.packages.has(root))
      return [`${ANY_RECEIVER}.${lastOf(spelled, ".")}`];
    return unique([aliased(spelled, ".", context.aliases), spelled]);
  },
  methodOwners: goOwners,
  /**
   * A Go package spans the files of its directory, so a name this file uses
   * but does not declare may be a package-level getter value or wrapper of
   * another file (`var getenv = os.Getenv` in env.go, then `getenv("X")`
   * here; a `getEnv(k, d string)` helper; a `cfg` whose methods read the
   * environment). For env, every such name is marked: the host keeps the row,
   * refusing the read, unless no other file of the package mentions an
   * environment getter at all. Following the package's files this far is
   * sound whatever the chain of helpers is (any read in the package spells a
   * getter in some file of it).
   *
   * A package of the project itself (`config.Get("X")` where package config
   * wraps os.Getenv, or `var Get = os.Getenv` there) is another such file
   * set. For env, every import other than the getters' own packages and cgo
   * (which are read or refused here) is marked: the host keeps the row,
   * refusing the read, when the import path is one of the project's (under
   * the module path of a go.mod, a local replace, or relative) and that
   * package, or a package of the project it imports in turn, can read the
   * environment. The import is marked rather than each use, since importing
   * a package runs its init and package-level initializers, which may read
   * the environment though nothing of it is used. Third-party packages are
   * not followed, as for any direct call.
   */
  shadowed(node, callName, _names, context, extract) {
    if (extract === "calls" || extract === "string_args")
      return goUndeclaredCall(node, callName, context);
    if (extract !== "env") return null;
    if (node.type === "import_spec") {
      const path = literal(field(node, "path"));
      if (path === null || path === "C" || GO_ENV_PATHS.has(path)) return null;
      const alias = field(node, "name");
      return `${alias === null ? lastOf(path, "/") : alias.text} may be a package of the project`;
    }
    const target =
      node.type === "call_expression"
        ? field(node, "function")
        : (node.type === "identifier" || node.type === "type_identifier") &&
            !(
              node.parent?.type === "call_expression" &&
              field(node.parent, "function")?.id === node.id
            )
          ? node
          : null;
    if (
      target === null ||
      (target.type !== "identifier" && target.type !== "type_identifier") ||
      GO_PREDECLARED.has(target.text) ||
      goDeclaredName(target) ||
      goDeclaredHere(target, target.text, context)
    )
      return null;
    return `${target.text} may be declared in another file of the package`;
  },
  valueReference(node, context) {
    if (node.type !== "selector_expression") return null;
    const name = goChain(node);
    /* node:coverage disable */
    if (name === null) return null;
    /* node:coverage enable */
    // A method value on any receiver (`g := l.Error`) may be called later;
    // so may a field of func type, which the syntax cannot tell apart.
    if (!goPackageAt(before(name, "."), node, context) && !goValue(node))
      return null;
    return goName(name, context, node);
  },
  reference(node) {
    if (node.type !== "selector_expression") return null;
    return goChain(node);
  },
  envGetters: GO_ENV_GETTERS,
  envWhole: GO_ENV_WHOLE,
  imports(node, members, unresolved) {
    if (node.type !== "import_spec") return;
    const path = literal(field(node, "path"));
    if (path === null) unresolved.push(at(node));
    else members.push(path);
  },
  thrown(node, _catchNames, members, unresolved, context) {
    if (!GO.isCall(node) || GO.callName(node, context) !== "panic") return;
    let value = GO.callArguments(node)[0];
    if (value?.type === "unary_expression") value = named(value)[0];
    if (value?.type === "composite_literal") {
      const type = field(value, "type");
      if (type !== null) {
        members.push(withoutGenerics(type.text));
        return;
      }
    }
    if (value !== undefined && value.type === "call_expression") {
      const name = GO.callName(value, context);
      if (name !== null && !name.startsWith(ANY_RECEIVER)) {
        members.push(name);
        return;
      }
    }
    unresolved.push(at(node));
  },
  hidesCalls(node, names, context) {
    if (!GO.isCall(node) || names.length === 0) return false;
    if (
      context.imported.has("plugin") &&
      names.some((name) => reflective(name, GO_PLUGIN_CALLS))
    )
      return true;
    if (!context.imported.has("reflect")) return false;
    /* node:coverage disable */
    return names.some((name) =>
      GO_REFLECT_CALLS.has(name.split(".").at(-1) ?? ""),
    );
    /* node:coverage enable */
  },
  conditional: () => false,
  skip: () => false,
  property(node, key, members, unresolved) {
    if (node.type !== "keyed_element") return;
    const parts = named(node);
    const keyNode = parts[0];
    /* node:coverage disable */
    const keyText =
      keyNode === undefined ? "" : keyNode.text.replace(/\s+/g, "");
    const keyLiteral =
      keyNode === undefined ? null : literal(named(keyNode)[0] ?? keyNode);
    /* node:coverage enable */
    if (keyText !== key && keyLiteral !== key) return;
    const valueNode = parts[1];
    /* node:coverage disable */
    const value = literal(
      valueNode === undefined ? null : (named(valueNode)[0] ?? valueNode),
    );
    /* node:coverage enable */
    if (value === null) unresolved.push(at(node));
    else members.push(value);
  },
  catchName: () => null,
};

// ---------------------------------------------------------------- Java

/** java.lang types a bare type name can be without an import. */
const JAVA_LANG_TYPES = new Set([
  "System",
  "Runtime",
  "ProcessBuilder",
  "Thread",
  "Class",
  "ClassLoader",
  "Math",
  "StrictMath",
  "String",
  "Integer",
  "Long",
  "Double",
  "Boolean",
  "Character",
  "Object",
  "Process",
  "ProcessHandle",
]);

const JAVA_REFLECTION = new Set([
  "Class.forName",
  "*.getMethod",
  "*.getDeclaredMethod",
  "*.getMethods",
  "*.getDeclaredMethods",
  "*.invoke",
  "*.invokeExact",
  "*.newInstance",
  "MethodHandles.lookup",
  "MethodHandles.publicLookup",
]);

function javaChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "type_identifier":
    case "this":
    case "super":
      return node.text;
    case "field_access": {
      /* node:coverage disable */
      const object = field(node, "object");
      const name = field(node, "field");
      if (object === null || name === null) return null;
      /* node:coverage enable */
      const left = javaChain(object);
      return left === null ? null : `${left}.${name.text}`;
    }
    case "parenthesized_expression": {
      const inner = named(node)[0];
      /* node:coverage disable */
      return inner === undefined ? null : javaChain(inner);
      /* node:coverage enable */
    }
    default:
      return null;
  }
}

/** `java.lang.System.getenv` is `System.getenv`; other packages stay. */
function withoutJavaLang(name: string): string {
  return name.replace(/^java\.lang\.(?:invoke\.|reflect\.)?(?=[A-Z])/, "");
}

/**
 * Whether a call name is in a reflection table: exactly, by a fully
 * qualified spelling (`java.lang.invoke.MethodHandles.lookup`), or as a
 * method on any receiver (`*.invoke`).
 */
function reflective(name: string, table: ReadonlySet<string>): boolean {
  if (table.has(name)) return true;
  for (const entry of table)
    if (!entry.startsWith(ANY_RECEIVER) && name.endsWith(`.${entry}`))
      return true;
  /* node:coverage disable */
  const method = name.split(".").at(-1) ?? "";
  return table.has(`${ANY_RECEIVER}.${method}`);
  /* node:coverage enable */
}

/**
 * JDK methods a never-call or env claim names (`Runtime.exit`,
 * `System.getenv`). Called on a receiver whose type the reader cannot name
 * (`*.exit`), such a method may be that callee, so the read is refused there.
 */
const JAVA_WATCHED = new Set([
  "getenv",
  "exit",
  "halt",
  "exec",
  "load",
  "loadLibrary",
]);

/** Static factories whose result type the reader knows. */
const JAVA_RETURNS: ReadonlyMap<string, string> = new Map([
  ["Runtime.getRuntime", "Runtime"],
]);

const JAVA_TYPE_DECLARATIONS = new Set([
  "class_declaration",
  "interface_declaration",
  "enum_declaration",
  "record_declaration",
  "annotation_type_declaration",
]);

/** Scopes whose members are visible throughout, whatever their order. */
const JAVA_MEMBER_SCOPES = new Set([
  "program",
  "class_body",
  "interface_body",
  "enum_body",
  "enum_body_declarations",
  "annotation_type_body",
]);

/**
 * What a simple name is bound to in a Java file: a variable with its
 * declared type (null for `var` or an untyped lambda parameter), or a type
 * the file declares, by its qualified name (null when it has none, a
 * top-level type of the default package).
 */
interface JavaBinding {
  readonly value: boolean;
  readonly type: string | null;
}

function javaTypeText(node: Node | null): string | null {
  if (node === null || node.text === "var") return null;
  return withoutGenerics(plainName(node.text));
}

/** The qualified name of a type the file declares. */
function javaQualified(declaration: Node, packageName: string): string | null {
  const names: string[] = [];
  for (let node: Node | null = declaration; node !== null; node = node.parent)
    if (JAVA_TYPE_DECLARATIONS.has(node.type)) {
      const name = field(node, "name");
      /* node:coverage disable */
      if (name !== null) names.unshift(name.text);
      /* node:coverage enable */
    }
  if (packageName === "" && names.length === 1) return null;
  return [...(packageName === "" ? [] : [packageName]), ...names].join(".");
}

function javaDeclares(
  child: Node,
  name: string,
  packageName: string,
): JavaBinding | null {
  if (JAVA_TYPE_DECLARATIONS.has(child.type))
    return field(child, "name")?.text === name
      ? { value: false, type: javaQualified(child, packageName) }
      : null;
  switch (child.type) {
    case "local_variable_declaration":
    case "field_declaration":
    case "constant_declaration":
      for (const declarator of named(child))
        if (
          declarator.type === "variable_declarator" &&
          field(declarator, "name")?.text === name
        )
          return { value: true, type: javaTypeText(field(child, "type")) };
      return null;
    case "formal_parameters":
    case "resource_specification":
      for (const parameter of named(child)) {
        if (parameter.type === "spread_parameter") {
          const declarator = named(parameter).find(
            (part) => part.type === "variable_declarator",
          );
          if (field(declarator ?? parameter, "name")?.text === name)
            return { value: true, type: null };
          continue;
        }
        if (field(parameter, "name")?.text === name)
          return { value: true, type: javaTypeText(field(parameter, "type")) };
      }
      return null;
    default:
      return null;
  }
}

/** The binding of a simple name where `node` is, or null when unbound. */
function javaBinding(
  node: Node,
  name: string,
  context: FileContext,
): JavaBinding | null {
  for (let scope = node.parent; scope !== null; scope = scope.parent) {
    if (scope.type === "lambda_expression") {
      const parameters = field(scope, "parameters");
      if (parameters?.type === "formal_parameters") {
        const found = javaDeclares(parameters, name, context.packageName);
        if (found !== null) return found;
      } else if (
        parameters !== null &&
        (parameters.text === name ||
          named(parameters).some((part) => part.text === name))
      )
        return { value: true, type: null };
      continue;
    }
    if (
      scope.type === "enhanced_for_statement" &&
      field(scope, "name")?.text === name &&
      node.startIndex >= (field(scope, "body")?.startIndex ?? node.endIndex)
    )
      return { value: true, type: javaTypeText(field(scope, "type")) };
    if (scope.type === "catch_clause") {
      const parameter = named(scope).find(
        (part) => part.type === "catch_formal_parameter",
      );
      if (parameter !== undefined && field(parameter, "name")?.text === name)
        return { value: true, type: null };
    }
    const ordered = !JAVA_MEMBER_SCOPES.has(scope.type);
    for (const child of named(scope)) {
      if (ordered && child.endIndex > node.startIndex) break;
      const found = javaDeclares(child, name, context.packageName);
      if (found !== null) return found;
    }
  }
  return null;
}

/**
 * A type name as the reader lists it: a type the file declares by its
 * qualified name, a single-type import that shadows a `java.lang` type by
 * its import (`import other.System`), anything else as spelled. Null when
 * the name is a type the file declares that has no qualified name.
 */
function javaType(
  name: string,
  node: Node,
  context: FileContext,
): string | null {
  const root = before(name, ".");
  const rest = name.slice(root.length);
  const binding = javaBinding(node, root, context);
  if (binding !== null && !binding.value)
    return binding.type === null ? null : `${binding.type}${rest}`;
  // A statically imported field (`import static a.Holder.System`) is a value
  // of a type the reader does not know.
  if (context.aliases.has(root)) return null;
  // A java.lang name that a supertype may declare as a member type or field
  // (`class System` nested in a superclass) is not known to be java.lang's.
  if (
    binding === null &&
    JAVA_LANG_TYPES.has(root) &&
    !context.paths.has(root) &&
    javaInherited(node, root, false) !== "none"
  )
    return null;
  const imported = context.paths.get(root);
  if (imported !== undefined && JAVA_LANG_TYPES.has(root))
    return `${imported}${rest}`;
  return name;
}

/** The supertypes a class, interface, enum, record or anonymous class names. */
function javaSupertypes(declaration: Node): string[] {
  if (declaration.type === "object_creation_expression") {
    const type = javaTypeText(field(declaration, "type"));
    /* node:coverage disable */
    return type === null ? [] : [type];
    /* node:coverage enable */
  }
  const types: Node[] = [];
  for (const child of named(declaration))
    if (child.type === "superclass") types.push(...named(child));
    else if (
      child.type === "super_interfaces" ||
      child.type === "extends_interfaces"
    )
      for (const list of named(child)) types.push(...named(list));
  return types.map((type) => withoutGenerics(plainName(type.text)));
}

/**
 * Whether a type around `node` declares, or inherits, a method (`method`)
 * or a member type or field named `name`: "found", "none", or "unknown"
 * when a supertype is not declared in this file, so its members are not
 * known.
 */
function javaInherited(
  node: Node,
  name: string,
  method: boolean,
): "found" | "unknown" | "none" {
  let file: Node = node;
  while (file.parent !== null) file = file.parent;
  const declared = new Map<string, Node>();
  for (const type of JAVA_TYPE_DECLARATIONS)
    for (const declaration of descendants(file, type)) {
      const declaredName = field(declaration, "name")?.text;
      /* node:coverage disable */
      if (declaredName !== undefined && !declared.has(declaredName))
        /* node:coverage enable */
        declared.set(declaredName, declaration);
    }
  const seen = new Set<number>();
  let unknown = false;
  const search = (declaration: Node, body: Node | null): boolean => {
    if (seen.has(declaration.id)) return false;
    seen.add(declaration.id);
    // A declaration always has a body once it parses.
    /* node:coverage disable */
    const members = body === null ? [] : named(body);
    /* node:coverage enable */
    for (const member of members)
      if (
        method
          ? member.type === "method_declaration" &&
            field(member, "name")?.text === name
          : javaDeclares(member, name, "") !== null
      )
        return true;
    for (const supertype of javaSupertypes(declaration)) {
      const target = declared.get(lastOf(supertype, "."));
      if (target === undefined) unknown = true;
      else if (search(target, field(target, "body"))) return true;
    }
    return false;
  };
  for (let scope = node.parent; scope !== null; scope = scope.parent) {
    if (JAVA_TYPE_DECLARATIONS.has(scope.type)) {
      if (search(scope, field(scope, "body"))) return "found";
    } else if (scope.type === "object_creation_expression") {
      // Only inside the anonymous class body, not in its arguments.
      const body = named(scope).find((part) => part.type === "class_body");
      if (
        body !== undefined &&
        node.startIndex >= body.startIndex &&
        search(scope, body)
      )
        return "found";
    }
  }
  return unknown ? "unknown" : "none";
}

/** java.lang types another file of the package may declare instead. */
const JAVA_SHADOWED = new Set(["System", "Runtime"]);

/**
 * The type a method's receiver is, as the reader names it, or null when it
 * cannot: a variable by its declared type (`Runtime r; r.exit()` is
 * `Runtime.exit`), a cast or `new` by its type, `Runtime.getRuntime()` by
 * its result, a field of a value of unknown type or an undeclared
 * lowercase name by nothing.
 */
function javaReceiver(
  object: Node,
  node: Node,
  context: FileContext,
): string | null {
  switch (object.type) {
    case "parenthesized_expression": {
      const inner = named(object)[0];
      /* node:coverage disable */
      return inner === undefined ? null : javaReceiver(inner, node, context);
      /* node:coverage enable */
    }
    case "cast_expression":
    case "object_creation_expression": {
      const type = javaTypeText(field(object, "type"));
      /* node:coverage disable */
      return type === null ? null : javaType(type, node, context);
      /* node:coverage enable */
    }
    case "method_invocation": {
      const inner = JAVA.callName(object, context);
      /* node:coverage disable */
      if (inner === null) return null;
      /* node:coverage enable */
      const result = JAVA_RETURNS.get(withoutJavaLang(inner));
      return result === undefined ? null : javaType(result, node, context);
    }
    default: {
      const chain = javaChain(object);
      if (chain === null) return null;
      const [root = "", second] = chain.split(".");
      if (root === "this" || root === "super") {
        if (root === "super" || second === undefined) return chain;
        const binding = javaBinding(node, second, context);
        return chain === `this.${second}` && binding?.value && binding.type
          ? javaType(binding.type, node, context)
          : null;
      }
      const binding = javaBinding(node, root, context);
      if (binding?.value)
        return chain === root && binding.type !== null
          ? javaType(binding.type, node, context)
          : null;
      // An unbound lowercase name is a field of a superclass; a package
      // qualifies a type (java.lang.Runtime).
      if (/^[a-z_$]/.test(root) && !/\.[A-Z]/.test(chain)) return null;
      return javaType(chain, node, context);
    }
  }
}

const JAVA: Reader = {
  isCall: (node) => node.type === "method_invocation",
  callee: () => null,
  /* node:coverage disable */
  // Java callName is null only for a call without a name, which never parses.
  ignoredCall: () => false,
  /* node:coverage enable */
  callName(call, context) {
    const name = field(call, "name");
    /* node:coverage disable */
    if (name === null) return null;
    /* node:coverage enable */
    const object = field(call, "object");
    // A bare call of a static import in a class whose supertypes the file
    // does not show may be an inherited method of that name instead.
    if (object === null)
      return context.aliases.has(name.text) &&
        javaInherited(call, name.text, true) === "unknown"
        ? `${ANY_RECEIVER}.${name.text}`
        : name.text;
    const left = javaReceiver(object, call, context);
    return `${left ?? ANY_RECEIVER}.${name.text}`;
  },
  callArguments(call) {
    const args = field(call, "arguments");
    /* node:coverage disable */
    return args === null ? [] : named(args);
    /* node:coverage enable */
  },
  context(root) {
    const context = emptyContext();
    const pkg = named(root).find((part) => part.type === "package_declaration");
    /* node:coverage disable */
    context.packageName =
      pkg === undefined ? "" : plainName(named(pkg)[0]?.text ?? "");
    /* node:coverage enable */
    for (const type of JAVA_TYPE_DECLARATIONS)
      for (const declaration of descendants(root, type)) {
        const name = field(declaration, "name");
        /* node:coverage disable */
        if (name !== null) context.imported.add(name.text);
        /* node:coverage enable */
      }
    for (const declaration of descendants(root, "import_declaration")) {
      const path = named(declaration).find(
        (part) => part.type === "scoped_identifier",
      );
      if (path === undefined) continue;
      const segments = plainName(path.text).split(".");
      if (!/^import\s+static\b/.test(declaration.text)) {
        if (!named(declaration).some((part) => part.type === "asterisk")) {
          const simple = segments.at(-1) as string;
          context.imported.add(simple);
          context.paths.set(simple, segments.join("."));
        }
        continue;
      }
      if (named(declaration).some((part) => part.type === "asterisk")) {
        // `import static a.b.C.*`: any bare call may be one of C's methods.
        context.callsAmbiguous.push(at(declaration));
        if (segments.at(-1) === "System")
          context.envAmbiguous.push(at(declaration));
        continue;
      }
      const member = segments.at(-1);
      if (member !== undefined && segments.length >= 2)
        context.aliases.set(member, segments.join("."));
    }
    return context;
  },
  candidates(name, context, at) {
    // A method the class declares or inherits shadows a static import.
    const bare =
      name.includes(".") ||
      !context.aliases.has(name) ||
      javaInherited(at, name, true) === "found"
        ? name
        : (context.aliases.get(name) as string);
    // Both spellings of a java.lang member name it: System.getenv and
    // java.lang.System.getenv.
    const short = withoutJavaLang(bare);
    /* node:coverage disable */
    const long = JAVA_LANG_TYPES.has(short.split(".")[0] ?? "")
      ? /* node:coverage enable */
        `java.lang.${short}`
      : bare;
    // An imported type is named by its import too: File.delete is
    // java.io.File.delete.
    const root = before(bare, ".");
    const imported = context.paths.get(root);
    const qualified =
      imported === undefined || root === bare
        ? []
        : [`${imported}${bare.slice(root.length)}`];
    return unique([short, long, bare, name, ...qualified]);
  },
  reference: () => null,
  envGetters: new Set(["System.getenv"]),
  envWhole: new Set(),
  envSpecial(node, context, _members, unresolved) {
    // ProcessBuilder.environment() is a mutable view of the whole environment.
    if (
      node.type === "method_invocation" &&
      field(node, "name")?.text === "environment" &&
      JAVA.callArguments(node).length === 0
    ) {
      unresolved.push(at(node));
      return true;
    }
    // `System::getenv` hands the getter on: what it reads is not known.
    if (node.type !== "method_reference") return false;
    const name = JAVA.methodReference?.(node, context) ?? null;
    if (name === null) return false;
    if (!JAVA.candidates(name, context, node).includes("System.getenv"))
      return false;
    unresolved.push(at(node));
    return true;
  },
  imports(node, members) {
    if (node.type !== "import_declaration") return;
    const parts = named(node);
    const path = parts.find(
      /* node:coverage disable */
      (part) => part.type === "scoped_identifier" || part.type === "identifier",
    );
    if (path === undefined) return;
    /* node:coverage enable */
    const wildcard = parts.some((part) => part.type === "asterisk");
    const name = plainName(path.text);
    members.push(wildcard ? `${name}.*` : name);
  },
  thrown(node, catchNames, members, unresolved, context) {
    if (node.type !== "throw_statement") return;
    const value = named(node)[0];
    if (value?.type === "object_creation_expression") {
      const type = field(value, "type");
      if (type !== null) {
        members.push(withoutGenerics(type.text));
        return;
      }
    }
    if (value?.type === "method_invocation") {
      const name = JAVA.callName(value, context);
      if (name !== null && !name.startsWith(ANY_RECEIVER)) {
        members.push(name);
        return;
      }
    }
    if (value?.type === "identifier" && catchNames.includes(value.text)) return;
    unresolved.push(at(node));
  },
  hidesCalls: (node, names) =>
    JAVA.isCall(node) &&
    names.some((name) => reflective(name, JAVA_REFLECTION)),
  refuses(node, callName, names, context, extract, callee) {
    if (callName === null || !JAVA.isCall(node)) return false;
    const method = finalName(callName);
    // A bare call of a static import that may be an inherited method
    // instead (`*.format`) may still be the imported callee.
    const imported =
      field(node, "object") === null ? context.aliases.get(method) : undefined;
    if (
      imported !== undefined &&
      callName !== method &&
      extract === "string_args" &&
      JAVA.candidates(imported, context, node).some((name) =>
        calleeMatches(name, callee),
      )
    )
      return true;
    if (!JAVA_WATCHED.has(method) || callName === method) return false;
    const root = before(callName, ".");
    // A receiver named by a package, java.lang or a type the file imports
    // or declares is known; `*` or another type name may be anything.
    if (
      root !== ANY_RECEIVER &&
      (/^[a-z]/.test(root) ||
        JAVA_LANG_TYPES.has(root) ||
        context.imported.has(root))
    )
      return false;
    if (extract === "env") return method === "getenv";
    if (extract === "string_args") return finalName(callee) === method;
    return extract === "calls";
  },
  shadowed(node, callName, names, context, extract, callee) {
    const name =
      node.type === "method_reference"
        ? (JAVA.methodReference?.(node, context) ?? null)
        : callName;
    if (name === null) return null;
    const root = before(name, ".");
    if (!JAVA_SHADOWED.has(root)) return null;
    const read =
      extract === "calls" ||
      (extract === "env" && finalName(name) === "getenv") ||
      (extract === "string_args" &&
        [name, ...names].some((candidate) => calleeMatches(candidate, callee)));
    if (!read) return null;
    const pkg =
      context.packageName === ""
        ? "the default package"
        : `package ${context.packageName}`;
    return `${root} may be a class of ${pkg}`;
  },
  methodReference(node, context) {
    if (node.type !== "method_reference") return null;
    const parts = named(node);
    const target = parts[0];
    const method = parts.at(-1);
    if (target === undefined || method === undefined || parts.length < 2)
      return null;
    const name = method.type === "identifier" ? method.text : "new";
    return `${javaReceiver(target, node, context) ?? ANY_RECEIVER}.${name}`;
  },
  conditional: () => false,
  skip: () => false,
  catchName(node) {
    if (node.type !== "catch_clause") return null;
    const parameter = named(node).find(
      (child) => child.type === "catch_formal_parameter",
    );
    /* node:coverage disable */
    return parameter === undefined
      ? null
      : (field(parameter, "name")?.text ?? null);
    /* node:coverage enable */
  },
};

// ---------------------------------------------------------------- C#

// Names are compared without `global::` and `System.` (see csharpCandidates).
const CSHARP_ENV = new Set(["Environment.GetEnvironmentVariable"]);
const CSHARP_ENV_WHOLE = new Set([
  "Environment.GetEnvironmentVariables",
  "Environment.ExpandEnvironmentVariables",
]);
const CSHARP_REFLECTION = new Set([
  "Type.GetType",
  "Activator.CreateInstance",
  "Reflection.Assembly.Load",
  "Reflection.Assembly.LoadFrom",
  "Reflection.Assembly.LoadFile",
  "Assembly.Load",
  "Assembly.LoadFrom",
  "Assembly.LoadFile",
  "*.CreateInstance",
  "*.GetMethod",
  "*.GetMethods",
  "*.InvokeMember",
  "*.Invoke",
  "*.DynamicInvoke",
  "*.CreateDelegate",
]);

function withoutSystem(name: string): string {
  return name.replace(/^global::/, "").replace(/^System\./, "");
}

/** System types a bare name can be once `using System` is in effect. */
const CSHARP_SYSTEM_TYPES = new Set([
  "Environment",
  "Console",
  "Activator",
  "Type",
  "AppDomain",
  "GC",
  "Math",
  "Convert",
  "Process",
]);

function csharpChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "this":
    case "this_expression":
    case "base":
    case "base_expression":
    case "predefined_type":
      return csharpId(node.text);
    case "generic_name": {
      const name = named(node).find((child) => child.type === "identifier");
      /* node:coverage disable */
      return name === undefined ? null : csharpId(name.text);
      /* node:coverage enable */
    }
    case "alias_qualified_name":
      // global::System.Environment
      return csharpId(plainName(node.text));
    case "member_access_expression": {
      const expression = field(node, "expression");
      const name = field(node, "name");
      /* node:coverage disable */
      if (name === null || expression === null) return null;
      const member = csharpChain(name) ?? name.text;
      /* node:coverage enable */
      // `this.X()` and `base.X()` name the keyword as the expression.
      const left = csharpChain(expression);
      return left === null ? null : `${left}.${member}`;
    }
    case "parenthesized_expression": {
      const inner = named(node)[0];
      /* node:coverage disable */
      return inner === undefined ? null : csharpChain(inner);
      /* node:coverage enable */
    }
    default:
      return null;
  }
}

/** Places where a member access is passed on or stored rather than called. */
const CSHARP_VALUE_PARENTS = new Set([
  "argument",
  "equals_value_clause",
  "variable_declarator",
  "assignment_expression",
  "return_statement",
  "arrow_expression_clause",
]);

/** Method names of the environment getters (`GetEnvironmentVariable`). */
const CSHARP_ENV_NAMES = new Set(
  [...CSHARP_ENV, ...CSHARP_ENV_WHOLE].map((name) => lastOf(name, ".")),
);

/**
 * Every static method of the System types the reader knows, so that a bare
 * call through `using static` can be given its one owner.
 */
const CSHARP_STATIC_METHODS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  [
    [
      "Environment",
      new Set([
        "Exit",
        "ExpandEnvironmentVariables",
        "FailFast",
        "GetCommandLineArgs",
        "GetEnvironmentVariable",
        "GetEnvironmentVariables",
        "GetFolderPath",
        "GetLogicalDrives",
        "SetEnvironmentVariable",
      ]),
    ],
  ],
);

/**
 * A C# identifier as the compiler reads it: without its verbatim `@`
 * (`@class` is `class`) and with Unicode escapes decoded (`\u0045xit` and
 * `\U00000045xit` are `Exit`).
 */
function csharpId(text: string): string {
  return text
    .replaceAll("@", "")
    .replace(
      /\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{8})/g,
      (spelled, short?: string, long?: string) => {
        const code = Number.parseInt(short ?? long ?? "", 16);
        return code > 0x10ffff ? spelled : String.fromCodePoint(code);
      },
    );
}

const CSHARP_TYPE_DECLARATIONS = new Set([
  "class_declaration",
  "struct_declaration",
  "record_declaration",
  "record_struct_declaration",
  "interface_declaration",
]);

/** The names of the type a member is declared in: short, then qualified. */
function csharpOwner(body: Node): string[] {
  const names: string[] = [];
  let file: Node = body;
  for (let node: Node | null = body; node !== null; node = node.parent) {
    file = node;
    if (
      CSHARP_TYPE_DECLARATIONS.has(node.type) ||
      node.type === "namespace_declaration"
    ) {
      const name = field(node, "name");
      /* node:coverage disable */
      if (name !== null) names.unshift(csharpId(plainName(name.text)));
      /* node:coverage enable */
    }
  }
  const scoped = named(file).find(
    (child) => child.type === "file_scoped_namespace_declaration",
  );
  const namespace = scoped === undefined ? null : field(scoped, "name");
  if (namespace !== null && namespace !== undefined)
    names.unshift(csharpId(plainName(namespace.text)));
  return unique([lastOf(names.join("."), "."), names.join(".")]);
}

/** A declared name, without its verbatim `@`. */
function csharpName(node: Node): string {
  const name = field(node, "name");
  /* node:coverage disable */
  return name === null ? "" : csharpId(name.text);
  /* node:coverage enable */
}

function csharpDeclarators(declaration: Node, name: string): boolean {
  return named(declaration).some(
    (declarator) =>
      declarator.type === "variable_declarator" &&
      csharpName(declarator) === name,
  );
}

/**
 * What a simple name is bound to where `node` is: a method of a type the
 * file declares (with that type's names), a local function or a variable,
 * parameter, field or property; null when the file does not bind it (a
 * base type's member or one a `using static` brings in, here or elsewhere
 * in the project).
 */
function csharpBinding(
  node: Node,
  name: string,
): { readonly owner: readonly string[] } | null {
  const none: readonly string[] = [];
  for (let scope = node.parent; scope !== null; scope = scope.parent) {
    // `class U(Fake Environment)`: a primary constructor's parameters are in
    // scope in the whole type.
    if (CSHARP_TYPE_DECLARATIONS.has(scope.type))
      for (const list of named(scope))
        if (
          list.type === "parameter_list" &&
          named(list).some((parameter) => csharpName(parameter) === name)
        )
          return { owner: none };
    const parameters = field(scope, "parameters");
    if (parameters !== null) {
      if (
        parameters.type === "implicit_parameter" &&
        csharpId(parameters.text) === name
      )
        return { owner: none };
      for (const parameter of named(parameters))
        if (csharpName(parameter) === name) return { owner: none };
    }
    const left =
      scope.type === "foreach_statement" ? field(scope, "left") : null;
    if (
      left !== null &&
      [left, ...named(left)].some((part) => csharpId(part.text) === name)
    )
      return { owner: none };
    for (const child of named(scope)) {
      switch (child.type) {
        case "local_declaration_statement":
        case "field_declaration":
        case "event_field_declaration": {
          const declaration = named(child).find(
            (part) => part.type === "variable_declaration",
          );
          if (declaration !== undefined && csharpDeclarators(declaration, name))
            return { owner: none };
          break;
        }
        case "variable_declaration":
          if (csharpDeclarators(child, name)) return { owner: none };
          break;
        case "method_declaration":
          if (csharpName(child) === name) return { owner: csharpOwner(scope) };
          break;
        case "local_function_statement":
        case "property_declaration":
        case "event_declaration":
        case "catch_declaration":
          if (csharpName(child) === name) return { owner: none };
          break;
        // `class C<Environment>`, `void M<Environment>()`: a type parameter
        // (with C# 11 static abstract members, `Environment.Exit()` calls
        // its constraint's member) is in scope in its declaration.
        case "type_parameter_list":
          if (named(child).some((parameter) => csharpName(parameter) === name))
            return { owner: none };
          break;
      }
    }
  }
  return null;
}

/**
 * The names a bare call or method group may be, and whether the reader
 * knows them: a member the file binds, or a method of the one `using
 * static` type that can have it. A name the file does not bind may be any
 * base type's or any `using static` type's, including a `global using
 * static` in another file of the project, so it is not known.
 */
function csharpBare(
  name: string,
  context: FileContext,
  at: Node,
): { readonly names: string[]; readonly known: boolean } {
  const binding = csharpBinding(at, name);
  if (binding !== null)
    return {
      names: [name, ...binding.owner.map((owner) => `${owner}.${name}`)],
      known: true,
    };
  const owners = context.staticTypes.filter(
    (type) => CSHARP_STATIC_METHODS.get(type)?.has(name) ?? true,
  );
  const [owner] = owners;
  if (
    owners.length !== 1 ||
    owner === undefined ||
    !CSHARP_STATIC_METHODS.has(owner)
  )
    return { names: [name], known: false };
  return {
    names: [`${owner}.${name}`, `System.${owner}.${name}`, name],
    known: true,
  };
}

/**
 * Expressions and clauses that declare a local by a name of their own: a
 * pattern variable (`o is Fake Environment`, `o is var Environment`), an out
 * variable (`out var Environment`), a deconstruction and a query variable.
 */
const CSHARP_DESIGNATIONS = [
  "declaration_pattern",
  "declaration_expression",
  "recursive_pattern",
  "var_pattern",
  "tuple_pattern",
  "parenthesized_variable_designation",
  "from_clause",
  "let_clause",
  "join_clause",
  "join_into_clause",
  "query_continuation",
];

/**
 * Members a local declared by a designation cannot leave: its scope (the
 * enclosing statement, block, lambda, query or initializer) is inside the
 * nearest of them.
 */
const CSHARP_MEMBERS = new Set([
  "method_declaration",
  "constructor_declaration",
  "destructor_declaration",
  "operator_declaration",
  "conversion_operator_declaration",
  "property_declaration",
  "indexer_declaration",
  "event_declaration",
  "field_declaration",
  "event_field_declaration",
]);

/**
 * Whether a designation that declares `name` may be in scope at `at`. Its
 * exact scope is not followed, only the member it is in: wherever that
 * member declares a local of that name, `name.X` in it may be a member of
 * that local, so the reader does not take it for a System type's. A
 * designation outside any member (a top-level statement, whose locals every
 * top-level statement shares, or a primary constructor's base arguments) is
 * taken to be in scope in the whole file.
 */
function csharpDesignates(at: Node, name: string): boolean {
  let file: Node = at;
  while (file.parent !== null) file = file.parent;
  return CSHARP_DESIGNATIONS.some((type) =>
    descendants(file, type).some((node) => {
      if (
        !named(node).some(
          (part) => part.type === "identifier" && csharpId(part.text) === name,
        )
      )
        return false;
      let member: Node | null = node.parent;
      while (member !== null && !CSHARP_MEMBERS.has(member.type))
        member = member.parent;
      if (member === null) return true;
      for (let scope: Node | null = at; scope !== null; scope = scope.parent)
        if (scope.id === member.id) return true;
      return false;
    }),
  );
}

/** A dotted name with a `using` alias at its head replaced by what it names. */
function csharpAliased(name: string, context: FileContext): string {
  return withoutSystem(aliased(withoutSystem(name), ".", context.aliases));
}

/** Whether a type around `node` has a base type this file does not declare. */
function csharpInheritsUnknown(node: Node): boolean {
  let file: Node = node;
  while (file.parent !== null) file = file.parent;
  const declared = new Set<string>();
  for (const type of CSHARP_TYPE_DECLARATIONS)
    for (const declaration of descendants(file, type))
      declared.add(csharpName(declaration));
  for (let scope = node.parent; scope !== null; scope = scope.parent) {
    if (!CSHARP_TYPE_DECLARATIONS.has(scope.type)) continue;
    const bases = named(scope).find((part) => part.type === "base_list");
    for (const base of bases === undefined ? [] : named(bases))
      if (
        !declared.has(
          lastOf(withoutGenerics(csharpId(plainName(base.text))), "."),
        )
      )
        return true;
  }
  return false;
}

/**
 * A member access as the reader lists it: on a variable, parameter, field
 * or property the file binds (`var Environment = new Fake()`), or on a name
 * that is a type this file declares or, for a System type's name, a member
 * a base type may declare, the receiver is not the System type, so the
 * member is `*.Name`.
 */
function csharpReceiver(name: string, at: Node): string {
  const root = before(name, ".");
  if (root === name || root === "this" || root === "base") return name;
  const method = `${ANY_RECEIVER}.${lastOf(name, ".")}`;
  const binding = csharpBinding(at, root);
  if (binding !== null) return binding.owner.length === 0 ? method : name;
  if (csharpDesignates(at, root)) return method;
  let file: Node = at;
  while (file.parent !== null) file = file.parent;
  for (const type of [...CSHARP_TYPE_DECLARATIONS, "enum_declaration"])
    if (descendants(file, type).some((node) => csharpName(node) === root))
      return method;
  return CSHARP_SYSTEM_TYPES.has(root) && csharpInheritsUnknown(at)
    ? method
    : name;
}

/** Whether an identifier is a value handed on (an argument, an initializer). */
function csharpValuePosition(node: Node): boolean {
  const parent = node.parent;
  /* node:coverage disable */
  if (parent === null) return false;
  /* node:coverage enable */
  switch (parent.type) {
    case "parenthesized_expression":
      return csharpValuePosition(parent);
    // `Run!`: the null-forgiving operator hands its operand on.
    case "postfix_unary_expression":
      return parent.text.endsWith("!") && csharpValuePosition(parent);
    // `(Action<string>)Run`: the cast's value, wherever the cast is.
    case "cast_expression":
      return field(parent, "value")?.id === node.id;
    case "conditional_expression":
      return field(parent, "condition")?.id !== node.id;
    // `k switch { 1 => Run, ... }`: an arm's value, not its pattern.
    case "switch_expression_arm":
      return named(parent).at(-1)?.id === node.id;
    // `g ?? Run`: either operand is the value.
    case "binary_expression":
      return parent.children.some((token) => token?.type === "??");
    // `() => Run`: an expression-bodied lambda returns the method group.
    case "lambda_expression":
      return field(parent, "body")?.id === node.id;
    // `new { F = Run }`: the member's value, not its name.
    case "anonymous_object_creation_expression":
      return node.nextSibling?.type !== "=";
    case "initializer_expression":
    case "expression_element": // `[Run]`
    case "yield_statement":
      return true;
  }
  if (!CSHARP_VALUE_PARENTS.has(parent.type)) return false;
  // `Run(name: x)`: the parameter's name is no value.
  if (parent.type === "argument" && field(parent, "name")?.id === node.id)
    return false;
  // `nameof(X)` names X without using it.
  const call = parent.parent?.parent;
  if (
    parent.type === "argument" &&
    call?.type === "invocation_expression" &&
    field(call, "function")?.text === "nameof"
  )
    return false;
  if (parent.type === "variable_declarator")
    return field(parent, "name")?.id !== node.id;
  if (parent.type === "assignment_expression")
    return field(parent, "right")?.id === node.id;
  return true;
}

/** Members holding a copy of the process environment (`ProcessStartInfo`'s). */
const CSHARP_ENV_COPIES = new Set(["Environment", "EnvironmentVariables"]);

/**
 * Whether a member access reads a copy of the environment
 * (`new ProcessStartInfo().Environment["X"]`, `psi?.EnvironmentVariables`):
 * any `.Environment` or `.EnvironmentVariables` other than the System type.
 */
function csharpChildEnvironment(node: Node, context: FileContext): boolean {
  if (
    node.type !== "member_access_expression" &&
    node.type !== "member_binding_expression"
  )
    return false;
  const name = field(node, "name");
  if (name === null || !CSHARP_ENV_COPIES.has(csharpChain(name) ?? ""))
    return false;
  if (node.type === "member_binding_expression") return true;
  const chain = csharpChain(node);
  return (
    chain === null ||
    csharpAliased(chain, context) !== "Environment" ||
    finalName(chain) !== "Environment"
  );
}

const CSHARP: Reader = {
  isCall: (node) => node.type === "invocation_expression",
  callee: (call) => field(call, "function"),
  ignoredCall(call) {
    const target = field(call, "function");
    /* node:coverage disable */
    if (target === null) return false;
    /* node:coverage enable */
    if (target.type === "identifier" && target.text === "nameof") return true;
    const inner =
      target.type === "parenthesized_expression" ? named(target)[0] : target;
    return (
      inner?.type === "lambda_expression" ||
      inner?.type === "anonymous_method_expression"
    );
  },
  callName(call, context) {
    const target = field(call, "function");
    /* node:coverage disable */
    if (target === null) return null;
    /* node:coverage enable */
    if (target.type === "identifier" && target.text === "nameof") return null;
    const name = csharpChain(target);
    // `using Environment = Lib.FakeEnvironment`: the call is listed under
    // what the alias names, never under the alias's spelling.
    if (name !== null) {
      const received = csharpReceiver(name, call);
      return context.aliases.has(before(withoutSystem(received), "."))
        ? csharpAliased(received, context)
        : received;
    }
    // `a?.B()` is a conditional access, whose binding names no receiver.
    if (target.type === "member_access_expression") {
      const member = field(target, "name");
      /* node:coverage disable */
      return member === null
        ? null
        : `${ANY_RECEIVER}.${csharpChain(member) ?? member.text}`;
      /* node:coverage enable */
    }
    return null;
  },
  callArguments(call) {
    const args = field(call, "arguments");
    /* node:coverage disable */
    if (args === null) return [];
    /* node:coverage enable */
    return named(args).map((argument) =>
      argument.type === "argument"
        ? /* node:coverage ignore next */
          (named(argument).at(-1) ?? argument)
        : argument,
    );
  },
  context(root) {
    const context = emptyContext();
    for (const directive of descendants(root, "using_directive")) {
      const alias = field(directive, "name");
      const path = named(directive)
        /* node:coverage disable */
        .filter((part) => part.id !== alias?.id)
        .at(-1);
      if (path === undefined) continue;
      /* node:coverage enable */
      const target = withoutSystem(
        withoutGenerics(csharpId(plainName(path.text))),
      );
      if (alias !== null) context.aliases.set(csharpId(alias.text), target);
      else if (
        /^global\s+using\s+static\b|^using\s+static\b/.test(directive.text)
      )
        context.staticTypes.push(target);
    }
    return context;
  },
  candidates(name, context, at) {
    // A bare name is a member the file binds or one `using static` type's.
    if (!/[.:]/.test(name)) return csharpBare(name, context, at).names;
    const resolved = csharpAliased(name, context);
    // Both spellings of a System member name it: Environment.X and
    // System.Environment.X.
    const long = CSHARP_SYSTEM_TYPES.has(before(resolved, "."))
      ? [`System.${resolved}`]
      : [];
    // An alias's own spelling names nothing else.
    const spelled = context.aliases.has(before(withoutSystem(name), "."))
      ? []
      : [name];
    return unique([resolved, ...long, ...spelled]);
  },
  refuses(node, callName, names, context, extract, callee) {
    if (extract === "env" && csharpChildEnvironment(node, context)) return true;
    const call = CSHARP.isCall(node);
    const bare =
      call && callName !== null && !/[.:]/.test(callName)
        ? callName
        : node.type === "identifier" &&
            CSHARP_ENV_NAMES.has(csharpId(node.text)) &&
            csharpValuePosition(node)
          ? csharpId(node.text)
          : null;
    if (bare !== null) {
      if (csharpBare(bare, context, node).known) return false;
      if (call && extract === "calls") return true;
      if (call && extract === "string_args") return finalName(callee) === bare;
      return (
        CSHARP_ENV_NAMES.has(bare) && (extract === "env" || extract === "calls")
      );
    }
    // A getter's name as a method group handed on (`Make().GetEnvironmentVariable`,
    // `p.GetEnvironmentVariable`): whatever it names, what it is later
    // called with is not known here.
    if (
      extract === "env" &&
      node.type === "member_access_expression" &&
      node.parent?.type !== "invocation_expression" &&
      CSHARP_ENV_NAMES.has(csharpId(field(node, "name")?.text ?? "")) &&
      csharpValuePosition(node)
    )
      return true;
    // A getter's name on a receiver the reader does not resolve to
    // Environment (a project-wide `global using E = System.Environment`).
    if (
      callName === null ||
      !CSHARP_ENV_NAMES.has(finalName(callName)) ||
      names.some((name) => CSHARP_ENV.has(name) || CSHARP_ENV_WHOLE.has(name))
    )
      return false;
    if (extract === "string_args")
      return finalName(callee) === finalName(callName);
    return extract === "env" || extract === "calls";
  },
  shadowed(node, _callName, _names, context, extract, callee) {
    // A call `Environment.X(..)`, or a method group `Environment.X` handed on.
    const target = CSHARP.isCall(node)
      ? field(node, "function")
      : node.type === "member_access_expression" &&
          node.parent?.type !== "invocation_expression" &&
          csharpValuePosition(node)
        ? node
        : null;
    const spelled = target === null ? null : csharpChain(target);
    if (spelled === null) return null;
    const root = before(spelled, ".");
    // A type of that name declared in any file of the project (its
    // namespace, an enclosing one or the global namespace) or a `global
    // using` alias of it would bind instead of System's.
    if (
      root === spelled ||
      !CSHARP_SYSTEM_TYPES.has(root) ||
      context.aliases.has(root) ||
      csharpReceiver(spelled, node).startsWith(`${ANY_RECEIVER}.`)
    )
      return null;
    const read =
      extract === "calls" ||
      (extract === "env" && CSHARP_ENV_NAMES.has(finalName(spelled))) ||
      (extract === "string_args" &&
        CSHARP.candidates(spelled, context, node).some((name) =>
          calleeMatches(name, callee),
        ));
    return read ? `${root} may be a type of the project` : null;
  },
  valueReference(node, context) {
    // A method group (`Func<string, string> g = Environment.X`, `Run(X.Y)`,
    // `Run(GetEnvironmentVariable)` through `using static`).
    if (node.type === "identifier") {
      if (!csharpValuePosition(node)) return null;
      const name = csharpId(node.text);
      const bare = csharpBare(name, context, node);
      // A variable is a value. A name the file does not bind may be a
      // method group of a base type or of a `using static` type elsewhere:
      // it is a member of an unknown owner.
      if (!bare.known) return `${ANY_RECEIVER}.${name}`;
      return bare.names.length > 1 ? (bare.names[0] as string) : null;
    }
    if (node.type !== "member_access_expression") return null;
    if (!csharpValuePosition(node)) return null;
    const chain = csharpChain(node);
    // `Process.GetCurrentProcess().Kill`, `new Process().Kill`, `ps[0].Kill`:
    // a method group on a receiver no name spells is a member of an unknown
    // owner, as a call on it is.
    if (chain === null) {
      const member = field(node, "name");
      /* node:coverage disable */
      if (member === null) return null;
      /* node:coverage enable */
      return `${ANY_RECEIVER}.${csharpChain(member) ?? member.text}`;
    }
    const name = csharpReceiver(chain, node);
    /* node:coverage disable */
    return CSHARP.candidates(name, context, node)[0] ?? name;
    /* node:coverage enable */
  },
  reference(node) {
    if (node.type === "member_access_expression") return csharpChain(node);
    if (node.type === "identifier") return csharpId(node.text);
    return null;
  },
  envGetters: CSHARP_ENV,
  envWhole: CSHARP_ENV_WHOLE,
  imports(node, members) {
    if (node.type !== "using_directive") return;
    const parts = named(node);
    const alias = field(node, "name");
    const path = parts.filter((part) => part.id !== alias?.id).at(-1);
    if (path !== undefined)
      members.push(withoutGenerics(csharpId(plainName(path.text))));
  },
  thrown(node, catchNames, members, unresolved, context) {
    if (node.type !== "throw_statement" && node.type !== "throw_expression")
      return;
    const value = named(node)[0];
    if (value === undefined) return; // `throw;` rethrows the caught exception
    if (value.type === "object_creation_expression") {
      const type = field(value, "type");
      if (type !== null) {
        members.push(withoutGenerics(csharpId(type.text)));
        return;
      }
    }
    if (value.type === "invocation_expression") {
      const name = CSHARP.callName(value, context);
      if (name !== null && !name.startsWith(ANY_RECEIVER)) {
        members.push(name);
        return;
      }
    }
    if (
      value.type === "identifier" &&
      catchNames.includes(csharpId(value.text))
    )
      return;
    unresolved.push(at(node));
  },
  hidesCalls(node, names) {
    if (
      CSHARP.isCall(node) &&
      names.some((name) => reflective(name, CSHARP_REFLECTION))
    )
      return true;
    // A dynamic value binds its members at run time, wherever `dynamic` is
    // its type: a local, a parameter, a field, a property, a cast or a type
    // argument.
    return (
      (node.type === "identifier" || node.type === "predefined_type") &&
      csharpId(node.text) === "dynamic" &&
      node.parent?.type !== "member_access_expression" &&
      node.parent?.type !== "invocation_expression" &&
      node.parent?.type !== "argument"
    );
  },
  conditional: (node) =>
    node.type === "preproc_if" ||
    node.type === "preproc_ifdef" ||
    node.type === "if_directive",
  skip: () => false,
  property(node, key, members, unresolved) {
    const parent = node.parent;
    if (parent?.type !== "initializer_expression") return;
    // `{ { "Mode", "u" } }`: a collection initializer's key and value.
    if (node.type === "initializer_expression") {
      const [keyNode, valueNode, ...rest] = named(node);
      if (keyNode === undefined || valueNode === undefined || rest.length > 0)
        return;
      // A numeric or nested initializer is an array row, not a key.
      if (
        !/string_literal$/.test(keyNode.type) &&
        keyNode.type !== "identifier"
      )
        return;
      const keyValue = literal(keyNode);
      if (keyValue !== null && keyValue !== key) return;
      const value = keyValue === null ? null : literal(valueNode);
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return;
    }
    if (node.type !== "assignment_expression") return;
    const left = field(node, "left");
    /* node:coverage disable */
    if (left === null) return;
    /* node:coverage enable */
    if (left.type === "element_binding_expression") {
      // `{ ["Mode"] = "u" }`: an indexer initializer.
      const index = named(left);
      /* node:coverage disable */
      const argument =
        index[0]?.type === "argument" ? named(index[0]).at(-1) : index[0];
      /* node:coverage enable */
      const keyValue = index.length === 1 ? literal(argument) : null;
      if (keyValue !== null && keyValue !== key) return;
      const value = keyValue === null ? null : literal(field(node, "right"));
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return;
    }
    if (csharpId(left.text) !== key) return;
    const value = literal(field(node, "right"));
    if (value === null) unresolved.push(at(node));
    else members.push(value);
  },
  catchName(node) {
    if (node.type !== "catch_clause") return null;
    const declaration = named(node).find(
      (child) => child.type === "catch_declaration",
    );
    const name = declaration === undefined ? null : field(declaration, "name");
    return name === null || name === undefined ? null : csharpId(name.text);
  },
};

// ---------------------------------------------------------------- Rust

const RUST_ENV = new Set(["std::env::var", "std::env::var_os"]);
const RUST_ENV_WHOLE = new Set(["std::env::vars", "std::env::vars_os"]);
const RUST_ENV_MACROS = new Set([
  "env",
  "option_env",
  "std::env",
  "core::env",
  "std::option_env",
  "core::option_env",
]);

/**
 * C library names that read the environment (`libc::getenv`, an `extern
 * "C"` getenv, `libc::environ`): the key is a C string the reader does not
 * follow, so any mention of one is refused for env.
 */
const RUST_FFI_ENV = new Set([
  "getenv",
  "secure_getenv",
  "__secure_getenv",
  "getenv_s",
  "_wgetenv",
  "_wgetenv_s",
  "_dupenv_s",
  "_wdupenv_s",
  "environ",
  "__environ",
  "_environ",
  "_wenviron",
  "GetEnvironmentVariableA",
  "GetEnvironmentVariableW",
  "GetEnvironmentStringsA",
  "GetEnvironmentStringsW",
]);

/** C library calls that end the process, as `std::process::exit` does. */
const RUST_FFI_EXIT: ReadonlyMap<string, string> = new Map([
  ["exit", "std::process::exit"],
  ["_exit", "std::process::exit"],
  ["_Exit", "std::process::exit"],
  ["quick_exit", "std::process::exit"],
  ["abort", "std::process::abort"],
]);

/**
 * The std names a C exit call stands for: `libc::exit`, or an exit the
 * file declares in an `extern` block, is `std::process::exit` too.
 */
function rustFfiExit(path: string, at: Node): string[] {
  const name = lastOf(path, "::");
  const std = RUST_FFI_EXIT.get(name);
  if (std === undefined) return [];
  const external =
    path.split("::").includes("libc") ||
    descendants(at.tree.rootNode, "foreign_mod_item").some((block) =>
      descendants(block, "function_signature_item").some((item) =>
        rustNamed(item, name),
      ),
    );
  return external ? unique(["std::process::exit", std]) : [];
}

/**
 * An identifier or path without raw-identifier prefixes: `r#env` is the
 * identifier `env`, so `std::r#process::exit` is `std::process::exit`. A raw
 * string (`r#"..."#`) is not an identifier and is left alone.
 */
function rustRaw(text: string): string {
  return text.replace(/(?<![\w#])r#(?=[A-Za-z_])/g, "");
}

/** A path as {@link plainName} spells it, without raw-identifier prefixes. */
function rustPlain(text: string): string {
  return rustRaw(plainName(text));
}

/** Whether an item's name is `name`, spelled raw (`r#name`) or not. */
function rustNamed(item: Node, name: string): boolean {
  const spelled = field(item, "name");
  // Every item the reader asks about has a name.
  /* node:coverage ignore next */
  return spelled !== null && rustRaw(spelled.text) === name;
}

function rustChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "self":
    case "crate":
    case "super":
    case "field_identifier":
    case "type_identifier":
    case "scoped_identifier":
    case "scoped_type_identifier":
    case "generic_function": {
      // `<T as Trait>::m` names a method of whichever impl T resolves to.
      if (node.text.trimStart().startsWith("<")) return null;
      // A comment between segments is not part of the path.
      return withoutGenerics(rustPlain(node.text));
    }
    case "field_expression": {
      const value = field(node, "value");
      const name = field(node, "field");
      /* node:coverage disable */
      if (value === null || name === null) return null;
      /* node:coverage enable */
      const left = rustChain(value);
      return left === null ? null : `${left}.${rustRaw(name.text)}`;
    }
    case "parenthesized_expression": {
      const inner = named(node)[0];
      /* node:coverage disable */
      return inner === undefined ? null : rustChain(inner);
      /* node:coverage enable */
    }
    default:
      return null;
  }
}

function rustUseTree(node: Node, prefix: string, members: string[]): void {
  const join = (left: string, right: string) =>
    left === "" ? right : `${left}::${right}`;
  switch (node.type) {
    case "use_as_clause": {
      const path = field(node, "path");
      if (path !== null) rustUseTree(path, prefix, members);
      return;
    }
    case "use_wildcard": {
      const path = named(node)[0];
      members.push(
        join(
          path === undefined ? prefix : join(prefix, rustPlain(path.text)),
          "*",
        ),
      );
      return;
    }
    case "scoped_use_list": {
      const path = field(node, "path");
      const list = field(node, "list");
      const base = path === null ? prefix : join(prefix, rustPlain(path.text));
      if (list !== null) rustUseTree(list, base, members);
      return;
    }
    case "use_list":
      for (const item of named(node)) rustUseTree(item, prefix, members);
      return;
    case "self":
      members.push(prefix);
      return;
    default:
      members.push(join(prefix, rustPlain(node.text)));
  }
}

/** The local names a `use` tree binds, each to the path it names. */
function rustUseBindings(
  node: Node,
  prefix: string,
  bind: (local: string, path: string) => void,
  glob: (path: string, at: Node) => void,
): void {
  const join = (left: string, right: string) =>
    left === "" ? right : `${left}::${right}`;
  /* node:coverage disable */
  const lastSegment = (path: string) => path.split("::").at(-1) ?? path;
  /* node:coverage enable */
  switch (node.type) {
    case "use_as_clause": {
      const path = field(node, "path");
      const alias = field(node, "alias");
      if (path === null || alias === null || rustRaw(alias.text) === "_")
        return;
      // `use std::env::{self as e}` binds e to std::env itself.
      const spelled = rustPlain(path.text);
      bind(
        rustRaw(alias.text),
        spelled === "self" ? prefix : join(prefix, spelled),
      );
      return;
    }
    case "use_wildcard": {
      const path = named(node)[0];
      glob(
        path === undefined ? prefix : join(prefix, rustPlain(path.text)),
        node,
      );
      return;
    }
    case "scoped_use_list": {
      const path = field(node, "path");
      const list = field(node, "list");
      const base = path === null ? prefix : join(prefix, rustPlain(path.text));
      if (list !== null) rustUseBindings(list, base, bind, glob);
      return;
    }
    case "use_list":
      for (const item of named(node)) rustUseBindings(item, prefix, bind, glob);
      return;
    case "self":
      bind(lastSegment(prefix), prefix);
      return;
    default: {
      const path = join(prefix, rustPlain(node.text));
      bind(lastSegment(path), path);
    }
  }
}

/**
 * A macro's tokens, spaced, without comments: a comment between path
 * segments (`std::` comment `env`) does not split the path, and one inside a string
 * is not a comment.
 */
function rustTokens(node: Node): string {
  if (node.type === "line_comment" || node.type === "block_comment") return " ";
  if (node.childCount === 0)
    return node.type === "identifier" ? rustRaw(node.text) : node.text;
  return node.children
    .map(
      (child) =>
        /* node:coverage disable */
        child === null ? "" : rustTokens(child),
      /* node:coverage enable */
    )
    .join(" ");
}

/** `::std::env::var` and `core::env` name the same items as `std::env`. */
function rustCanonical(path: string): string {
  return path.replace(/^::/, "").replace(/^core::/, "std::");
}

/** Whether a node is part of an attribute (`#[path(arguments)]`). */
function insideRustAttribute(node: Node): boolean {
  for (let current = node.parent; current !== null; current = current.parent)
    if (current.type === "attribute") return true;
  return false;
}

function rustMacroName(node: Node): string {
  const name = field(node, "macro");
  /* node:coverage disable */
  return name === null ? "" : rustPlain(name.text);
  /* node:coverage enable */
}

function rustAttribute(node: Node): string {
  return plainName(node.text);
}

/** The attribute items that annotate an item: its preceding siblings. */
function rustAttributes(node: Node): string[] {
  const attributes: string[] = [];
  let previous = node.previousNamedSibling;
  while (previous !== null && previous.type === "attribute_item") {
    attributes.push(rustAttribute(previous));
    previous = previous.previousNamedSibling;
  }
  return attributes;
}

const RUST_ITEM_PARENTS = new Set(["source_file", "declaration_list"]);

/**
 * Built-in attributes that generate no code that calls or panics. Any other
 * attribute (a procedural attribute macro such as `#[tokio::main]`) may
 * rewrite the item, so `calls` and `thrown` refuse it.
 */
const RUST_INERT_ATTRIBUTES = new Set([
  "allow",
  "warn",
  "deny",
  "forbid",
  "expect",
  "deprecated",
  "must_use",
  "doc",
  "inline",
  "cold",
  "track_caller",
  "non_exhaustive",
  "repr",
  "test",
  "ignore",
  "should_panic",
  "automatically_derived",
  "no_mangle",
  "export_name",
  "link_name",
  "used",
  "path",
  "macro_use",
  "macro_export",
  "feature",
  "no_std",
  "no_implicit_prelude",
  "recursion_limit",
  "crate_type",
  "crate_name",
  "rustfmt::skip",
  "diagnostic::on_unimplemented",
]);
/** Derives whose generated impls call nothing outside the type's fields. */
const RUST_STD_DERIVES = new Set([
  "Debug",
  "Clone",
  "Copy",
  "PartialEq",
  "Eq",
  "Hash",
  "Default",
  "PartialOrd",
  "Ord",
]);

function rustAttributeHidesCalls(node: Node): boolean {
  if (node.type !== "attribute_item" && node.type !== "inner_attribute_item")
    return false;
  const attribute = named(node).find((child) => child.type === "attribute");
  /* node:coverage disable */
  if (attribute === undefined) return true;
  const path = plainName(named(attribute)[0]?.text ?? "");
  /* node:coverage enable */
  // cfg and cfg_attr are reported as conditional compilation.
  if (path === "cfg" || path === "cfg_attr") return false;
  if (path.startsWith("clippy::") || path.startsWith("rustfmt::")) return false;
  if (path === "derive") {
    const list = field(attribute, "arguments");
    const traits = list === null ? [] : named(list).map((item) => item.text);
    return traits.some(
      (item) =>
        !RUST_STD_DERIVES.has(item.replace(/^(?:::)?(?:std|core)::\w+::/, "")),
    );
  }
  return !RUST_INERT_ATTRIBUTES.has(path);
}

/**
 * Derives of common crates whose generated code reads no environment
 * variable and makes no call the item does not name, by the path a `use`
 * or a qualified name gives them.
 */
const RUST_CRATE_DERIVES = new Set([
  "serde::Serialize",
  "serde::Deserialize",
  "thiserror::Error",
  "clap::Parser",
  "clap::Args",
  "clap::Subcommand",
  "clap::ValueEnum",
]);
/** The helper attributes those derives read. */
const RUST_DERIVE_HELPERS = new Set([
  "serde",
  "error",
  "from",
  "source",
  "arg",
  "command",
  "clap",
  "value",
  "group",
]);

/**
 * Whether an attribute may generate code that reads the environment or
 * calls `callee`: any procedural attribute or derive outside the standard
 * library and the known crates' derives, and a known derive's helper that
 * mentions `env` (clap's `#[arg(env = "X")]`) or the callee.
 */
function rustAttributeGenerates(
  node: Node,
  context: FileContext,
  callee: string,
): boolean {
  if (!rustAttributeHidesCalls(node)) return false;
  const attribute = named(node).find((child) => child.type === "attribute");
  /* node:coverage disable */
  if (attribute === undefined) return true;
  const path = plainName(named(attribute)[0]?.text ?? "");
  /* node:coverage enable */
  if (path === "derive") {
    const list = field(attribute, "arguments");
    // The list is tokens: `serde::Serialize` is three of them.
    /* node:coverage disable */
    const traits =
      list === null
        ? []
        : rustTokens(list).replace(/\s+/g, "").slice(1, -1).split(",");
    /* node:coverage enable */
    return traits.some((name) => {
      return (
        !RUST_STD_DERIVES.has(
          name.replace(/^(?:::)?(?:std|core)::\w+::/, ""),
        ) && !RUST_CRATE_DERIVES.has(rustPath(name, node).path)
      );
    });
  }
  if (
    !RUST_DERIVE_HELPERS.has(path) ||
    context.aliases.has(path) ||
    context.imported.has(path)
  )
    return true;
  const tokens = rustTokens(attribute);
  return (
    /\benv\b/.test(tokens) ||
    (callee !== "" && new RegExp(`\\b${finalName(callee)}\\b`).test(tokens))
  );
}

/** The last segments of the environment getters (`var`, `vars_os`). */
const RUST_ENV_NAMES = new Set(
  [...RUST_ENV, ...RUST_ENV_WHOLE].map((name) => lastOf(name, "::")),
);

/**
 * Standard macros whose expansion holds only their own tokens, which the
 * reader scans. Any other macro (one the project defines with
 * `macro_rules!`, one from another crate, `include!`) may expand to
 * environment reads, `use` items or calls the file does not show.
 */
const RUST_STD_MACROS = new Set([
  "assert",
  "assert_eq",
  "assert_ne",
  "cfg",
  "column",
  "compile_error",
  "concat",
  "dbg",
  "debug_assert",
  "debug_assert_eq",
  "debug_assert_ne",
  "env",
  "eprint",
  "eprintln",
  "file",
  "format",
  "format_args",
  "include_bytes",
  "include_str",
  "line",
  "matches",
  "module_path",
  "option_env",
  "panic",
  "print",
  "println",
  "stringify",
  "thread_local",
  "todo",
  "unimplemented",
  "unreachable",
  "vec",
  "write",
  "writeln",
]);

/**
 * Macros of common crates that, like the standard ones, expand only to
 * their tokens (formatting, logging, error construction), by the path a
 * `use` or a qualified name gives them.
 */
const RUST_CRATE_MACROS = new Set([
  "anyhow::anyhow",
  "anyhow::bail",
  "anyhow::ensure",
  "anyhow::format_err",
  ...["log", "tracing"].flatMap((crate) =>
    ["trace", "debug", "info", "warn", "error"].map(
      (level) => `${crate}::${level}`,
    ),
  ),
  "log::log",
  "tracing::event",
]);

/** `env!`/`option_env!` nested in another macro's tokens. */
const RUST_NESTED_ENV =
  /(?<![\w:])(?:(?:::)?(?:std|core)\s*::\s*)?(?:option_)?env\s*!/;

/**
 * Whether a macro invocation is a standard macro the file does not rebind,
 * or a known crate's macro by the path the file gives it.
 */
function rustStdMacro(node: Node, context: FileContext): boolean {
  const spelled = rustMacroName(node);
  if (RUST_CRATE_MACROS.has(rustPath(spelled, node).path)) return true;
  const name = rustCanonical(spelled).replace(/^std::/, "");
  return (
    RUST_STD_MACROS.has(name) &&
    !context.imported.has(name) &&
    !context.aliases.has(name) &&
    // A glob of a project module or another crate may bring a macro of
    // that name in.
    (name !== spelled || !context.globbed)
  );
}

/**
 * Whether a standard macro is spelled bare (`println!`, not
 * `std::println!`): a `macro_rules!` of that name in another file of the
 * crate, in textual scope through `#[macro_use]`, would then be called.
 */
function rustBareStdMacro(node: Node, context: FileContext): boolean {
  const spelled = rustMacroName(node);
  return RUST_STD_MACROS.has(spelled) && rustStdMacro(node, context);
}

const RUST_ITEMS = new Set([
  "function_item",
  "function_signature_item",
  "struct_item",
  "enum_item",
  "union_item",
  "trait_item",
  "const_item",
  "static_item",
  "macro_definition",
]);

type RustBinding =
  | { readonly kind: "path"; readonly path: string }
  | { readonly kind: "module"; readonly body: Node | null }
  | { readonly kind: "crate"; readonly crate: string }
  | { readonly kind: "alias" }
  | { readonly kind: "item" };

/** What `name` is bound to by the items directly in a block or module. */
function rustItem(scope: Node, name: string): RustBinding | null {
  for (const child of named(scope)) {
    if (child.type === "type_item") {
      if (!rustNamed(child, name)) continue;
      // `type C = std::process::Command` is followed; a generic alias or one
      // of another kind of type is not.
      const type = field(child, "type");
      return type !== null &&
        field(child, "type_parameters") === null &&
        (type.type === "type_identifier" ||
          type.type === "scoped_type_identifier")
        ? { kind: "path", path: rustPlain(type.text) }
        : { kind: "alias" };
    }
    if (RUST_ITEMS.has(child.type)) {
      if (rustNamed(child, name)) return { kind: "item" };
      continue;
    }
    switch (child.type) {
      case "use_declaration": {
        const argument = field(child, "argument");
        let path: string | null = null;
        /* node:coverage disable */
        if (argument !== null)
          /* node:coverage enable */
          rustUseBindings(
            argument,
            "",
            (local, target) => {
              if (local === name) path = target;
            },
            () => {},
          );
        if (path !== null) return { kind: "path", path };
        break;
      }
      case "mod_item":
        if (rustNamed(child, name))
          return { kind: "module", body: field(child, "body") };
        break;
      case "extern_crate_declaration": {
        const crate = field(child, "name");
        const local = field(child, "alias") ?? crate;
        /* node:coverage disable */
        if (crate !== null && rustRaw(local?.text ?? "") === name)
          /* node:coverage enable */
          return { kind: "crate", crate: rustRaw(crate.text) };
        break;
      }
    }
  }
  return null;
}

/**
 * The blocks and module bodies a path at `node` is resolved in, innermost
 * first, ending at the module it is in (outer modules' names are not in
 * scope inside a `mod`).
 */
function rustScopes(node: Node): Node[] {
  const scopes: Node[] = [];
  for (let scope = node.parent; scope !== null; scope = scope.parent) {
    if (scope.type === "block") scopes.push(scope);
    else if (
      scope.type === "source_file" ||
      (scope.type === "declaration_list" && scope.parent?.type === "mod_item")
    ) {
      scopes.push(scope);
      break;
    }
  }
  return scopes;
}

/**
 * A Rust path resolved through the `use`, `mod` and `extern crate` items
 * the file declares, in the scopes they bind in. `exact` is false when the
 * resolution leaves what the file shows (`crate::`, `super::` out of the
 * file, a module in another file, another crate's item): the path may then
 * be a re-export of anything.
 */
function rustResolve(
  segments: readonly string[],
  scopes: readonly Node[],
  depth = 0,
): { readonly path: string; readonly exact: boolean; readonly opaque?: true } {
  const spelled = { path: segments.join("::"), exact: true };
  const unknown = { path: spelled.path, exact: false };
  const [root = "", ...rest] = segments;
  const std = new Set(["std", "core", "alloc"]);
  if (std.has(root) || (root === "" && std.has(rest[0] ?? "")))
    return { path: rustCanonical(spelled.path), exact: true };
  const module = scopes.at(-1);
  if (depth > 8 || module === undefined || root === "") return unknown;
  if (root === "crate") return unknown;
  if (root === "self") return rustResolve(rest, [module], depth + 1);
  if (root === "super") {
    const parent = module.parent;
    return parent?.type === "mod_item"
      ? rustResolve(rest, rustScopes(parent).slice(-1), depth + 1)
      : unknown;
  }
  for (const [index, scope] of scopes.entries()) {
    const binding = rustItem(scope, root);
    if (binding === null) continue;
    switch (binding.kind) {
      case "path":
        // `use anyhow::anyhow`: the path's root is the crate, not the name
        // the item binds.
        if (before(binding.path, "::") === root)
          return { path: [binding.path, ...rest].join("::"), exact: false };
        return rustResolve(
          [...binding.path.split("::"), ...rest],
          scopes.slice(index),
          depth + 1,
        );
      case "module": {
        if (binding.body === null) return unknown;
        if (rest.length === 0) return spelled;
        const inner = rustResolve(rest, [binding.body], depth + 1);
        return inner.path.startsWith("std::") || !inner.exact ? inner : spelled;
      }
      case "crate":
        return rustResolve([binding.crate, ...rest], scopes, depth + 1);
      case "alias":
        return { ...unknown, opaque: true };
      default:
        return spelled;
    }
  }
  // Not bound here: another crate (or the prelude), which may re-export.
  return unknown;
}

function rustPath(
  name: string,
  at: Node,
): { path: string; exact: boolean; opaque?: true } {
  return rustResolve(name.split("::"), rustScopes(at));
}

const RUST: Reader = {
  isCall: (node) => node.type === "call_expression",
  callee: (call) => field(call, "function"),
  ignoredCall(call) {
    const target = field(call, "function");
    const inner =
      target?.type === "parenthesized_expression" ? named(target)[0] : target;
    return inner?.type === "closure_expression";
  },
  callName(call) {
    const target = field(call, "function");
    /* node:coverage disable */
    if (target === null) return null;
    /* node:coverage enable */
    const name = rustChain(target);
    if (name !== null) return name;
    if (target.type === "field_expression") {
      const method = field(target, "field");
      /* node:coverage disable */
      return method === null ? null : `${ANY_RECEIVER}.${rustRaw(method.text)}`;
      /* node:coverage enable */
    }
    return null;
  },
  callArguments(call) {
    const args = field(call, "arguments");
    /* node:coverage disable */
    return args === null ? [] : named(args);
    /* node:coverage enable */
  },
  context(root) {
    const context = emptyContext();
    // Macros the file defines (they may shadow a standard macro's name).
    for (const definition of descendants(root, "macro_definition")) {
      const name = field(definition, "name");
      /* node:coverage disable */
      if (name !== null) context.imported.add(rustRaw(name.text));
      /* node:coverage enable */
    }
    for (const declaration of descendants(root, "use_declaration")) {
      const argument = field(declaration, "argument");
      /* node:coverage disable */
      if (argument === null) continue;
      /* node:coverage enable */
      rustUseBindings(
        argument,
        "",
        (local, path) => context.aliases.set(local, rustCanonical(path)),
        (path, node) => {
          // A glob in a `#[cfg(test)]` item is not read with it.
          if (rustInTest(node)) return;
          // A glob brings names in unqualified: a bare call may be any of them.
          if (!/^(?:std|core|alloc)(?:::|$)/.test(rustCanonical(path)))
            context.globbed = true;
          context.callsAmbiguous.push(at(node));
          if (/^(?:std|env|self::env)(?:::env)?$/.test(rustCanonical(path)))
            context.envAmbiguous.push(at(node));
        },
      );
    }
    return context;
  },
  candidates(name, _context, at) {
    // `env::var` is std::env::var only where a `use std::env` binds it;
    // without one, or under a `mod env` closer to the call, `env` is a
    // module or crate of the project.
    const path = rustPath(name, at).path;
    return unique([path, name, ...rustFfiExit(path, at)]);
  },
  refuses(node, callName, names, context, extract, callee) {
    // A derive or attribute macro configured with `env` (clap's `#[arg(env
    // = "X")]`) reads the environment in code it generates.
    // An attribute or derive macro (`#[inject_env]`, `#[derive(FromEnv)]`,
    // clap's `#[arg(env = "X")]`) may read the environment or call anything
    // in the code it generates.
    if (node.type === "attribute_item" || node.type === "inner_attribute_item")
      return (
        (extract === "env" || extract === "string_args") &&
        rustAttributeGenerates(node, context, callee)
      );
    if (node.type === "macro_invocation") {
      if (!rustStdMacro(node, context))
        return extract === "env" || extract === "string_args";
      // `concat!(env!("X"))`: a nested built-in reads a variable unseen.
      return (
        extract === "env" &&
        named(node).some(
          (tokens) =>
            tokens.type === "token_tree" &&
            RUST_NESTED_ENV.test(rustTokens(tokens)),
        )
      );
    }
    if (callName === null) {
      // `<std::process::Command>::new("rm")`: a qualified-self callee.
      const target = RUST.isCall(node) ? RUST.callee(node) : null;
      return (
        extract === "string_args" &&
        target !== null &&
        lastOf(rustPlain(target.text), "::") === finalName(callee)
      );
    }
    // A getter's name on a path the reader cannot follow to std::env (a
    // re-export through `crate::`, a module file or another crate, such as
    // `dotenvy::var`) may read the environment.
    if (names.some((name) => name.startsWith("std::env::"))) return false;
    const resolved = rustPath(callName, node);
    // A callee through a type alias the reader does not follow (`type C<T>
    // = ...; C::new(..)`) may be the one asked for.
    if (
      resolved.opaque &&
      extract === "string_args" &&
      finalName(callName) === finalName(callee)
    )
      return true;
    // A bare getter name a glob may bring in (`use inner::*` re-exporting
    // std::env::var).
    if (
      !resolved.exact &&
      !callName.includes("::") &&
      RUST_ENV_NAMES.has(callName) &&
      context.globbed
    ) {
      if (extract === "string_args") return finalName(callee) === callName;
      return extract === "env" || extract === "calls";
    }
    if (
      resolved.exact ||
      !resolved.path.includes("::") ||
      !RUST_ENV_NAMES.has(lastOf(resolved.path, "::"))
    )
      return false;
    if (extract === "string_args")
      return finalName(callee) === lastOf(resolved.path, "::");
    return extract === "env" || extract === "calls";
  },
  shadowed(node, _callName, _names, context, extract) {
    if (
      node.type !== "macro_invocation" ||
      (extract !== "env" &&
        extract !== "imports" &&
        extract !== "string_args") ||
      !rustBareStdMacro(node, context)
    )
      return null;
    return `${rustMacroName(node)} may be a macro_rules! macro of the crate`;
  },
  valueReference(node, context) {
    if (node.type !== "scoped_identifier") return null;
    /* node:coverage disable */
    if (REFERENCE_PARENTS.has(node.parent?.type ?? "")) return null;
    /* node:coverage enable */
    // An attribute's path (`#[rustfmt::skip]`) names no function to call.
    if (insideRustAttribute(node)) return null;
    const name = rustChain(node);
    if (name === null) return null;
    /* node:coverage ignore next */
    return RUST.candidates(name, context, node)[0] ?? name;
  },
  macroNames(node) {
    if (node.type !== "macro_invocation") return [];
    const tokens = named(node).filter((child) => child.type === "token_tree");
    // The arguments are tokens, not expressions: every path they spell may
    // be called or read there.
    return tokens.flatMap((tree) =>
      (
        rustTokens(tree).match(
          /(?:::)?[A-Za-z_]\w*(?:\s*::\s*[A-Za-z_]\w*)*/g,
        ) ?? []
      ).map((path) => path.replace(/\s+/g, "")),
    );
  },
  reference(node) {
    if (node.type !== "scoped_identifier" && node.type !== "identifier")
      return null;
    return rustChain(node);
  },
  envGetters: RUST_ENV,
  envWhole: RUST_ENV_WHOLE,
  envSpecial(node, _context, members, unresolved) {
    // A C getter or the C environment, called, passed on or imported.
    if (
      (node.type === "identifier" ||
        node.type === "scoped_identifier" ||
        node.type === "field_identifier") &&
      node.parent?.type !== "scoped_identifier" &&
      RUST_FFI_ENV.has(lastOf(rustPlain(node.text), "::"))
    ) {
      unresolved.push(at(node));
      return true;
    }
    if (
      node.type !== "macro_invocation" ||
      !RUST_ENV_MACROS.has(rustCanonical(rustMacroName(node)))
    )
      return false;
    const tokens = named(node).find((child) => child.type === "token_tree");
    /* node:coverage disable */
    const value = literal(tokens === undefined ? null : named(tokens)[0]);
    /* node:coverage enable */
    if (value === null) unresolved.push(at(node));
    else members.push(value);
    return true;
  },
  imports(node, members, unresolved, context) {
    if (node.type === "use_declaration") {
      const argument = field(node, "argument");
      if (argument !== null) rustUseTree(argument, "", members);
      return;
    }
    if (node.type === "extern_crate_declaration") {
      const name = field(node, "name");
      if (name !== null) members.push(rustRaw(name.text));
      return;
    }
    // A macro in item position can expand to further `use` items.
    /* node:coverage disable */
    const parent = node.parent?.type ?? "";
    /* node:coverage enable */
    // Any other macro than a standard one can expand to `use` items too.
    if (
      node.type === "macro_invocation" &&
      (RUST_ITEM_PARENTS.has(parent) || !rustStdMacro(node, context))
    )
      unresolved.push(at(node));
  },
  thrown() {
    // Rust has no throw statement; panics are macros, refused with the rest.
  },
  hidesCalls: (node) =>
    node.type === "macro_invocation" || rustAttributeHidesCalls(node),
  conditional(node) {
    if (node.type !== "attribute_item") return false;
    const attribute = rustAttribute(node);
    return (
      /^#!?\[(?:cfg|cfg_attr)\(/.test(attribute) && attribute !== "#[cfg(test)]"
    );
  },
  skip: (node) =>
    RUST_ITEM_PARENTS.has(node.parent?.type ?? "") &&
    node.type !== "attribute_item" &&
    rustAttributes(node).includes("#[cfg(test)]"),
  catchName: () => null,
};

/** Whether a node is inside an item the reader skips as `#[cfg(test)]`. */
function rustInTest(node: Node): boolean {
  for (
    let current: Node | null = node;
    current !== null;
    current = current.parent
  )
    if (RUST.skip(current)) return true;
  return false;
}

const READERS: Readonly<Record<ReferenceLanguage, Reader>> = {
  go: GO,
  java: JAVA,
  csharp: CSHARP,
  rust: RUST,
};

export function isReferenceLanguage(value: string): value is ReferenceLanguage {
  return (REFERENCE_LANGUAGES as readonly string[]).includes(value);
}

/** Read one extract from a parsed file. */
// implements REQ-kibi-tree-sitter-references
export function extractReferences(
  language: ReferenceLanguage,
  root: Node,
  request: ReferenceRequest,
): ReferenceRead {
  const name = LANGUAGE_NAMES[language];
  const broken = firstError(root);
  if (broken !== null)
    return {
      ok: false,
      code: "TREESITTER_REFERENCES_SYNTAX",
      message: `line ${broken.startPosition.row + 1} is not valid ${name}`,
    };
  const reader = READERS[language];
  const { extract } = request;
  if (extract === "property" && reader.property === undefined)
    return {
      ok: false,
      code: "TREESITTER_REFERENCES_UNSUPPORTED",
      message: `${name} has no property values to extract`,
    };
  const callee = request.callee ?? "";
  const key = request.key ?? "";
  const members: string[] = [];
  const unresolved: Unresolved[] = [];
  const context = reader.context(root);
  if (extract === "env") unresolved.push(...context.envAmbiguous);
  if (extract === "calls" || extract === "string_args")
    unresolved.push(...context.callsAmbiguous);
  const isCallee = (node: Node): boolean => {
    const parent = node.parent;
    return (
      parent !== null &&
      reader.isCall(parent) &&
      reader.callee(parent)?.id === node.id
    );
  };
  const catchNames: string[] = [];
  const visit = (node: Node): void => {
    if (reader.skip(node)) return;
    if (reader.conditional(node)) unresolved.push(at(node));
    const caught = reader.catchName(node);
    if (caught !== null) catchNames.push(caught);
    const callName = reader.isCall(node)
      ? reader.callName(node, context)
      : null;
    const names =
      callName === null ? [] : reader.candidates(callName, context, node);
    const macroNames = (reader.macroNames?.(node) ?? []).flatMap((name) =>
      reader.candidates(name, context, node),
    );
    const refused =
      reader.refuses?.(
        node,
        callName,
        [...names, ...macroNames],
        context,
        extract,
        callee,
      ) ?? false;
    const shadow =
      reader.shadowed?.(node, callName, names, context, extract, callee) ??
      null;
    if (shadow !== null)
      unresolved.push({
        line: node.startPosition.row + 1,
        text: `${shadow}: ${at(node).text}`.slice(0, 80),
      });
    // A method on a receiver from a package or type is listed under it too.
    const owned =
      callName === null || !callName.startsWith(`${ANY_RECEIVER}.`)
        ? []
        : (reader.methodOwners?.(node, context) ?? []).map(
            (owner) => `${owner}.${finalName(callName)}`,
          );
    switch (extract) {
      case "imports":
        reader.imports(node, members, unresolved, context);
        break;
      case "env": {
        if (reader.envSpecial?.(node, context, members, unresolved)) return;
        if (refused) {
          unresolved.push(at(node));
          return;
        }
        // A macro's arguments are not parsed: one that mentions a getter
        // reads what it names there, unseen.
        if (
          macroNames.some(
            (name) => reader.envGetters.has(name) || reader.envWhole.has(name),
          )
        ) {
          unresolved.push(at(node));
          return;
        }
        // Reflection and dynamic dispatch may reach a getter by any name.
        if (language !== "rust" && reader.hidesCalls(node, names, context)) {
          unresolved.push(at(node));
          return;
        }
        if (names.some((name) => reader.envGetters.has(name))) {
          const args = reader.callArguments(node);
          const value = literal(args[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
          return;
        }
        if (names.some((name) => reader.envWhole.has(name))) {
          unresolved.push(at(node));
          return;
        }
        // An environment getter used as a value is handed on: whatever it is
        // later called with is not known here.
        if (
          !isCallee(node) &&
          !REFERENCE_PARENTS.has(node.parent?.type ?? "")
        ) {
          const reference = reader.reference(node);
          if (
            reference !== null &&
            reader
              .candidates(reference, context, node)
              .some(
                (name) =>
                  reader.envGetters.has(name) || reader.envWhole.has(name),
              )
          ) {
            unresolved.push(at(node));
            return;
          }
        }
        break;
      }
      case "calls":
        if (refused || reader.hidesCalls(node, names, context))
          unresolved.push(at(node));
        else if (callName !== null) {
          members.push(callName);
          // An alias or static import is listed under what it names, too.
          for (const name of [...names, ...owned])
            if (name !== callName && !name.startsWith(ANY_RECEIVER))
              members.push(name);
        } else if (reader.isCall(node) && !reader.ignoredCall(node))
          // A call through an element, a call result or a cast names no function.
          unresolved.push(at(node));
        else if (!isCallee(node)) {
          const passed =
            reader.methodReference?.(node, context) ??
            reader.valueReference?.(node, context) ??
            null;
          if (passed !== null)
            members.push(
              passed,
              ...reader
                .candidates(passed, context, node)
                .filter((name) => !name.startsWith(ANY_RECEIVER)),
              // A method value on a receiver from a package is its too.
              ...(passed.startsWith(`${ANY_RECEIVER}.`)
                ? (reader.methodOwners?.(node, context) ?? []).map(
                    (owner) => `${owner}.${finalName(passed)}`,
                  )
                : []),
            );
        }
        break;
      case "string_args":
        if (refused || macroNames.some((name) => calleeMatches(name, callee))) {
          unresolved.push(at(node));
          break;
        }
        if (
          [...(callName === null ? [] : [callName]), ...names, ...owned].some(
            (name) => calleeMatches(name, callee),
          )
        ) {
          const value = literal(reader.callArguments(node)[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
        }
        break;
      case "thrown":
        if (reader.hidesCalls(node, names, context) && language === "rust")
          unresolved.push(at(node));
        else reader.thrown(node, catchNames, members, unresolved, context);
        break;
      case "property":
        reader.property?.(node, key, members, unresolved);
        break;
    }
    for (const child of named(node)) visit(child);
    if (caught !== null) catchNames.pop();
  };
  visit(root);
  return { ok: true, members, unresolved };
}
