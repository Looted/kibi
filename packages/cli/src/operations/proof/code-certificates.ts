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

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import {
  runOperationJsonQuery,
  toPrologAtom,
} from "../../public/operations/prolog-json.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { certificateDigest } from "../../public/proof-certificates.js";
import {
  CODE_CERTIFICATE_VERSION,
  type ProofContract,
  type ProofKind,
  isCertificateProofKind,
} from "../../public/proof-protocol.js";
import {
  machineCertificateProblem,
  patternCertificateProblem,
  ruleCertificateProblem,
} from "./code-models.js";

/**
 * What a receipt records about its contract's kind: the evidence level it
 * supports and, for a certificate kind, the certificate and its re-check.
 */
// implements REQ-kibi-code-proof-kinds
export type CertificateVerdict = Readonly<{
  kind: ProofKind;
  evidence_level: "proved" | "tested";
  certificate?: Readonly<Record<string, unknown>>;
  certificate_digest?: string;
  certificate_rejection?: string;
}>;

export type SymbolRow = Readonly<{ id: string; title: string; sourceFile: string }>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadSymbol(
  context: OperationContext,
  symbolId: string,
): Promise<SymbolRow | null> {
  if (context.prolog === undefined) return null;
  const [row] = await loadEntities(context.prolog, {
    id: symbolId,
    type: "symbol",
  });
  if (!row) return null;
  const sourceFile = text(row.sourceFile) || text(row.source_file);
  return { id: symbolId, title: text(row.title), sourceFile };
}

export function readWorkspaceFile(workspaceRoot: string, relative: string) {
  const absolute = path.resolve(workspaceRoot, relative);
  if (!absolute.startsWith(path.resolve(workspaceRoot) + path.sep)) return null;
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
}

const IMPORT_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;

/**
 * Whether `source` (at `sourcePath`) imports `targetPath` and names
 * `identifier`: the domain is read from the code, not hand-listed. A suite
 * that tests compiled output imports the domain from the TypeScript
 * project's `outDir`; given the workspace root, such an import counts when it
 * maps back to the domain's source file under `rootDir`.
 */
// implements REQ-kibi-code-proof-kinds
export function importsDomain(
  source: string,
  sourcePath: string,
  targetPath: string,
  identifier: string,
  workspaceRoot?: string,
): boolean {
  if (identifier === "" || !new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(source))
    return false;
  const target = stripExtension(path.normalize(targetPath));
  if (/\.py$/i.test(sourcePath))
    return pythonImportsModule(source, sourcePath, targetPath);
  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1] ?? "";
    if (!specifier.startsWith(".")) continue;
    const joined = path.normalize(path.join(path.dirname(sourcePath), specifier));
    if (stripExtension(joined) === target) return true;
    if (workspaceRoot === undefined) continue;
    const mapped = compiledToSourcePath(workspaceRoot, joined);
    if (mapped !== null && stripExtension(mapped) === target) return true;
  }
  return false;
}

const PYTHON_FROM_IMPORT = /^\s*from\s+(\.*)([\w.]*)\s+import\b/gm;
const PYTHON_IMPORT = /^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm;

/**
 * Whether a Python proof imports the module at `targetPath`: a relative
 * `from .mod import X` resolved from the proof's package, or an absolute
 * `from pkg.mod import X` / `import pkg.mod` whose dotted path names the
 * file's trailing path segments (src layouts and packages alike).
 */
function pythonImportsModule(
  source: string,
  sourcePath: string,
  targetPath: string,
): boolean {
  const target = path
    .normalize(targetPath)
    .replace(/\.pyi?$/i, "")
    .replace(/[\\/]__init__$/, "");
  const matchesDotted = (dotted: string) => {
    if (dotted === "") return false;
    const tail = dotted.split(".").join(path.sep);
    return target === tail || target.endsWith(`${path.sep}${tail}`);
  };
  for (const match of source.matchAll(PYTHON_FROM_IMPORT)) {
    const dots = match[1] ?? "";
    const module = match[2] ?? "";
    if (dots === "") {
      if (matchesDotted(module)) return true;
      continue;
    }
    let base = path.dirname(path.normalize(sourcePath));
    for (let level = 1; level < dots.length; level++) base = path.dirname(base);
    const resolved = path.join(base, ...module.split(".").filter(Boolean));
    if (resolved === target) return true;
  }
  for (const match of source.matchAll(PYTHON_IMPORT))
    for (const dotted of (match[1] ?? "").split(","))
      if (matchesDotted(dotted.trim())) return true;
  return false;
}

/** Strip `//` and block comments and trailing commas: tsconfig is JSONC. */
function parseJsonc(text: string): unknown {
  let out = "";
  let inString = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        index++;
      } else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") index++;
      out += "\n";
    } else if (char === "/" && next === "*") {
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/"))
        index++;
      index++;
    } else out += char;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

/**
 * Map a workspace-relative path inside a TypeScript project's `outDir` to the
 * matching path under its `rootDir` (the tsconfig's directory when unset),
 * using the nearest tsconfig.json above the path. Null when no tsconfig
 * declares an `outDir` that contains it.
 */
// implements REQ-kibi-code-proof-kinds
export function compiledToSourcePath(
  workspaceRoot: string,
  relativePath: string,
): string | null {
  const absolute = path.resolve(workspaceRoot, relativePath);
  let dir = path.dirname(absolute);
  const root = path.resolve(workspaceRoot);
  for (;;) {
    const config = path.join(dir, "tsconfig.json");
    if (existsSync(config)) {
      try {
        const options = record(
          record(parseJsonc(readFileSync(config, "utf8")))?.compilerOptions,
        );
        const outDir = text(options?.outDir);
        if (outDir !== "") {
          const out = path.resolve(dir, outDir);
          const rel = path.relative(out, absolute);
          if (rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel)) {
            const rootDir = path.resolve(dir, text(options?.rootDir) || ".");
            return path.relative(root, path.join(rootDir, rel));
          }
        }
      } catch {
        // An unreadable tsconfig maps nothing.
      }
    }
    if (dir === root || path.dirname(dir) === dir) return null;
    dir = path.dirname(dir);
  }
}

function stripExtension(file: string): string {
  return file.replace(/\.(?:d\.ts|[cm]?[jt]sx?)$/, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Node's type stripping resolves only exact specifiers. TypeScript apps
// import relative modules without an extension, or with `.js` for a `.ts`
// file; this resolve hook retries those as the TypeScript files they name.
export const TS_RESOLVE_HOOKS = `
const SUFFIXES = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || !/^\\.\\.?\\//.test(specifier)) throw error;
    const base = specifier.replace(/\\.[cm]?js$/, "");
    for (const suffix of SUFFIXES) {
      try {
        return await next(base + suffix, context);
      } catch {}
    }
    throw error;
  }
}
`;

const DOMAIN_EVALUATOR = `
const [file, name] = process.argv.slice(-2);
const { pathToFileURL } = await import("node:url");
if (typeof globalThis.Bun === "undefined") {
  const { register } = await import("node:module");
  register?.("data:text/javascript," + encodeURIComponent(${JSON.stringify(TS_RESOLVE_HOOKS)}));
}
const value = (await import(pathToFileURL(file).href))[name];
let items = null;
if (Array.isArray(value)) items = value;
else if (value instanceof Set) items = [...value];
else if (value instanceof Map) items = [...value.keys()];
else if (value !== null && typeof value === "object") items = Object.keys(value);
const primitive = (item) => ["string", "number", "boolean", "bigint"].includes(typeof item);
const scalar = typeof value === "number" || typeof value === "bigint" ? Number(value) : null;
console.log(JSON.stringify(scalar !== null
  ? { scalar }
  : items === null
  ? { error: \`\${name} is not an array, set, map or object\` }
  : { count: items.length, members: items.every(primitive) ? items.map(String) : null }));
`;

// A Python domain: a list, tuple, set, frozenset, dict or Enum class.
const PYTHON_DOMAIN_EVALUATOR = `
import enum, importlib, json, os, sys
file, name = sys.argv[-2], sys.argv[-1]
# Import the module under its package name, from the directory above its
# topmost package, so absolute and relative imports inside it resolve.
directory, module_name = os.path.split(os.path.splitext(file)[0])
parts = [] if module_name == "__init__" else [module_name]
while os.path.exists(os.path.join(directory, "__init__.py")):
    directory, package = os.path.split(directory)
    parts.insert(0, package)
sys.path.insert(0, directory)
module = importlib.import_module(".".join(parts))
value = getattr(module, name, None)
if isinstance(value, type) and issubclass(value, enum.Enum):
    items = [member.value for member in value]
elif isinstance(value, dict):
    items = list(value.keys())
elif isinstance(value, (list, tuple, set, frozenset)):
    items = list(value)
else:
    items = None
def primitive(item):
    return isinstance(item, (str, int, float, bool))
def text(item):
    if isinstance(item, bool):
        return "true" if item else "false"
    return str(item)
if isinstance(value, (int, float)) and not isinstance(value, bool):
    print(json.dumps({"scalar": value}))
elif items is None:
    print(json.dumps({"error": f"{name} is not a list, tuple, set, dict or Enum"}))
else:
    print(json.dumps({"count": len(items), "members": [text(i) for i in items] if all(primitive(i) for i in items) else None}))
`;

function workspaceBin(workspaceRoot: string, name: string): string | null {
  let dir = path.resolve(workspaceRoot);
  for (;;) {
    const candidate = path.join(dir, "node_modules", ".bin", name);
    if (existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return null;
    dir = path.dirname(dir);
  }
}

/**
 * The Python interpreters a domain loads with, most specific first: the
 * KIBI_PYTHON override, the active virtualenv, a project virtualenv (`.venv`
 * or `venv`) between the domain file and the workspace root, then python3
 * and python on PATH. The system interpreter usually cannot import the
 * project's dependencies, so a project environment comes before it.
 */
// implements REQ-kibi-code-proof-kinds
export function pythonDomainInterpreters(
  workspaceRoot: string,
  sourceFile: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const interpreters: string[] = [];
  const add = (candidate: string | undefined) => {
    if (candidate && !interpreters.includes(candidate))
      interpreters.push(candidate);
  };
  add(env.KIBI_PYTHON?.trim() || undefined);
  const venvPython = (venv: string): string | undefined =>
    [
      path.join(venv, "bin", "python"),
      path.join(venv, "Scripts", "python.exe"),
    ].find((candidate) => existsSync(candidate));
  if (env.VIRTUAL_ENV) add(venvPython(env.VIRTUAL_ENV));
  const root = path.resolve(workspaceRoot);
  let dir = path.dirname(path.resolve(root, sourceFile));
  for (;;) {
    for (const name of [".venv", "venv"]) add(venvPython(path.join(dir, name)));
    if (dir === root || path.dirname(dir) === dir) break;
    if (!dir.startsWith(`${root}${path.sep}`)) break;
    dir = path.dirname(dir);
  }
  add("python3");
  add("python");
  return interpreters;
}

/** The line of a runner's stderr that names the failure. */
function failureLine(stderr: string, python: boolean): string {
  const lines = stderr
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  // A Python traceback names the exception on its last line.
  return (python ? lines.at(-1) : lines[0]) ?? "";
}

/**
 * The domain as the code defines it: Kibi imports the domain_source file
 * itself and reads the named export's members, so a certificate cannot cover
 * a hand-listed subset. A TypeScript or JavaScript domain loads with bun when
 * it is on PATH, else with the workspace's tsx, else with node's type
 * stripping (which retries extensionless relative imports as TypeScript
 * files); a Python domain (`.py`) loads with the first interpreter
 * pythonDomainInterpreters finds.
 */
// implements REQ-kibi-code-proof-kinds
export function evaluateDomain(
  workspaceRoot: string,
  sourceFile: string,
  exportName: string,
  options: Readonly<{
    /** The TypeScript runners to try, in order (default all three). */
    runners?: readonly ("bun" | "tsx" | "node")[];
  }> = {},
):
  | { ok: true; count: number; members: readonly string[] | null }
  | { ok: false; reason: string } {
  const evaluated = evaluateExport(workspaceRoot, sourceFile, exportName, options);
  if (!evaluated.ok) return evaluated;
  if (evaluated.scalar !== undefined)
    return {
      ok: false,
      reason: `${exportName} is a number, not a list, set, map or object`,
    };
  return { ok: true, count: evaluated.count, members: evaluated.members };
}

/**
 * The number a value_source export holds, read the same way as a domain.
 */
// implements REQ-kibi-claim-bound-proofs
export function evaluateScalar(
  workspaceRoot: string,
  sourceFile: string,
  exportName: string,
): { ok: true; value: number } | { ok: false; reason: string } {
  const evaluated = evaluateExport(workspaceRoot, sourceFile, exportName);
  if (!evaluated.ok) return evaluated;
  if (evaluated.scalar === undefined || !Number.isFinite(evaluated.scalar))
    return { ok: false, reason: `${exportName} in ${sourceFile} is not a finite number` };
  return { ok: true, value: evaluated.scalar };
}

function evaluateExport(
  workspaceRoot: string,
  sourceFile: string,
  exportName: string,
  options: Readonly<{
    runners?: readonly ("bun" | "tsx" | "node")[];
  }> = {},
):
  | {
      ok: true;
      count: number;
      members: readonly string[] | null;
      scalar?: number;
    }
  | { ok: false; reason: string } {
  const absolute = path.resolve(workspaceRoot, sourceFile);
  const run = runCodeEvaluator(
    workspaceRoot,
    sourceFile,
    { js: DOMAIN_EVALUATOR, python: PYTHON_DOMAIN_EVALUATOR },
    [absolute, exportName],
    (parsed) => {
      const row = parsed as {
        error?: string;
        count?: number;
        members?: string[] | null;
        scalar?: number;
      };
      return (
        row.error !== undefined ||
        typeof row.scalar === "number" ||
        typeof row.count === "number"
      );
    },
    options,
  );
  if (!run.ok)
    return {
      ok: false,
      reason: `Kibi could not load ${exportName} from ${sourceFile}${run.failure ? `: ${run.failure}` : ""}${run.python ? " (a Python domain loads with KIBI_PYTHON, the active or project virtualenv (.venv or venv), then python3 on PATH)" : " (without bun or the workspace's tsx, node's type stripping loads the domain; a type imported without import type stops it)"}`,
    };
  const parsed = run.value as {
    error?: string;
    count?: number;
    members?: string[] | null;
    scalar?: number;
  };
  if (parsed.error !== undefined) return { ok: false, reason: parsed.error };
  if (typeof parsed.scalar === "number")
    return { ok: true, count: 0, members: null, scalar: parsed.scalar };
  return {
    ok: true,
    count: parsed.count as number,
    members: parsed.members ?? null,
  };
}

/**
 * Run an evaluator script against the workspace code and return the JSON it
 * prints last. A TypeScript or JavaScript file runs with bun when it is on
 * PATH, else the workspace's tsx, else node's type stripping (which retries
 * extensionless relative imports as TypeScript files); a Python file (`.py`)
 * runs with the first interpreter pythonDomainInterpreters finds. A runner
 * whose output `accept` rejects (or that fails to start) yields to the next.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export function runCodeEvaluator(
  workspaceRoot: string,
  sourceFile: string,
  scripts: Readonly<{ js: string; python: string }>,
  args: readonly string[],
  accept: (parsed: unknown) => boolean = () => true,
  options: Readonly<{
    runners?: readonly ("bun" | "tsx" | "node")[];
  }> = {},
):
  | { ok: true; value: unknown; python: boolean }
  | { ok: false; failure: string; python: boolean } {
  const python = /\.py$/i.test(sourceFile);
  const tsx = python ? null : workspaceBin(workspaceRoot, "tsx");
  const runners: [string, string[]][] = python
    ? pythonDomainInterpreters(workspaceRoot, sourceFile).map(
        (interpreter): [string, string[]] => [
          interpreter,
          ["-c", scripts.python],
        ],
      )
    : (options.runners ?? ["bun", "tsx", "node"]).flatMap(
        (runner): [string, string[]][] => {
          if (runner === "bun") return [["bun", ["-e", scripts.js]]];
          if (runner === "tsx")
            return tsx === null
              ? []
              : [[tsx, ["--eval", scripts.js, "--"]]];
          return [
            [
              process.execPath,
              [
                "--experimental-strip-types",
                "--no-warnings",
                "--input-type=module",
                "-e",
                scripts.js,
              ],
            ],
          ];
        },
      );
  let failure = "";
  for (const [command, argv] of runners) {
    const run = spawnSync(command, [...argv, ...args], {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (run.error) continue;
    const line = (run.stdout ?? "").trim().split("\n").pop() ?? "";
    try {
      const parsed = JSON.parse(line) as unknown;
      if (accept(parsed)) return { ok: true, value: parsed, python };
    } catch {
      // Fall through to the next runner.
    }
    failure = failureLine(run.stderr ?? "", python);
  }
  return { ok: false, failure, python };
}

/**
 * Whether an exhaustive certificate covers the domain Kibi evaluated: the
 * same members when they are primitive values, else the same count.
 */
// implements REQ-kibi-code-proof-kinds
export function domainCoverageProblem(
  exportName: string,
  evaluated: Readonly<{ count: number; members: readonly string[] | null }>,
  certified: readonly string[],
): string | null {
  if (evaluated.members !== null) {
    const expected = new Set(evaluated.members);
    const covered = new Set(certified);
    const missing = [...expected].filter((member) => !covered.has(member));
    const extra = [...covered].filter((member) => !expected.has(member));
    if (missing.length === 0 && extra.length === 0) return null;
    return `the certificate does not cover ${exportName} as the code defines it (${[
      missing.length > 0 ? `missing ${missing.slice(0, 5).join(", ")}` : "",
      extra.length > 0 ? `not in the domain ${extra.slice(0, 5).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ")})`;
  }
  return certified.length === evaluated.count
    ? null
    : `the certificate covers ${certified.length} members but ${exportName} has ${evaluated.count}`;
}

type TypeScriptApi = typeof import("typescript");

/**
 * The TypeScript compiler API for a witness: the package nearest the witness
 * first, then the workspace root. TypeScript 7 ships without the JS compiler
 * API, so a 7.x install is skipped for an older one further up, and named in
 * the reason when none is left.
 */
function loadTypeScript(
  workspaceRoot: string,
  absoluteWitness: string,
): { ok: true; ts: TypeScriptApi } | { ok: false; reason: string } {
  const noApi: string[] = [];
  const bases = [
    path.join(path.dirname(absoluteWitness), "noop.js"),
    path.join(workspaceRoot, "package.json"),
  ];
  for (const base of bases) {
    let loaded: Partial<TypeScriptApi> | undefined;
    try {
      loaded = createRequire(base)("typescript") as Partial<TypeScriptApi>;
    } catch {
      continue;
    }
    if (typeof loaded.createProgram === "function")
      return { ok: true, ts: loaded as TypeScriptApi };
    noApi.push(String(loaded.version ?? "unknown"));
  }
  return {
    ok: false,
    reason:
      noApi.length > 0
        ? `the workspace's TypeScript ${noApi[0]} has no compiler API to compile the witness (TypeScript 7 ships without it); add typescript@6 as a dev dependency for typecheck proofs`
        : "Kibi could not load TypeScript from the workspace to compile the witness (install typescript)",
  };
}

/** Options that decide how the witness's imports resolve, from the nearest tsconfig. */
const RESOLUTION_OPTIONS = [
  "module",
  "moduleResolution",
  "baseUrl",
  "paths",
  "rootDirs",
  "customConditions",
  "resolvePackageJsonExports",
  "resolvePackageJsonImports",
  "allowImportingTsExtensions",
  "resolveJsonModule",
  "jsx",
  "jsxImportSource",
  "lib",
  "target",
  "esModuleInterop",
  "allowSyntheticDefaultImports",
  "verbatimModuleSyntax",
] as const;

function projectResolutionOptions(
  ts: TypeScriptApi,
  workspaceRoot: string,
  absoluteWitness: string,
): import("typescript").CompilerOptions {
  const configPath = ts.findConfigFile(
    path.dirname(absoluteWitness),
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (
    configPath === undefined ||
    path.relative(workspaceRoot, configPath).startsWith("..")
  )
    return {};
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error !== undefined) return {};
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  );
  const options: Record<string, unknown> = {};
  for (const key of RESOLUTION_OPTIONS)
    if (parsed.options[key] !== undefined) options[key] = parsed.options[key];
  return options as import("typescript").CompilerOptions;
}

/**
 * Whether a witness can stop compiling when a domain member goes unhandled:
 * it uses the never type (a switch ending in a never assignment) or a
 * satisfies expression (a map over the domain). Read from the syntax tree,
 * so the word never in a comment or a string does not count.
 */
function hasExhaustivenessCheck(
  ts: TypeScriptApi,
  witness: import("typescript").SourceFile,
): boolean {
  const visit = (node: import("typescript").Node): boolean =>
    node.kind === ts.SyntaxKind.NeverKeyword ||
    node.kind === ts.SyntaxKind.SatisfiesExpression ||
    (ts.forEachChild(node, (child) => (visit(child) ? true : undefined)) ??
      false);
  return visit(witness);
}

/**
 * Kibi compiles a typecheck witness itself, with the workspace's TypeScript.
 * Imports resolve the way the project's own tsconfig says (module,
 * moduleResolution, paths, ...), but the checking options stay fixed and
 * strict, so a lax project tsconfig cannot make the never check vacuous. It
 * accepts the witness only with no errors in it.
 */
// implements REQ-kibi-code-proof-kinds
export function compileWitness(
  workspaceRoot: string,
  witnessPath: string,
  options: Readonly<{ requireExhaustiveness?: boolean }> = {},
):
  | { ok: true; version: string }
  | { ok: false; reason: string; errorLines?: number[] } {
  const absolute = path.resolve(workspaceRoot, witnessPath);
  const loaded = loadTypeScript(workspaceRoot, absolute);
  if (!loaded.ok) return loaded;
  const { ts } = loaded;
  const project = projectResolutionOptions(ts, workspaceRoot, absolute);
  // module and moduleResolution must agree, so take both or neither.
  const moduleOptions =
    project.module !== undefined || project.moduleResolution !== undefined
      ? {}
      : {
          module: ts.ModuleKind.NodeNext,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
        };
  const program = ts.createProgram([absolute], {
    target: ts.ScriptTarget.ES2022,
    ...moduleOptions,
    ...project,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    allowJs: true,
    checkJs: true,
    types: [],
  });
  const witness = program.getSourceFile(absolute);
  if (witness === undefined)
    return { ok: false, reason: `Kibi could not read the witness ${witnessPath}` };
  if (options.requireExhaustiveness === true && !hasExhaustivenessCheck(ts, witness))
    return {
      ok: false,
      reason: `the witness ${witnessPath} has no exhaustiveness check (a never type or a satisfies map), so a new domain member would still compile`,
    };
  const errors = [
    ...program.getSyntacticDiagnostics(witness),
    ...program.getSemanticDiagnostics(witness),
  ].filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0)
    return {
      ok: false,
      reason: `TypeScript ${ts.version} rejects the witness ${witnessPath}: ${ts.flattenDiagnosticMessageText(errors[0]?.messageText ?? "", " ")}`,
      // Zero-based witness lines with an error, so a generated witness can
      // say which of its checks failed.
      errorLines: [
        ...new Set(
          errors
            .filter((error) => error.file === witness && error.start !== undefined)
            .map(
              (error) =>
                witness.getLineAndCharacterOfPosition(error.start ?? 0).line,
            ),
        ),
      ],
    };
  return { ok: true, version: ts.version };
}

export type FactConstraint = Readonly<{ operator: string; value: number }>;

/**
 * The constraints the contract's constraint_source facts state on one
 * numeric property, or why they cannot ground a certificate.
 */
async function factConstraints(
  context: OperationContext,
  factIds: readonly string[],
): Promise<
  | {
      ok: true;
      property: string;
      valueType: "int" | "real";
      constraints: FactConstraint[];
    }
  | { ok: false; reason: string }
> {
  if (context.prolog === undefined)
    return { ok: false, reason: "no Prolog runtime is attached to read the facts" };
  const constraints: FactConstraint[] = [];
  const subjects = new Set<string>();
  const valueTypes = new Set<string>();
  for (const id of factIds) {
    const [fact] = await loadEntities(context.prolog, { id, type: "fact" });
    if (!fact) return { ok: false, reason: `constraint_source fact ${id} does not exist` };
    if (text(fact.status) !== "active")
      return { ok: false, reason: `constraint_source fact ${id} is not active` };
    const polarity = text(fact.polarity);
    if (text(fact.fact_kind) !== "property_value" || (polarity !== "" && polarity !== "require"))
      return {
        ok: false,
        reason: `constraint_source fact ${id} is not a required property_value fact`,
      };
    const valueType = text(fact.value_type);
    const value =
      valueType === "int" ? fact.value_int : valueType === "number" ? fact.value_number : undefined;
    const operator = text(fact.operator);
    if (typeof value !== "number" || !["eq", "neq", "lt", "lte", "gt", "gte"].includes(operator))
      return {
        ok: false,
        reason: `constraint_source fact ${id} has no numeric operator and value`,
      };
    subjects.add(`${text(fact.subject_key)}\0${text(fact.property_key)}`);
    valueTypes.add(valueType);
    constraints.push({ operator, value });
  }
  if (subjects.size !== 1)
    return {
      ok: false,
      reason: "the constraint_source facts are about more than one subject and property",
    };
  const [subject = ""] = [...subjects];
  return {
    ok: true,
    property: subject.split("\0")[1] ?? "",
    valueType: valueTypes.has("number") ? "real" : "int",
    constraints,
  };
}

function constraintKey(row: Readonly<{ operator?: unknown; value?: unknown }>): string {
  return `${text(row.operator)}:${String(row.value)}`;
}

const SMT_OPERATORS: Readonly<Record<string, string>> = {
  eq: "=",
  lt: "<",
  lte: "<=",
  gt: ">",
  gte: ">=",
};

function smtNumber(value: number, valueType: "int" | "real"): string {
  const magnitude =
    valueType === "real" && Number.isInteger(value)
      ? `${Math.abs(value)}.0`
      : String(Math.abs(value));
  return value < 0 ? `(- ${magnitude})` : magnitude;
}

/** The SMT-LIB assertion a fact constraint must appear as in the query. */
export function smtAssertion(
  property: string,
  valueType: "int" | "real",
  row: FactConstraint,
): string {
  const value = smtNumber(row.value, valueType);
  return row.operator === "neq"
    ? `(assert (distinct ${property} ${value}))`
    : `(assert (${SMT_OPERATORS[row.operator]} ${property} ${value}))`;
}

/**
 * The values a contract's value_source exports hold, read from the code the
 * same way as a domain (a count measure is the collection's size), or why
 * one cannot be read.
 */
// implements REQ-kibi-claim-bound-proofs
export async function valueSourceValues(
  context: OperationContext,
  contract: ProofContract,
): Promise<
  | { ok: true; values: { symbol_id: string; value: number }[] }
  | { ok: false; reason: string }
> {
  const values: { symbol_id: string; value: number }[] = [];
  for (const source of contract.value_source ?? []) {
    const symbol = await loadSymbol(context, source.symbol_id);
    if (!symbol || symbol.sourceFile === "")
      return {
        ok: false,
        reason: `the value_source symbol ${source.symbol_id} has no source file`,
      };
    const exportName = source.export ?? symbol.title;
    if (source.measure === "count") {
      // A count claim reads the collection itself, not a number kept
      // beside it for the proof.
      const domain = evaluateDomain(
        context.workspaceRoot,
        symbol.sourceFile,
        exportName,
      );
      if (!domain.ok) return domain;
      values.push({ symbol_id: source.symbol_id, value: domain.count });
      continue;
    }
    const evaluated = evaluateScalar(
      context.workspaceRoot,
      symbol.sourceFile,
      exportName,
    );
    if (!evaluated.ok) return evaluated;
    values.push({ symbol_id: source.symbol_id, value: evaluated.value });
  }
  return { ok: true, values };
}

/**
 * arithmetic and smt certificates must rest on the knowledge base and the
 * code: the arithmetic assumptions are exactly the constraint_source facts'
 * constraints plus one `eq` per value_source constant, on a variable named
 * after the fact property, and an smt query declares that constant and
 * asserts each of them.
 */
async function constraintSourceProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
): Promise<string | null> {
  const factIds = contract.constraint_source?.fact_ids ?? [];
  if (factIds.length === 0 && (contract.value_source ?? []).length === 0)
    return `the contract names no constraint_source facts or value_source constants, so the ${contract.kind} certificate proves numbers the test chose`;
  const facts =
    factIds.length === 0
      ? null
      : await factConstraints(context, factIds);
  if (facts !== null && !facts.ok) return facts.reason;
  const sources = await valueSourceValues(context, contract);
  if (!sources.ok) return sources.reason;
  const property =
    facts !== null && facts.ok ? facts.property : text(certificate.variable);
  const valueType: "int" | "real" =
    facts !== null && facts.ok
      ? facts.valueType
      : text(certificate.value_type) === "real" ||
          sources.values.some((row) => !Number.isInteger(row.value))
        ? "real"
        : "int";
  const constraints: FactConstraint[] = [
    ...(facts !== null && facts.ok ? facts.constraints : []),
    ...sources.values.map((row) => ({ operator: "eq", value: row.value })),
  ];
  if (contract.kind === "arithmetic") {
    if (text(certificate.variable) !== property)
      return `the certificate's variable ${text(certificate.variable) || "(none)"} is not the facts' property ${property}`;
    if (text(certificate.value_type) !== valueType)
      return `the certificate's value_type ${text(certificate.value_type)} is not the facts' ${valueType}`;
    const assumptions = Array.isArray(certificate.assumptions)
      ? certificate.assumptions.map((row) => constraintKey(record(row) ?? {}))
      : [];
    const expected = constraints.map(constraintKey);
    const same =
      assumptions.length === expected.length &&
      [...assumptions].sort().join("|") === [...expected].sort().join("|");
    if (!same)
      return `the certificate's assumptions are not exactly the constraint_source facts' constraints and value_source values (${expected.join(", ")})`;
    return null;
  }
  const query = text(certificate.query).replace(/\s+/g, " ");
  const sort = valueType === "int" ? "Int" : "Real";
  if (property === "")
    return "the smt contract names no constraint_source facts, so Kibi cannot tell which constant the query is about";
  if (!query.includes(`(declare-const ${property} ${sort})`))
    return `the query does not declare (declare-const ${property} ${sort}) for the facts' property`;
  for (const row of constraints) {
    const assertion = smtAssertion(property, valueType, row);
    if (!query.includes(assertion))
      return `the query does not assert the constraint_source or value_source constraint ${assertion}`;
  }
  return null;
}

/** The solver re-run behind an smt certificate; unsat is the only proof. */
// implements REQ-kibi-code-proof-kinds
export function rerunSmtQuery(
  solver: string,
  query: string,
): { ok: true } | { ok: false; reason: string } {
  const argv =
    solver === "z3"
      ? ["-smt2", "-in"]
      : solver === "cvc5"
        ? ["--lang", "smt2"]
        : null;
  if (argv === null)
    return { ok: false, reason: `solver ${solver} is not z3 or cvc5` };
  const run = spawnSync(solver, argv, {
    input: query,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (run.error)
    return {
      ok: false,
      reason: `Kibi could not re-run ${solver} on the query: ${run.error.message}`,
    };
  const answer = (run.stdout ?? "").trim().split(/\s+/)[0] ?? "";
  return answer === "unsat"
    ? { ok: true }
    : {
        ok: false,
        reason: `re-running ${solver} on the query answered ${answer || "nothing"}, not unsat`,
      };
}

async function workspaceProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
): Promise<string | null> {
  const kind = contract.kind;
  if (kind === "exhaustive" || kind === "typecheck") {
    const domainId = contract.domain_source?.symbol_id ?? "";
    const named = text(record(certificate.domain)?.symbol_id);
    if (named !== domainId)
      return `the certificate's domain ${named || "(none)"} is not the contract's domain_source ${domainId}`;
    const domain = await loadSymbol(context, domainId);
    if (!domain || domain.sourceFile === "")
      return `the domain_source symbol ${domainId} has no source file`;
    const readers =
      kind === "typecheck"
        ? [contract.witness?.path ?? ""]
        : (
            await Promise.all(
              contract.required_proofs.map((proof) =>
                loadSymbol(context, proof.symbol_id),
              ),
            )
          ).map((symbol) => symbol?.sourceFile ?? "");
    // The export Kibi reads: domain_source.export, else the symbol's title.
    const exportName = contract.domain_source?.export ?? domain.title;
    const importing = readers.some((reader) => {
      if (reader === "") return false;
      const source = readWorkspaceFile(context.workspaceRoot, reader);
      return (
        source !== null &&
        importsDomain(
          source,
          reader,
          domain.sourceFile,
          exportName,
          context.workspaceRoot,
        )
      );
    });
    if (!importing)
      return `the proof does not import ${exportName || domainId} from ${domain.sourceFile}, so its domain may be hand-listed${contract.domain_source?.export === undefined ? ` (Kibi reads the export named by the symbol's title; set domain_source.export when the export has another name)` : ""}`;
    if (kind === "exhaustive") {
      const evaluated = evaluateDomain(
        context.workspaceRoot,
        domain.sourceFile,
        exportName,
      );
      if (!evaluated.ok) return evaluated.reason;
      const members = record(certificate.domain)?.members;
      const problem = domainCoverageProblem(
        exportName,
        evaluated,
        Array.isArray(members) ? members.map(String) : [],
      );
      if (problem !== null) return problem;
    }
    if (kind === "typecheck") {
      const witness = record(certificate.witness);
      const witnessPath = contract.witness?.path ?? "";
      if (text(witness?.path) !== witnessPath)
        return `the certificate's witness is not the contract's witness ${witnessPath}`;
      const content = readWorkspaceFile(context.workspaceRoot, witnessPath);
      if (content === null) return `the witness ${witnessPath} does not exist`;
      const sha = createHash("sha256").update(content).digest("hex");
      if (text(witness?.sha256) !== sha)
        return `the witness sha256 does not match ${witnessPath} in the workspace`;
      // With proves, Kibi decides each claim with its own witness (set
      // equality, required fields), so the author's witness only has to
      // compile. Without proves, the receipt's proved rests on this witness
      // alone, so it must be able to fail when a domain member goes unhandled.
      const compiled = compileWitness(context.workspaceRoot, witnessPath, {
        requireExhaustiveness: (contract.proves ?? []).length === 0,
      });
      if (!compiled.ok) return compiled.reason;
    }
  }
  if (kind === "arithmetic" || kind === "smt") {
    const problem = await constraintSourceProblem(context, contract, certificate);
    if (problem !== null) return problem;
  }
  if (kind === "smt") {
    const solver = text(record(certificate.solver)?.name);
    const rerun = rerunSmtQuery(solver, text(certificate.query));
    if (!rerun.ok) return rerun.reason;
  }
  if (kind === "rule") return ruleCertificateProblem(context, contract, certificate);
  if (kind === "state_machine")
    return machineCertificateProblem(context, contract, certificate);
  if (kind === "regex") return patternCertificateProblem(context, contract, certificate);
  return null;
}

/**
 * Re-check the certificate a certificate-kind run left for one test. A
 * runner kind (e2e, example, property) supports tested evidence and needs
 * no certificate; a certificate kind supports proved evidence only when the
 * certificate re-checks: its structure and arithmetic in code_certificates.pl,
 * and here that the proof read its domain from the code, that the witness is
 * the workspace file, that the solver still answers unsat, and that a rule
 * table, state machine or pattern is what Kibi itself reads from the code.
 */
// implements REQ-kibi-code-proof-kinds
export async function checkCodeCertificate(
  context: OperationContext,
  input: Readonly<{
    testId: string;
    contract: ProofContract;
    outcome: string;
    certificate: unknown;
  }>,
): Promise<CertificateVerdict> {
  const kind: ProofKind = input.contract.kind ?? "e2e";
  if (!isCertificateProofKind(kind))
    return { kind, evidence_level: "tested" };
  const certificate = record(input.certificate);
  if (!certificate)
    return {
      kind,
      evidence_level: "tested",
      certificate_rejection: `the run left no ${CODE_CERTIFICATE_VERSION} for ${input.testId}`,
    };
  const digest = certificateDigest(certificate);
  const rejected = (reason: string): CertificateVerdict => ({
    kind,
    evidence_level: "tested",
    certificate,
    certificate_digest: digest,
    certificate_rejection: reason,
  });
  if (text(certificate.kind) !== kind)
    return rejected(
      `the certificate kind ${text(certificate.kind) || "(none)"} is not the contract kind ${kind}`,
    );
  if (text(certificate.test_id) !== input.testId)
    return rejected(`the certificate is for ${text(certificate.test_id)}`);
  if (input.outcome !== "passed")
    return rejected("the proof run did not pass");
  if (context.prolog === undefined)
    return rejected("no Prolog runtime is attached to re-check the certificate");
  const checked = await runOperationJsonQuery<{
    accepted?: boolean;
    digest?: string;
    reason?: string;
  }>(
    context.prolog,
    "code_certificates.pl",
    `code_certificates:code_certificate_check_json(${toPrologAtom(JSON.stringify(certificate))}, JsonString)`,
    "Code certificate check",
  );
  if (checked.accepted !== true)
    return rejected(checked.reason ?? "the certificate did not re-check");
  // Every later re-check hashes the stored certificate in Prolog, so a
  // certificate whose two canonical forms differ would silently lose proved.
  if (checked.digest !== digest)
    return rejected(
      "the certificate does not hash the same in the CLI and in code_certificates.pl (write non-integer numbers as strings)",
    );
  const problem = await workspaceProblem(context, input.contract, certificate);
  if (problem !== null) return rejected(problem);
  return {
    kind,
    evidence_level: "proved",
    certificate,
    certificate_digest: digest,
  };
}
