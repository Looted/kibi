import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as certificates from "../../../src/operations/proof/code-certificates.js";
import type { CertificateVerdict } from "../../../src/operations/proof/code-certificates.js";
import {
  compiledToSourcePath,
  domainCoverageProblem,
  importsDomain,
  loadSymbol,
  readWorkspaceFile,
  rerunSmtQuery,
  smtAssertion,
} from "../../../src/operations/proof/code-certificates.js";
import * as models from "../../../src/operations/proof/code-models.js";
import * as runner from "../../../src/operations/proof/code-runner.js";
import * as prologJson from "../../../src/public/operations/prolog-json.js";
import { certificateDigest } from "../../../src/public/proof-certificates.js";
import type { ProofContract } from "../../../src/public/proof-protocol.js";
import * as sources from "../../../src/public/proof-sources.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { type FakeEntity, context } from "../../operations-coverage/helpers.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A scratch directory with the given files. */
function workspace(files: Readonly<Record<string, string>> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-code-certs-"));
  roots.push(root);
  for (const [relative, body] of Object.entries(files)) write(root, relative, body);
  return root;
}

function write(root: string, relative: string, body: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, body);
  return absolute;
}

type Spy = {
  mock: { calls: unknown[][] };
  mockImplementation: (implementation: never) => unknown;
  mockRestore: () => void;
};

function spy<T extends object, K extends keyof T>(
  target: T,
  key: K,
  implementation: T[K],
): Spy {
  const handle = spyOn(target, key as never).mockImplementation(
    implementation as never,
  ) as unknown as Spy;
  restores.push(() => handle.mockRestore());
  return handle;
}

describe("JavaScript domain imports", () => {
  const imports = (source: string, sourcePath = "tests/a.test.ts") =>
    importsDomain(source, sourcePath, "tests/domain.ts", "X");

  test("read every import form", () => {
    for (const source of [
      "import { X } from'./domain';",
      "import { X } from './domain';",
      "const m = import('./domain'); X;",
      "const m = import ( './domain' ); X;",
      "import './domain'; X;",
      "import  './domain'; X;",
      "require('./domain'); X;",
      "require ( './domain' ); X;",
      'import { X } from "./domain.js";',
    ]) {
      expect(imports(source)).toBe(true);
    }
    expect(imports("import { X } from './domain';", "tests/a.py.ts")).toBe(true);
  });

  test("need the identifier and a relative import of the file", () => {
    expect(imports("import { Y } from './domain';")).toBe(false);
    expect(
      importsDomain("import { X } from './domain';", "tests/a.ts", "tests/domain.ts", ""),
    ).toBe(false);
    expect(importsDomain("import { X } from 'domain';", "a.ts", "domain.ts", "X")).toBe(
      false,
    );
    expect(imports("import { X } from './other';")).toBe(false);
    expect(
      importsDomain("import { BRAND } from './domain';", "tests/a.ts", "tests/domain.ts", "BRAND.name"),
    ).toBe(true);
  });

  test("strip only a trailing script extension", () => {
    expect(importsDomain("import { X } from './d.mjs';", "a.ts", "d.ts", "X")).toBe(true);
    expect(
      importsDomain("import { X } from './a.js.js';", "t.ts", "a.js.ts", "X"),
    ).toBe(true);
  });

  test("map an import of compiled output back to its source", () => {
    const root = workspace({
      "tsconfig.json": '{ "compilerOptions": { "outDir": "dist", "rootDir": "src" } }',
    });
    const source = "import { X } from '../dist/domain.js';";
    expect(importsDomain(source, "tests/a.ts", "src/domain.ts", "X", root)).toBe(true);
    expect(importsDomain(source, "tests/a.ts", "src/other.ts", "X", root)).toBe(false);
    expect(importsDomain(source, "tests/a.ts", "src/domain.ts", "X")).toBe(false);
    const bare = workspace();
    expect(importsDomain(source, "tests/a.ts", "src/domain.ts", "X", bare)).toBe(false);
  });
});

describe("Python domain imports", () => {
  const target = "src/pkg/domain.py";
  const imports = (source: string, sourcePath = "tests/test_a.py", file = target) =>
    importsDomain(`${source}\nX`, sourcePath, file, "X");

  test("read absolute imports in every spacing", () => {
    for (const source of [
      "from pkg.domain import X",
      "    from pkg.domain import X",
      "from  pkg.domain import X",
      "from pkg.domain  import X",
      "import os, pkg.domain",
      "import os , pkg.domain",
      "import os,pkg.domain",
      "    import pkg.domain",
      "import  pkg.domain",
    ]) {
      expect(imports(source)).toBe(true);
    }
    expect(imports("import pkg.domain", "t.py", "pkg/domain.py")).toBe(true);
    expect(imports("import pkg", "t.py", "pkg/__init__.py")).toBe(true);
    expect(imports("import pkgx", "t.py", "pkg/__init__x.py")).toBe(false);
  });

  test("ignore imports that are not statements or not of the file", () => {
    expect(imports("x = 'from pkg.domain import X'")).toBe(false);
    expect(imports("x = 'import pkg.domain'")).toBe(false);
    expect(imports("import os")).toBe(false);
    expect(imports("from . import X")).toBe(false);
  });

  test("resolve relative imports from the proof's package", () => {
    expect(imports("from .domain import X", "src/pkg/t.py")).toBe(true);
    expect(imports("from .domain import X", "src/other/t.py")).toBe(false);
    expect(imports("from ..pkg.domain import X", "src/sub/t.py")).toBe(true);
    expect(
      imports("from .domain import X", "src/my.pyth/t.py", "src/my.pyth/domain.py"),
    ).toBe(true);
  });
});

describe("SWI-Prolog domain imports", () => {
  test("accept the plunit file beside its source", () => {
    expect(importsDomain("color(red).", "src/x.plt", "src/x.pl", "color/1")).toBe(true);
    expect(importsDomain("color(red).", "src/y.plt", "src/x.pl", "color/1")).toBe(false);
    expect(importsDomain("color(red).", "src/x.pl", "src/x.pl", "color/1")).toBe(false);
    expect(importsDomain("color(red).", "src/x.plt.pl", "src/x.plt.pro", "color/1")).toBe(false);
    expect(importsDomain("color(red).", "src/x.plt.pl", "src/x.plt.pl", "color/1")).toBe(false);
  });

  test("need the predicate's name, without module or arity", () => {
    expect(importsDomain("colors(red).", "src/x.plt", "src/x.pl", "color/1")).toBe(false);
    expect(importsDomain("color(red).", "src/x.plt", "src/x.pl", "m:color/1")).toBe(true);
    expect(importsDomain("color(red).", "src/x.plt", "src/x.pl", "m:n:color/1")).toBe(false);
    expect(importsDomain("color(red).", "src/x.plt", "src/x.pl", "color//12")).toBe(true);
    expect(importsDomain("x :- p/1.", "src/x.plt", "src/x.pl", "p/1/2")).toBe(true);
    expect(importsDomain("'a+b'(x).", "src/x.plt", "src/x.pl", "a+b/1")).toBe(true);
    expect(importsDomain("anything.", "src/x.plt", "src/x.pl", ":")).toBe(false);
  });

  test("follow a load of the file or of its pack library", () => {
    const load = (source: string, target = "src/x.pl") =>
      importsDomain(`${source}\ncolor(red).`, "tests/t.pl", target, "color/1");
    expect(load(":- use_module('../src/x').")).toBe(true);
    expect(load(":- use_module('../src/y'), use_module('../src/x').")).toBe(true);
    expect(load(":- use_module('../src/y').")).toBe(false);
    expect(load("")).toBe(false);
    expect(load(":- use_module(library(mypack)).", "packs/mypack/prolog/mypack.pl")).toBe(
      true,
    );
    expect(load(":- use_module(library(other)).", "packs/mypack/prolog/mypack.pl")).toBe(
      false,
    );
  });
});

describe("compiled output paths", () => {
  test("map a path under outDir to rootDir", () => {
    const root = workspace({
      "tsconfig.json": [
        "{",
        "  // a line comment",
        '  "compilerOptions": { /*/ a block */ "outDir": "out/*x*/", "rootDir": "src//",',
        '    "note": "q\\"//", },',
        "} // trailing",
      ].join("\n"),
    });
    expect(compiledToSourcePath(root, "out/*x*/a.js")).toBe(path.join("src", "a.js"));
  });

  test("default rootDir to the tsconfig's directory", () => {
    const root = workspace({
      "pkg/tsconfig.json": '{// c\n"compilerOptions": { "outDir": "dist" } } /* open',
    });
    expect(compiledToSourcePath(root, "pkg/dist/lib/a.js")).toBe(path.join("pkg", "lib", "a.js"));
  });

  test("keep escaped characters of a string", () => {
    const root = workspace({
      "tsconfig.json": '{ "compilerOptions": { "outDir": "o\\u0075t" } }',
    });
    expect(compiledToSourcePath(root, "out/a.js")).toBe("a.js");
  });

  test("map nothing without a containing outDir", () => {
    const root = workspace({ "tsconfig.json": '{ "compilerOptions": { "rootDir": "src" } }' });
    expect(compiledToSourcePath(root, "lib/a.js")).toBeNull();
    const out = workspace({ "tsconfig.json": '{ "compilerOptions": { "outDir": "dist" } }' });
    expect(compiledToSourcePath(out, "dist")).toBeNull();
    expect(compiledToSourcePath(out, "../elsewhere/a.js")).toBeNull();
    const broken = workspace({ "tsconfig.json": "{ not json" });
    expect(compiledToSourcePath(broken, "dist/a.js")).toBeNull();
    const scalar = workspace({ "tsconfig.json": "5" });
    expect(compiledToSourcePath(scalar, "dist/a.js")).toBeNull();
  });

  test("stop at the workspace root", () => {
    const parent = workspace({ "tsconfig.json": '{ "compilerOptions": { "outDir": "." } }' });
    const root = path.join(parent, "ws");
    mkdirSync(path.join(root, "dist"), { recursive: true });
    expect(compiledToSourcePath(root, "dist/a.js")).toBeNull();
  });
});

describe("workspace files and symbols", () => {
  test("read only files inside the workspace", () => {
    const parent = workspace({ "outside.ts": "out", "ws/inside.ts": "in" });
    const root = path.join(parent, "ws");
    expect(readWorkspaceFile(root, "inside.ts")).toBe("in");
    expect(readWorkspaceFile(root, "../outside.ts")).toBeNull();
    expect(readWorkspaceFile(root, "missing.ts")).toBeNull();
  });

  test("load a symbol's title and source file", async () => {
    const entities: FakeEntity[] = [
      { id: "SYM-a", type: "symbol", title: "A", sourceFile: "a.ts" },
      { id: "SYM-b", type: "symbol", title: "B", source_file: "b.ts" },
      { id: "SYM-c", type: "symbol" },
    ];
    const ctx = context("/w", entities);
    expect(await loadSymbol(ctx, "SYM-a")).toEqual({ id: "SYM-a", title: "A", sourceFile: "a.ts" });
    expect(await loadSymbol(ctx, "SYM-b")).toEqual({ id: "SYM-b", title: "B", sourceFile: "b.ts" });
    expect(await loadSymbol(ctx, "SYM-c")).toEqual({ id: "SYM-c", title: "", sourceFile: "" });
    expect(await loadSymbol(ctx, "SYM-x")).toBeNull();
    // An empty id would match any symbol in the store.
    expect(await loadSymbol(ctx, "")).toBeNull();
    expect(
      await loadSymbol({ workspaceRoot: "/w" } as OperationContext, "SYM-a"),
    ).toBeNull();
  });
});

describe("domain coverage", () => {
  const members = (list: string[]) => ({ count: list.length, members: list });

  test("compare members when the domain has primitive members", () => {
    expect(domainCoverageProblem("Color", members(["a", "b"]), ["b", "a"])).toBeNull();
    expect(
      domainCoverageProblem("Color", members(["a", "b", "c", "d", "e", "f", "g"]), []),
    ).toBe(
      "the certificate does not cover Color as the code defines it (missing a, b, c, d, e)",
    );
    expect(
      domainCoverageProblem("Color", members([]), ["p", "q", "r", "s", "t", "u"]),
    ).toBe(
      "the certificate does not cover Color as the code defines it (not in the domain p, q, r, s, t)",
    );
    expect(domainCoverageProblem("Color", members(["a", "b"]), ["b", "z"])).toBe(
      "the certificate does not cover Color as the code defines it (missing a; not in the domain z)",
    );
    expect(domainCoverageProblem("Color", members(["a"]), ["a", "a"])).toBeNull();
  });

  test("compare counts otherwise", () => {
    expect(domainCoverageProblem("Rows", { count: 2, members: null }, ["x", "y"])).toBeNull();
    expect(domainCoverageProblem("Rows", { count: 3, members: null }, ["x", "y"])).toBe(
      "the certificate covers 2 members but Rows has 3",
    );
  });
});

describe("SMT", () => {
  test("write each constraint as its SMT-LIB assertion", () => {
    const at = (operator: string, value: number, type: "int" | "real" = "int") =>
      smtAssertion("x", type, { operator, value });
    expect(at("eq", 5)).toBe("(assert (= x 5))");
    expect(at("neq", 5)).toBe("(assert (distinct x 5))");
    expect(at("lt", -2)).toBe("(assert (< x (- 2)))");
    expect(at("lte", 0)).toBe("(assert (<= x 0))");
    expect(at("gt", 1.5, "real")).toBe("(assert (> x 1.5))");
    expect(at("gte", 3, "real")).toBe("(assert (>= x 3.0))");
    expect(at("gte", -3, "real")).toBe("(assert (>= x (- 3.0)))");
  });

  test("re-run z3 and cvc5 and accept only unsat", () => {
    const calls: unknown[][] = [];
    let stdout = "\nunsat\n";
    let error: Error | undefined;
    spy(runner, "spawnSyncThroughFiles", ((...args: unknown[]) => {
      calls.push(args);
      return { error, status: 0, stdout, stderr: "" };
    }) as never);
    expect(rerunSmtQuery("z3", "(check-sat)")).toEqual({ ok: true });
    expect(rerunSmtQuery("cvc5", "(check-sat)")).toEqual({ ok: true });
    expect(calls).toEqual([
      ["z3", ["-smt2", "-in"], { input: "(check-sat)", timeout: 60_000 }],
      ["cvc5", ["--lang", "smt2"], { input: "(check-sat)", timeout: 60_000 }],
    ]);
    stdout = "sat\tmodel";
    expect(rerunSmtQuery("z3", "q")).toEqual({
      ok: false,
      reason: "re-running z3 on the query answered sat, not unsat",
    });
    stdout = "  ";
    expect(rerunSmtQuery("z3", "q")).toEqual({
      ok: false,
      reason: "re-running z3 on the query answered nothing, not unsat",
    });
    error = new Error("spawn z3 ENOENT");
    expect(rerunSmtQuery("z3", "q")).toEqual({
      ok: false,
      reason: "Kibi could not re-run z3 on the query: spawn z3 ENOENT",
    });
    expect(rerunSmtQuery("yices", "q")).toEqual({
      ok: false,
      reason: "solver yices is not z3 or cvc5",
    });
    expect(calls).toHaveLength(5);
  });
});


type EvaluatorCall = {
  root: string;
  file: string;
  scripts: Record<string, string>;
  args: string[];
  accept: (parsed: unknown) => boolean;
  options: Record<string, unknown>;
};

/** Stand in for the subprocess evaluator: record each call, answer in turn. */
function evaluator(...answers: unknown[]) {
  const calls: EvaluatorCall[] = [];
  spy(runner, "runCodeEvaluator", ((
    root: string,
    file: string,
    scripts: Record<string, string>,
    args: string[],
    accept: (parsed: unknown) => boolean,
    options: Record<string, unknown>,
  ) => {
    calls.push({ root, file, scripts, args, accept, options });
    return answers.shift();
  }) as never);
  return calls;
}

describe("evaluating domains and scalars", () => {
  test("hand a JavaScript domain to the evaluator and read its members", () => {
    const calls = evaluator(
      { ok: true, value: { count: 2, members: ["a", "b"] }, language: "js" },
      { ok: true, value: { count: 3, members: null }, language: "js" },
    );
    expect(certificates.evaluateDomain("/w", "src/d.ts", "Color")).toEqual({
      ok: true,
      count: 2,
      members: ["a", "b"],
    });
    expect(
      certificates.evaluateDomain("/w", "src/d.ts", "Rows", { field: "name", runners: ["node"] }),
    ).toEqual({ ok: true, count: 3, members: null });
    expect(calls.map((call) => call.args)).toEqual([
      [path.resolve("/w", "src/d.ts"), "Color", ""],
      [path.resolve("/w", "src/d.ts"), "Rows", "name"],
    ]);
    expect(calls[1]?.options).toEqual({ field: "name", runners: ["node"] });
    expect(calls[0]?.root).toBe("/w");
    expect(calls[0]?.file).toBe("src/d.ts");
    expect(Object.keys(calls[0]?.scripts ?? {})).toEqual(["js", "python", "prolog"]);
  });

  test("accept only an evaluator answer with an error, a scalar or a count", () => {
    const calls = evaluator({ ok: true, value: { count: 0, members: [] }, language: "js" });
    certificates.evaluateDomain("/w", "d.ts", "X");
    const accept = calls[0]?.accept as (parsed: unknown) => boolean;
    expect(accept({ error: "e" })).toBe(true);
    expect(accept({ scalar: 1 })).toBe(true);
    expect(accept({ count: 2 })).toBe(true);
    expect(accept({ scalar: "1", count: "2" })).toBe(false);
    expect(accept({})).toBe(false);
  });

  test("pass a Prolog export as one JSON request", () => {
    const calls = evaluator(
      { ok: true, value: { count: 1, members: ["x"] }, language: "prolog" },
      { ok: true, value: { scalar: 4 }, language: "prolog" },
      { ok: true, value: { count: 1, members: ["x"] }, language: "prolog" },
    );
    certificates.evaluateDomain("/w", "src/d.pl", "color/1", { arg: 1 });
    expect(certificates.evaluateScalar("/w", "src/d.pl", "limit/1", { arg: 1 })).toEqual({
      ok: true,
      value: 4,
    });
    certificates.evaluateDomain("/w", "src/d.pl", "color/1");
    expect(calls.map((call) => JSON.parse(call.args[0] as string))).toEqual([
      { mode: "export", want: "domain", ref: { file: path.resolve("/w", "src/d.pl"), export: "color/1", arg: 1 } },
      { mode: "export", want: "scalar", ref: { file: path.resolve("/w", "src/d.pl"), export: "limit/1", arg: 1 } },
      { mode: "export", want: "domain", ref: { file: path.resolve("/w", "src/d.pl"), export: "color/1" } },
    ]);
  });

  test("refuse files, fields and args the loader cannot use", () => {
    const calls = evaluator();
    expect(certificates.evaluateDomain("/w", "d.txt", "X")).toEqual({
      ok: false,
      reason:
        "Kibi's domain loader reads TypeScript, JavaScript, Python and SWI-Prolog files, not d.txt",
    });
    expect(certificates.evaluateDomain("/w", "d.pl", "x/1", { field: "f" })).toEqual({
      ok: false,
      reason:
        "a SWI-Prolog predicate has arguments, not fields: name the argument of x/1 with arg instead of field",
    });
    expect(certificates.evaluateDomain("/w", "d.ts", "X", { arg: 1 })).toEqual({
      ok: false,
      reason: "arg applies only to a SWI-Prolog predicate, not to TypeScript or JavaScript in d.ts",
    });
    expect(calls).toHaveLength(0);
  });

  test("explain a failed load with the language's loader order", () => {
    evaluator(
      { ok: false, failure: "boom", language: "js" },
      { ok: false, failure: "", language: "python" },
      { ok: false, failure: "no swipl", language: "prolog" },
    );
    expect(certificates.evaluateDomain("/w", "d.ts", "X")).toEqual({
      ok: false,
      reason:
        "Kibi could not load X from d.ts: boom (without bun or the workspace's tsx, node's type stripping loads the domain; a type imported without import type stops it)",
    });
    expect(certificates.evaluateDomain("/w", "d.py", "X")).toEqual({
      ok: false,
      reason:
        "Kibi could not load X from d.py (a Python domain loads with KIBI_PYTHON, the active or project virtualenv (.venv or venv), then python3 on PATH)",
    });
    expect(certificates.evaluateDomain("/w", "d.pl", "x/1")).toEqual({
      ok: false,
      reason:
        "Kibi could not load x/1 from d.pl: no swipl (a SWI-Prolog domain loads with KIBI_SWIPL, the bundled SWI-Prolog, then swipl on PATH)",
    });
  });

  test("tell domains and scalars apart", () => {
    evaluator(
      { ok: true, value: { scalar: 3 }, language: "js" },
      { ok: true, value: { error: "X is not an array" }, language: "js" },
      { ok: true, value: { count: 2, members: ["a"] }, language: "js" },
      { ok: true, value: { scalar: 3 }, language: "js" },
      { ok: true, value: { error: "bad" }, language: "js" },
      { ok: true, value: { count: 2 }, language: "js" },
    );
    expect(certificates.evaluateDomain("/w", "d.ts", "X")).toEqual({
      ok: false,
      reason: "X is a number, not a list, set, map or object",
    });
    expect(certificates.evaluateDomain("/w", "d.ts", "X")).toEqual({
      ok: false,
      reason: "X is not an array",
    });
    expect(certificates.evaluateDomain("/w", "d.ts", "X")).toEqual({
      ok: true,
      count: 2,
      members: ["a"],
    });
    expect(certificates.evaluateScalar("/w", "d.ts", "LIMIT")).toEqual({ ok: true, value: 3 });
    expect(certificates.evaluateScalar("/w", "d.ts", "LIMIT")).toEqual({ ok: false, reason: "bad" });
    expect(certificates.evaluateScalar("/w", "d.ts", "LIMIT")).toEqual({
      ok: false,
      reason: "LIMIT in d.ts is not a finite number",
    });
  });
});

type Fakes = Record<string, Record<string, unknown> | undefined>;
const fakes = globalThis as unknown as { __kibiTs?: Fakes };

/** Install a stand-in typescript package that reads its API from `key`. */
function installTypeScript(root: string, dir: string, key: string | null) {
  write(
    root,
    path.join(dir, "node_modules/typescript/package.json"),
    '{ "name": "typescript", "main": "index.js" }',
  );
  write(
    root,
    path.join(dir, "node_modules/typescript/index.js"),
    key === null
      ? 'throw new Error("no typescript here");\n'
      : `module.exports = new Proxy({}, { get: (_t, k) => globalThis.__kibiTs?.[${JSON.stringify(key)}]?.[k] });\n`,
  );
}

type FakeNode = { kind: number; children?: FakeNode[] };
type FakeDiagnostic = { category: number; file?: unknown; start?: number; messageText: string };

/** A compiler API that records what Kibi asks of it. */
function fakeTypeScript(
  key: string,
  options: {
    configPath?: string;
    readError?: boolean;
    parsed?: { options: Record<string, unknown>; fileNames: string[] };
    noWitness?: boolean;
    nodes?: FakeNode[];
    syntactic?: (witness: unknown) => FakeDiagnostic[];
    semantic?: (witness: unknown) => FakeDiagnostic[];
  } = {},
) {
  const calls = {
    find: [] as unknown[][],
    read: [] as unknown[][],
    parse: [] as unknown[][],
    programs: [] as { roots: string[]; options: Record<string, unknown> }[],
  };
  const sys = { fileExists: () => true, readFile: () => "" };
  const witness = {
    kind: 0,
    children: options.nodes ?? [],
    getLineAndCharacterOfPosition: (position: number) => ({
      line: Math.floor(position / 10),
      character: 0,
    }),
  };
  const api = {
    version: "5.9.0-fake",
    ScriptTarget: { ES2022: 9 },
    ModuleKind: { NodeNext: 199 },
    ModuleResolutionKind: { NodeNext: 99 },
    SyntaxKind: { NeverKeyword: 146, SatisfiesExpression: 239 },
    DiagnosticCategory: { Warning: 0, Error: 1 },
    sys,
    findConfigFile: (...args: unknown[]) => {
      calls.find.push(args);
      return options.configPath;
    },
    readConfigFile: (...args: unknown[]) => {
      calls.read.push(args);
      return options.readError ? { error: { messageText: "bad" } } : { config: { c: 1 } };
    },
    parseJsonConfigFileContent: (...args: unknown[]) => {
      calls.parse.push(args);
      return options.parsed ?? { options: {}, fileNames: [] };
    },
    forEachChild: (node: FakeNode, visit: (child: FakeNode) => unknown) => {
      for (const child of node.children ?? []) {
        const found = visit(child);
        if (found) return found;
      }
      return undefined;
    },
    flattenDiagnosticMessageText: (message: string, newLine: string) =>
      `${message}[${newLine}]`,
    createProgram: (roots: string[], programOptions: Record<string, unknown>) => {
      calls.programs.push({ roots, options: programOptions });
      return {
        getSourceFile: () => (options.noWitness ? undefined : witness),
        getSyntacticDiagnostics: () => options.syntactic?.(witness) ?? [],
        getSemanticDiagnostics: () => options.semantic?.(witness) ?? [],
      };
    },
  };
  fakes.__kibiTs = { ...fakes.__kibiTs, [key]: api };
  restores.push(() => {
    if (fakes.__kibiTs) delete fakes.__kibiTs[key];
  });
  return { calls, sys, api };
}

function typeScriptWorkspace(key: string): string {
  const root = workspace({ "w.ts": "" });
  installTypeScript(root, ".", key);
  return root;
}

describe("loading the workspace's TypeScript", () => {
  test("prefer the package nearest the witness", () => {
    const root = workspace({ "pkg/w.ts": "" });
    installTypeScript(root, "pkg", "near");
    installTypeScript(root, ".", "far");
    const near = fakeTypeScript("near");
    fakes.__kibiTs = { ...fakes.__kibiTs, far: { version: "7.0.0" } };
    expect(certificates.compileWitness(root, "pkg/w.ts")).toEqual({
      ok: true,
      version: "5.9.0-fake",
    });
    expect(near.calls.programs).toHaveLength(1);
  });

  test("fall back to the workspace's package past a TypeScript without the API", () => {
    const parent = workspace({ "other/w.ts": "" });
    installTypeScript(parent, ".", null);
    installTypeScript(parent, "root", "root-ts");
    const rootTs = fakeTypeScript("root-ts");
    expect(certificates.compileWitness(path.join(parent, "root"), "../other/w.ts")).toEqual({
      ok: true,
      version: "5.9.0-fake",
    });
    expect(rootTs.calls.programs).toHaveLength(1);
  });

  test("name a TypeScript without the compiler API", () => {
    const root = workspace({ "w.ts": "" });
    installTypeScript(root, ".", "seven");
    fakes.__kibiTs = { ...fakes.__kibiTs, seven: { version: "7.0.1" } };
    restores.push(() => {
      if (fakes.__kibiTs) delete fakes.__kibiTs.seven;
    });
    expect(certificates.compileWitness(root, "w.ts")).toEqual({
      ok: false,
      reason:
        "the workspace's TypeScript 7.0.1 has no compiler API to compile the witness (TypeScript 7 ships without it); add typescript@6 as a dev dependency for typecheck proofs",
    });
    fakes.__kibiTs = { ...fakes.__kibiTs, seven: { createProgram: 1 } };
    expect(certificates.compileWitness(root, "w.ts")).toMatchObject({
      reason: expect.stringContaining("TypeScript unknown has no compiler API"),
    });
  });

  test("say so when no TypeScript loads", () => {
    const root = workspace({ "pkg/w.ts": "" });
    installTypeScript(root, ".", null);
    expect(certificates.compileWitness(root, "pkg/w.ts")).toEqual({
      ok: false,
      reason:
        "Kibi could not load TypeScript from the workspace to compile the witness (install typescript)",
    });
  });
});

describe("compiling a witness", () => {
  test("compile strictly, with NodeNext modules when the project sets none", () => {
    const root = typeScriptWorkspace("plain");
    const ts = fakeTypeScript("plain");
    expect(certificates.compileWitness(root, "w.ts")).toEqual({
      ok: true,
      version: "5.9.0-fake",
    });
    expect(ts.calls.find).toEqual([[root, ts.sys.fileExists, "tsconfig.json"]]);
    expect(ts.calls.read).toEqual([]);
    expect(ts.calls.programs).toStrictEqual([
      {
        roots: [path.join(root, "w.ts")],
        options: {
          target: 9,
          module: 199,
          moduleResolution: 99,
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          allowJs: true,
          checkJs: true,
          types: [],
        },
      },
    ]);
  });

  test("ignore a tsconfig outside the workspace or one that does not read", () => {
    const root = typeScriptWorkspace("outside");
    const outside = fakeTypeScript("outside", {
      configPath: path.join(root, "..", "elsewhere", "tsconfig.json"),
    });
    certificates.compileWitness(root, "w.ts");
    expect(outside.calls.read).toEqual([]);
    const unread = typeScriptWorkspace("unread");
    const broken = fakeTypeScript("unread", {
      configPath: path.join(unread, "tsconfig.json"),
      readError: true,
    });
    certificates.compileWitness(unread, "w.ts");
    expect(broken.calls.read).toEqual([[path.join(unread, "tsconfig.json"), broken.sys.readFile]]);
    expect(broken.calls.parse).toEqual([]);
    expect(broken.calls.programs[0]?.roots).toEqual([path.join(unread, "w.ts")]);
  });

  test("take the project's resolution options and declaration files", () => {
    const root = typeScriptWorkspace("project");
    const configPath = path.join(root, "tsconfig.json");
    const ts = fakeTypeScript("project", {
      configPath,
      parsed: {
        options: { module: 1, target: undefined, paths: { a: ["b"] }, strict: false, noImplicitAny: false },
        fileNames: ["src/a.ts", "types/reset.d.ts"],
      },
    });
    certificates.compileWitness(root, "w.ts");
    expect(ts.calls.parse).toEqual([[{ c: 1 }, ts.sys, root, undefined, configPath]]);
    expect(ts.calls.programs).toStrictEqual([
      {
        roots: [path.join(root, "w.ts"), "types/reset.d.ts"],
        options: {
          target: 9,
          module: 1,
          paths: { a: ["b"] },
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          allowJs: true,
          checkJs: true,
          types: [],
        },
      },
    ]);
    const resolution = typeScriptWorkspace("resolution");
    const only = fakeTypeScript("resolution", {
      configPath: path.join(resolution, "tsconfig.json"),
      parsed: { options: { moduleResolution: 3 }, fileNames: [] },
    });
    certificates.compileWitness(resolution, "w.ts");
    expect(only.calls.programs[0]?.options).toStrictEqual({
      target: 9,
      moduleResolution: 3,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      allowJs: true,
      checkJs: true,
      types: [],
    });
  });

  test("report a witness the program cannot read", () => {
    const root = typeScriptWorkspace("missing");
    fakeTypeScript("missing", { noWitness: true });
    expect(certificates.compileWitness(root, "w.ts")).toEqual({
      ok: false,
      reason: "Kibi could not read the witness w.ts",
    });
  });

  test("require a never type or a satisfies map only when asked", () => {
    const strict = { requireExhaustiveness: true };
    const root = typeScriptWorkspace("bare");
    fakeTypeScript("bare", { nodes: [{ kind: 1, children: [{ kind: 2 }] }] });
    expect(certificates.compileWitness(root, "w.ts", strict)).toEqual({
      ok: false,
      reason:
        "the witness w.ts has no exhaustiveness check (a never type or a satisfies map), so a new domain member would still compile",
    });
    expect(certificates.compileWitness(root, "w.ts")).toEqual({ ok: true, version: "5.9.0-fake" });
    const never = typeScriptWorkspace("never");
    fakeTypeScript("never", { nodes: [{ kind: 1, children: [{ kind: 146 }] }] });
    expect(certificates.compileWitness(never, "w.ts", strict)).toEqual({
      ok: true,
      version: "5.9.0-fake",
    });
    const satisfies = typeScriptWorkspace("satisfies");
    fakeTypeScript("satisfies", { nodes: [{ kind: 239 }] });
    expect(certificates.compileWitness(satisfies, "w.ts", strict)).toEqual({
      ok: true,
      version: "5.9.0-fake",
    });
  });

  test("reject a witness with errors and name their lines", () => {
    const root = typeScriptWorkspace("errors");
    fakeTypeScript("errors", {
      syntactic: (witness) => [
        { category: 0, file: witness, start: 90, messageText: "warning" },
      ],
      semantic: (witness) => [
        { category: 1, file: witness, start: 25, messageText: "first" },
        { category: 1, file: {}, start: 55, messageText: "elsewhere" },
        { category: 1, file: witness, messageText: "unplaced" },
        { category: 1, file: witness, start: 13, messageText: "second" },
        { category: 1, file: witness, start: 27, messageText: "same line" },
      ],
    });
    expect(certificates.compileWitness(root, "w.ts")).toEqual({
      ok: false,
      reason: "TypeScript 5.9.0-fake rejects the witness w.ts: first[ ]",
      errorLines: [2, 1],
    });
    const warned = typeScriptWorkspace("warned");
    fakeTypeScript("warned", {
      syntactic: (witness) => [{ category: 0, file: witness, start: 1, messageText: "w" }],
    });
    expect(certificates.compileWitness(warned, "w.ts")).toEqual({
      ok: true,
      version: "5.9.0-fake",
    });
  });
});

type Row = Record<string, unknown>;

function contractOf(extra: Row): ProofContract {
  return {
    version: "kibi.proof-contract.v1",
    integration: "bun",
    required_proofs: [],
    success_policy: "all",
    ...extra,
  } as unknown as ProofContract;
}

/** Answer the Prolog re-check: accepted with the certificate's own digest. */
function prologCheck(answer: (certificate: Row) => Row = (certificate) => ({
  accepted: true,
  digest: certificateDigest(certificate),
})) {
  const calls: unknown[][] = [];
  let current: Row = {};
  spy(prologJson, "runOperationJsonQuery", (async (...args: unknown[]) => {
    calls.push(args);
    return answer(current);
  }) as never);
  return {
    calls,
    set: (certificate: Row) => {
      current = certificate;
    },
  };
}

async function check(
  ctx: OperationContext,
  contract: ProofContract,
  certificate: unknown,
  outcome = "passed",
) {
  return certificates.checkCodeCertificate(ctx, {
    testId: "TEST-1",
    contract,
    outcome,
    certificate,
  });
}

/** Check `certificate`, answering the Prolog re-check as accepted. */
async function judged(
  ctx: OperationContext,
  contract: ProofContract,
  certificate: Row,
): Promise<string | undefined> {
  prologCheck().set(certificate);
  const verdict = await check(ctx, contract, certificate);
  return verdict.evidence_level === "proved"
    ? undefined
    : (verdict.certificate_rejection ?? "tested without a reason");
}

describe("checking a run's certificate", () => {
  const exhaustive = contractOf({ kind: "exhaustive" });
  const certificate = { kind: "exhaustive", test_id: "TEST-1" };

  test("give runner kinds tested evidence without a certificate", async () => {
    const ctx = context("/w");
    expect(await check(ctx, contractOf({}), undefined)).toStrictEqual({
      kind: "e2e",
      evidence_level: "tested",
    });
    expect(await check(ctx, contractOf({ kind: "property" }), certificate)).toStrictEqual({
      kind: "property",
      evidence_level: "tested",
    });
  });

  test("reject a run that left no certificate object", async () => {
    for (const left of [undefined, null, "text", [1]]) {
      expect(await check(context("/w"), exhaustive, left)).toStrictEqual({
        kind: "exhaustive",
        evidence_level: "tested",
        certificate_rejection: "the run left no kibi.code-certificate.v1 for TEST-1",
      });
    }
  });

  test("reject a certificate for another kind, test or outcome", async () => {
    const ctx = context("/w");
    const rejected = (row: Row, reason: string): CertificateVerdict => ({
      kind: "exhaustive",
      evidence_level: "tested",
      certificate: row,
      certificate_digest: certificateDigest(row),
      certificate_rejection: reason,
    });
    const other = { kind: "typecheck", test_id: "TEST-1" };
    expect(await check(ctx, exhaustive, other)).toStrictEqual(
      rejected(other, "the certificate kind typecheck is not the contract kind exhaustive"),
    );
    const none = { test_id: "TEST-1" };
    expect(await check(ctx, exhaustive, none)).toStrictEqual(
      rejected(none, "the certificate kind (none) is not the contract kind exhaustive"),
    );
    const elsewhere = { kind: "exhaustive", test_id: "TEST-2" };
    expect(await check(ctx, exhaustive, elsewhere)).toStrictEqual(
      rejected(elsewhere, "the certificate is for TEST-2"),
    );
    expect(await check(ctx, exhaustive, certificate, "failed")).toStrictEqual(
      rejected(certificate, "the proof run did not pass"),
    );
    expect(
      await check({ workspaceRoot: "/w" } as OperationContext, exhaustive, certificate),
    ).toStrictEqual(
      rejected(certificate, "no Prolog runtime is attached to re-check the certificate"),
    );
  });

  test("re-check the certificate in code_certificates.pl", async () => {
    const ctx = context("/w");
    const prolog = prologCheck(() => ({ accepted: false, reason: "the arithmetic is wrong" }));
    expect((await check(ctx, exhaustive, certificate)).certificate_rejection).toBe(
      "the arithmetic is wrong",
    );
    expect(prolog.calls[0]?.[0]).toBe(ctx.prolog);
    expect(prolog.calls[0]?.slice(1)).toEqual([
      "code_certificates.pl",
      `code_certificates:code_certificate_check_json('${JSON.stringify(certificate)}', JsonString)`,
      "Code certificate check",
    ]);
    prologCheck(() => ({}));
    expect((await check(ctx, exhaustive, certificate)).certificate_rejection).toBe(
      "the certificate did not re-check",
    );
    prologCheck(() => ({ accepted: true, digest: "other" }));
    expect((await check(ctx, exhaustive, certificate)).certificate_rejection).toBe(
      "the certificate does not hash the same in the CLI and in code_certificates.pl (write non-integer numbers as strings)",
    );
  });
});

const domainEntities: FakeEntity[] = [
  { id: "SYM-dom", type: "symbol", title: "Color", sourceFile: "src/d.ts" },
  { id: "SYM-untitled", type: "symbol", sourceFile: "src/d.ts" },
  { id: "SYM-null", type: "symbol", title: "null", sourceFile: "src/d.ts" },
  { id: "SYM-nofile", type: "symbol", title: "Color" },
  { id: "SYM-proof", type: "symbol", title: "proof", sourceFile: "tests/p.test.ts" },
  { id: "SYM-other", type: "symbol", title: "other", sourceFile: "tests/o.test.ts" },
  { id: "SYM-gone", type: "symbol", title: "gone", sourceFile: "tests/gone.test.ts" },
];

function domainWorkspace(): string {
  return workspace({
    "src/d.ts": "export const Color = ['a', 'b'];\n",
    "tests/p.test.ts": "import { Color, COLORS } from '../src/d';\n",
    "tests/o.test.ts": "const x = 1;\n",
    "w.ts": "import { Color } from './src/d';\n",
  });
}

describe("exhaustive certificates", () => {
  const contract = (extra: Row = {}, proofs = ["SYM-proof"]) =>
    contractOf({
      kind: "exhaustive",
      domain_source: { symbol_id: "SYM-dom" },
      required_proofs: proofs.map((symbol_id) => ({ symbol_id, target: "t" })),
      ...extra,
    });
  const certificate = (domain: unknown = { symbol_id: "SYM-dom", members: ["a", "b"] }) => ({
    kind: "exhaustive",
    test_id: "TEST-1",
    domain,
  });
  const bare = { kind: "exhaustive", test_id: "TEST-1" };
  const members = { ok: true, value: { count: 2, members: ["a", "b"] }, language: "js" };

  test("prove a certificate that covers the domain the proof imports", async () => {
    const root = domainWorkspace();
    const calls = evaluator(members);
    expect(await judged(context(root, domainEntities), contract(), certificate())).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args).toEqual([path.join(root, "src/d.ts"), "Color", ""]);
    expect(calls[0]?.options).toStrictEqual({});
  });

  test("pass the domain's field and argument to the loader", async () => {
    const root = domainWorkspace();
    write(root, "src/d.pl", "color(a).\n");
    write(root, "src/d.plt", "color(a).\n");
    const entities: FakeEntity[] = [
      ...domainEntities,
      { id: "SYM-pl", type: "symbol", title: "color/1", sourceFile: "src/d.pl" },
      { id: "SYM-plt", type: "symbol", title: "t", sourceFile: "src/d.plt" },
    ];
    const calls = evaluator(members, members);
    await judged(
      context(root, entities),
      contract({ domain_source: { symbol_id: "SYM-dom", field: "name" } }),
      certificate(),
    );
    await judged(
      context(root, entities),
      contract({ domain_source: { symbol_id: "SYM-pl", arg: 2 } }, ["SYM-plt"]),
      certificate({ symbol_id: "SYM-pl", members: ["a", "b"] }),
    );
    expect(calls.map((call) => call.options)).toStrictEqual([{ field: "name" }, { arg: 2 }]);
  });

  test("reject a certificate about another domain", async () => {
    const ctx = context(domainWorkspace(), domainEntities);
    expect(await judged(ctx, contract(), certificate({ symbol_id: "SYM-x" }))).toBe(
      "the certificate's domain SYM-x is not the contract's domain_source SYM-dom",
    );
    expect(await judged(ctx, contract(), bare)).toBe(
      "the certificate's domain (none) is not the contract's domain_source SYM-dom",
    );
  });

  test("need a domain symbol with a source file", async () => {
    const ctx = context(domainWorkspace(), domainEntities);
    for (const id of ["SYM-nofile", "SYM-missing"]) {
      expect(
        await judged(ctx, contract({ domain_source: { symbol_id: id } }), certificate({ symbol_id: id })),
      ).toBe(`the domain_source symbol ${id} has no source file`);
    }
  });

  test("need a proof that imports the domain", async () => {
    const ctx = context(domainWorkspace(), domainEntities);
    const hint =
      " (Kibi reads the export named by the symbol's title; set domain_source.export when the export has another name)";
    for (const proofs of [["SYM-other"], ["SYM-gone"], ["SYM-unknown"], []]) {
      expect(await judged(ctx, contract({}, proofs), certificate())).toBe(
        `the proof does not import Color from src/d.ts, so its domain may be hand-listed${hint}`,
      );
    }
    expect(
      await judged(
        ctx,
        contract({ domain_source: { symbol_id: "SYM-dom", export: "SHADES" } }),
        certificate(),
      ),
    ).toBe("the proof does not import SHADES from src/d.ts, so its domain may be hand-listed");
    expect(
      await judged(
        ctx,
        contract({ domain_source: { symbol_id: "SYM-untitled" } }),
        certificate({ symbol_id: "SYM-untitled" }),
      ),
    ).toBe(`the proof does not import SYM-untitled from src/d.ts, so its domain may be hand-listed${hint}`);
    expect(
      await judged(
        ctx,
        contract({ domain_source: { symbol_id: "SYM-null" } }, ["SYM-gone"]),
        certificate({ symbol_id: "SYM-null" }),
      ),
    ).toBe(`the proof does not import null from src/d.ts, so its domain may be hand-listed${hint}`);
  });

  test("accept any one importing proof and the domain's export name", async () => {
    const root = domainWorkspace();
    evaluator(members, members);
    const ctx = context(root, domainEntities);
    expect(await judged(ctx, contract({}, ["SYM-other", "SYM-proof"]), certificate())).toBeUndefined();
    expect(
      await judged(
        ctx,
        contract({ domain_source: { symbol_id: "SYM-dom", export: "COLORS" } }),
        certificate(),
      ),
    ).toBeUndefined();
  });

  test("reject what the loader or the coverage check refuses", async () => {
    const ctx = context(domainWorkspace(), domainEntities);
    evaluator(
      { ok: true, value: { error: "Color is not an array" }, language: "js" },
      members,
      members,
    );
    expect(await judged(ctx, contract(), certificate())).toBe("Color is not an array");
    expect(await judged(ctx, contract(), certificate({ symbol_id: "SYM-dom", members: ["a"] }))).toBe(
      "the certificate does not cover Color as the code defines it (missing b)",
    );
    expect(await judged(ctx, contract(), certificate({ symbol_id: "SYM-dom" }))).toBe(
      "the certificate does not cover Color as the code defines it (missing a, b)",
    );
  });

  test("refuse a contract that names no domain_source", async () => {
    const root = domainWorkspace();
    const calls = evaluator(members);
    // An empty id would otherwise read whichever symbol the store lists first.
    for (const proofs of [["SYM-proof"], ["SYM-other"]])
      expect(
        await judged(context(root, domainEntities), contract({ domain_source: undefined }, proofs), bare),
      ).toBe("the contract names no domain_source symbol");
    expect(calls).toHaveLength(0);
  });
});

describe("typecheck certificates", () => {
  const witnessSha = (root: string) =>
    new Bun.CryptoHasher("sha256").update(readWorkspaceFile(root, "w.ts") ?? "").digest("hex");
  const contract = (extra: Row = {}) =>
    contractOf({
      kind: "typecheck",
      domain_source: { symbol_id: "SYM-dom" },
      witness: { path: "w.ts" },
      ...extra,
    });
  const certificate = (root: string, witness: unknown = { path: "w.ts", sha256: witnessSha(root) }) => ({
    kind: "typecheck",
    test_id: "TEST-1",
    domain: { symbol_id: "SYM-dom" },
    witness,
  });
  function compiler(...answers: Row[]) {
    const calls: unknown[][] = [];
    spy(certificates, "compileWitness", ((...args: unknown[]) => {
      calls.push(args);
      return answers.shift() ?? { ok: true, version: "5" };
    }) as never);
    return calls;
  }

  test("prove a witness that imports the domain and compiles", async () => {
    const root = domainWorkspace();
    const calls = compiler();
    const ctx = context(root, domainEntities);
    expect(await judged(ctx, contract(), certificate(root))).toBeUndefined();
    expect(await judged(ctx, contract({ proves: ["claim"] }), certificate(root))).toBeUndefined();
    expect(calls).toEqual([
      [root, "w.ts", { requireExhaustiveness: true }],
      [root, "w.ts", { requireExhaustiveness: false }],
    ]);
  });

  test("reject another witness, other bytes or a failed compile", async () => {
    const root = domainWorkspace();
    compiler({ ok: false, reason: "TypeScript rejects it" });
    const ctx = context(root, domainEntities);
    for (const witness of [{ path: "x.ts" }, null]) {
      expect(await judged(ctx, contract(), certificate(root, witness))).toBe(
        "the certificate's witness is not the contract's witness w.ts",
      );
    }
    for (const witness of [{ path: "w.ts", sha256: "0" }, { path: "w.ts" }]) {
      expect(await judged(ctx, contract(), certificate(root, witness))).toBe(
        "the witness sha256 does not match w.ts in the workspace",
      );
    }
    expect(await judged(ctx, contract(), certificate(root))).toBe("TypeScript rejects it");
  });

  test("need a witness that imports the domain", async () => {
    const root = domainWorkspace();
    compiler();
    expect(
      await judged(context(root, domainEntities), contract({ witness: undefined }), certificate(root)),
    ).toBe(
      "the proof does not import Color from src/d.ts, so its domain may be hand-listed (Kibi reads the export named by the symbol's title; set domain_source.export when the export has another name)",
    );
  });

  test("add Kibi's own compile to a witness the test did not accept", () => {
    const root = domainWorkspace();
    const calls = compiler({ ok: true, version: "5.4" }, { ok: false, reason: "TS2322 at line 3" });
    const ctx = context(root, domainEntities);
    const notAccepted = "the type checker did not accept the witness";
    expect(certificates.withWitnessDiagnosis(ctx, contract(), notAccepted)).toBe(
      `${notAccepted}, though Kibi's own compile of w.ts with TypeScript 5.4 accepts it (the test compiled it with other settings)`,
    );
    expect(certificates.withWitnessDiagnosis(ctx, contract(), notAccepted)).toBe(
      `${notAccepted}: TS2322 at line 3`,
    );
    expect(certificates.withWitnessDiagnosis(ctx, contract(), "other")).toBe("other");
    expect(certificates.withWitnessDiagnosis(ctx, contract({ witness: undefined }), notAccepted)).toBe(
      notAccepted,
    );
    expect(calls).toEqual([[root, "w.ts"], [root, "w.ts"]]);
  });

  test("diagnose a re-check that refused the witness", async () => {
    const root = domainWorkspace();
    compiler({ ok: false, reason: "TS2322" });
    prologCheck(() => ({ accepted: false, reason: "the type checker did not accept the witness" }));
    const verdict = await check(context(root, domainEntities), contract(), certificate(root));
    expect(verdict.certificate_rejection).toBe(
      "the type checker did not accept the witness: TS2322",
    );
  });
});

function fact(id: string, extra: Row = {}): FakeEntity {
  return {
    id,
    type: "fact",
    status: "active",
    fact_kind: "property_value",
    polarity: "require",
    subject_key: "svc",
    property_key: "limit",
    value_type: "int",
    value_int: 5,
    operator: "gte",
    ...extra,
  };
}

describe("arithmetic certificates", () => {
  const contract = (facts: string[], values?: Row[]) =>
    contractOf({
      kind: "arithmetic",
      ...(facts.length > 0 ? { constraint_source: { fact_ids: facts } } : {}),
      ...(values === undefined ? {} : { value_source: values }),
    });
  const certificate = (extra: Row = {}) => ({
    kind: "arithmetic",
    test_id: "TEST-1",
    variable: "limit",
    value_type: "int",
    assumptions: [{ operator: "gte", value: 5 }],
    ...extra,
  });

  test("prove assumptions that are exactly the facts' constraints", async () => {
    const { polarity: _unstated, ...unstated } = fact("FACT-b", { operator: "eq", value_int: 10 });
    const entities = [fact("FACT-a"), unstated as FakeEntity];
    const ctx = context("/w", entities);
    expect(
      await judged(
        ctx,
        contract(["FACT-a", "FACT-b"]),
        certificate({ assumptions: [{ operator: "eq", value: 10 }, { operator: "gte", value: 5 }] }),
      ),
    ).toBeUndefined();
    expect(
      await judged(ctx, contract(["FACT-a", "FACT-b"]), certificate()),
    ).toBe(
      "the certificate's assumptions are not exactly the constraint_source facts' constraints and value_source values (gte:5, eq:10)",
    );
    expect(
      await judged(ctx, contract(["FACT-a"]), certificate({ assumptions: "gte:5" })),
    ).toBe(
      "the certificate's assumptions are not exactly the constraint_source facts' constraints and value_source values (gte:5)",
    );
  });

  test("accept every comparison operator", async () => {
    for (const operator of ["eq", "neq", "lt", "lte", "gt", "gte"]) {
      const ctx = context("/w", [fact("FACT-a", { operator })]);
      expect(
        await judged(ctx, contract(["FACT-a"]), certificate({ assumptions: [{ operator, value: 5 }] })),
      ).toBeUndefined();
    }
  });

  test("refuse facts that cannot ground a certificate", async () => {
    const cases: Array<[FakeEntity | undefined, string]> = [
      [undefined, "constraint_source fact FACT-a does not exist"],
      [fact("FACT-a", { status: "retired" }), "constraint_source fact FACT-a is not active"],
      [fact("FACT-a", { fact_kind: "note" }), "constraint_source fact FACT-a is not a required property_value fact"],
      [fact("FACT-a", { polarity: "forbid" }), "constraint_source fact FACT-a is not a required property_value fact"],
      [fact("FACT-a", { value_type: "text", value_number: 5 }), "constraint_source fact FACT-a has no numeric operator and value"],
      [fact("FACT-a", { value_int: undefined }), "constraint_source fact FACT-a has no numeric operator and value"],
      [fact("FACT-a", { operator: "approx" }), "constraint_source fact FACT-a has no numeric operator and value"],
    ];
    for (const [entity, reason] of cases) {
      const ctx = context("/w", entity === undefined ? [] : [entity]);
      expect(await judged(ctx, contract(["FACT-a"]), certificate())).toBe(reason);
    }
    const two = context("/w", [fact("FACT-a"), fact("FACT-b", { subject_key: "other" })]);
    expect(await judged(two, contract(["FACT-a", "FACT-b"]), certificate())).toBe(
      "the constraint_source facts are about more than one subject and property",
    );
  });

  test("need the facts' variable and value type", async () => {
    const ctx = context("/w", [fact("FACT-a"), fact("FACT-r", { value_type: "number", value_number: 2.5 })]);
    expect(await judged(ctx, contract(["FACT-a"]), certificate({ variable: "x" }))).toBe(
      "the certificate's variable x is not the facts' property limit",
    );
    expect(await judged(ctx, contract(["FACT-a"]), certificate({ variable: undefined }))).toBe(
      "the certificate's variable (none) is not the facts' property limit",
    );
    expect(await judged(ctx, contract(["FACT-r"]), certificate())).toBe(
      "the certificate's value_type int is not the facts' real",
    );
    expect(
      await judged(
        ctx,
        contract(["FACT-r"]),
        certificate({ value_type: "real", assumptions: [{ operator: "gte", value: 2.5 }] }),
      ),
    ).toBeUndefined();
  });

  test("refuse a certificate resting on no knowledge-base or code values", async () => {
    expect(await judged(context("/w"), contract([]), certificate())).toBe(
      "the contract names no constraint_source facts or value_source constants, so the arithmetic certificate proves numbers the test chose",
    );
  });

  test("ground assumptions on value_source constants", async () => {
    const entities: FakeEntity[] = [
      { id: "SYM-limit", type: "symbol", title: "LIMIT", sourceFile: "src/limits.ts" },
      { id: "SYM-half", type: "symbol", title: "HALF", sourceFile: "src/limits.ts" },
      { id: "SYM-nofile", type: "symbol", title: "X" },
    ];
    const ctx = context("/w", entities);
    const scalar = (value: number) => ({ ok: true, value: { scalar: value }, language: "js" });
    const calls = evaluator(scalar(7), scalar(7), scalar(1), scalar(1.5), scalar(5), scalar(5));
    const cert = (extra: Row) => certificate({ variable: "x", ...extra });
    expect(
      await judged(ctx, contract([], [{ symbol_id: "SYM-limit" }]), cert({ assumptions: [{ operator: "eq", value: 7 }] })),
    ).toBeUndefined();
    expect(
      await judged(
        ctx,
        contract([], [{ symbol_id: "SYM-limit", export: "MAX", arg: undefined }]),
        cert({ value_type: "real", assumptions: [{ operator: "eq", value: 7 }] }),
      ),
    ).toBeUndefined();
    expect(
      await judged(
        ctx,
        contract([], [{ symbol_id: "SYM-limit" }, { symbol_id: "SYM-half" }]),
        cert({ assumptions: [{ operator: "eq", value: 1 }, { operator: "eq", value: 1.5 }] }),
      ),
    ).toBe("the certificate's value_type int is not the facts' real");
    expect(
      await judged(
        ctx,
        contract([], [{ symbol_id: "SYM-limit" }, { symbol_id: "SYM-half" }]),
        cert({ assumptions: [{ operator: "eq:5|eq", value: 5 }] }),
      ),
    ).toBe(
      "the certificate's assumptions are not exactly the constraint_source facts' constraints and value_source values (eq:5, eq:5)",
    );
    expect(calls.map((call) => call.args[1])).toEqual(["LIMIT", "MAX", "LIMIT", "HALF", "LIMIT", "HALF"]);
    expect(calls.every((call) => !("arg" in call.options))).toBe(true);
    for (const id of ["SYM-nofile", "SYM-missing"]) {
      expect(await judged(ctx, contract([], [{ symbol_id: id }]), cert({}))).toBe(
        `the value_source symbol ${id} has no source file`,
      );
    }
  });
});

describe("value_source values", () => {
  const entities: FakeEntity[] = [
    { id: "SYM-limit", type: "symbol", title: "LIMIT", sourceFile: "src/limits.pl" },
    { id: "SYM-list", type: "symbol", title: "ITEMS", sourceFile: "src/items.ts" },
  ];
  const values = (value_source: Row[]) =>
    certificates.valueSourceValues(context("/w", entities), contractOf({ value_source }));

  test("read constants, counts and project sources", async () => {
    const calls = evaluator(
      { ok: true, value: { scalar: 3 }, language: "prolog" },
      { ok: true, value: { count: 4, members: null }, language: "js" },
      { ok: true, value: { count: 2, members: null }, language: "prolog" },
    );
    const spec = { reader: "json", file: "a.json" };
    const read = spy(sources, "readSource", (async () => ({
      ok: true,
      model: { members: ["a", "b", "c"] },
    })) as never);
    expect(
      await values([
        { symbol_id: "SYM-limit", arg: 2 },
        { symbol_id: "SYM-list", measure: "count" },
        { symbol_id: "SYM-limit", measure: "count", arg: 1 },
        { source: spec, measure: "count" },
      ]),
    ).toEqual({
      ok: true,
      values: [
        { symbol_id: "SYM-limit", value: 3 },
        { symbol_id: "SYM-list", value: 4 },
        { symbol_id: "SYM-limit", value: 2 },
        { symbol_id: "json a.json", value: 3 },
      ],
    });
    expect(calls.map((call) => call.options)).toStrictEqual([{ arg: 2 }, {}, { arg: 1 }]);
    expect(JSON.parse(calls[0]?.args[0] as string).want).toBe("scalar");
    expect(read.mock.calls[0]?.slice(0, 2)).toEqual(["/w", spec]);
  });

  test("stop at the first value that does not read", async () => {
    evaluator(
      { ok: true, value: { error: "not a list" }, language: "js" },
      { ok: true, value: { count: 1 }, language: "js" },
    );
    expect(await values([{ symbol_id: "SYM-list", measure: "count" }])).toEqual({
      ok: false,
      reason: "not a list",
    });
    expect(await values([{ symbol_id: "SYM-list" }])).toEqual({
      ok: false,
      reason: "ITEMS in src/items.ts is not a finite number",
    });
    spy(sources, "readSource", (async () => ({ ok: false, reason: "no file" })) as never);
    expect(await values([{ source: { reader: "json", file: "a.json" }, measure: "count" }])).toEqual({
      ok: false,
      reason: "Kibi could not read the value_source json a.json: no file",
    });
  });
});

describe("smt certificates", () => {
  const contract = (extra: Row = {}) =>
    contractOf({ kind: "smt", constraint_source: { fact_ids: ["FACT-a"] }, ...extra });
  const query = "(declare-const limit Int)\n(assert (>= limit 5))\n(check-sat)";
  const certificate = (extra: Row = {}) => ({
    kind: "smt",
    test_id: "TEST-1",
    solver: { name: "z3" },
    query,
    ...extra,
  });
  const solver = (stdout = "unsat") =>
    spy(runner, "spawnSyncThroughFiles", (() => ({
      error: undefined,
      status: 0,
      stdout,
      stderr: "",
    })) as never);

  test("prove a query that states the facts and that the solver refutes", async () => {
    const run = solver();
    const ctx = context("/w", [fact("FACT-a")]);
    expect(await judged(ctx, contract(), certificate())).toBeUndefined();
    expect(
      await judged(ctx, contract(), certificate({ query: query.replace(" Int", "   Int") })),
    ).toBeUndefined();
    expect(run.mock.calls[0]?.[0]).toBe("z3");
    expect(run.mock.calls[0]?.[1]).toEqual(["-smt2", "-in"]);
  });

  test("need the declaration and every constraint", async () => {
    solver();
    const ctx = context("/w", [fact("FACT-a"), fact("FACT-r", { value_type: "number", value_number: 2 })]);
    expect(await judged(ctx, contract(), certificate({ query: "(check-sat)" }))).toBe(
      "the query does not declare (declare-const limit Int) for the facts' property",
    );
    expect(
      await judged(ctx, contract(), certificate({ query: "(declare-const limit Int)" })),
    ).toBe("the query does not assert the constraint_source or value_source constraint (assert (>= limit 5))");
    expect(
      await judged(
        ctx,
        contract({ constraint_source: { fact_ids: ["FACT-r"] } }),
        certificate({ query: "(declare-const limit Real)\n(assert (>= limit 2.0))" }),
      ),
    ).toBeUndefined();
  });

  test("need a named constant without facts, and a known solver", async () => {
    solver("sat");
    const entities: FakeEntity[] = [
      fact("FACT-a"),
      { id: "SYM-limit", type: "symbol", title: "LIMIT", sourceFile: "src/limits.ts" },
    ];
    const ctx = context("/w", entities);
    evaluator(
      { ok: true, value: { scalar: 7 }, language: "js" },
      { ok: true, value: { scalar: 7 }, language: "js" },
    );
    const valueOnly = contractOf({ kind: "smt", value_source: [{ symbol_id: "SYM-limit" }] });
    expect(await judged(ctx, valueOnly, certificate())).toBe(
      "the smt contract names no constraint_source facts, so Kibi cannot tell which constant the query is about",
    );
    expect(
      await judged(
        ctx,
        valueOnly,
        certificate({ variable: "cap", query: "(declare-const cap Int)(assert (= cap 7))" }),
      ),
    ).toBe("re-running z3 on the query answered sat, not unsat");
    expect(await judged(ctx, contract(), certificate({ solver: undefined }))).toBe(
      "solver  is not z3 or cvc5",
    );
  });
});

describe("certificates Kibi reads from the code", () => {
  test("hand rule, state machine and pattern certificates to their readers", async () => {
    const ctx = context("/w");
    for (const [kind, reader] of [
      ["rule", "ruleCertificateProblem"],
      ["state_machine", "machineCertificateProblem"],
      ["regex", "patternCertificateProblem"],
    ] as const) {
      const contract = contractOf({ kind });
      const certificate = { kind, test_id: "TEST-1" };
      const problem = spy(models, reader, (async () => `${kind} differs`) as never);
      expect(await judged(ctx, contract, certificate)).toBe(`${kind} differs`);
      expect(problem.mock.calls[0]).toEqual([ctx, contract, certificate]);
      problem.mockImplementation((async () => null) as never);
      expect(await judged(ctx, contract, certificate)).toBeUndefined();
    }
  });
});

describe("source certificates", () => {
  const spec = { reader: "json", file: "a.json" };
  const contract = contractOf({ kind: "source", source: spec });
  const model = { members: ["a", "b"] };
  const reading = (result: Row = { ok: true, model }) =>
    spy(sources, "readSource", (async () => result) as never);
  const complete = (left: unknown, chosen = contract) =>
    certificates.completeSourceCertificate(context("/w"), "TEST-1", chosen, left);
  const stored = { version: "kibi.code-certificate.v1", kind: "source", test_id: "TEST-1", source: spec, model };

  test("store Kibi's own read of the contract's source", async () => {
    const read = reading();
    for (const left of [undefined, null, { kind: "source", test_id: "TEST-1" }]) {
      expect(await complete(left)).toEqual({ ok: true, certificate: stored });
    }
    expect(
      await complete({ kind: "source", test_id: "TEST-1", source: { ...spec, extra: 1 }, model }),
    ).toEqual({ ok: true, certificate: stored });
    expect(read.mock.calls[0]?.slice(0, 2)).toEqual(["/w", spec]);
  });

  test("refuse a left certificate that disagrees", async () => {
    reading();
    expect(await complete({ test_id: "TEST-1" }, contractOf({ kind: "source" }))).toEqual({
      ok: false,
      reason: "the source contract names no source",
    });
    expect(await complete("text")).toEqual({
      ok: false,
      reason: "the run left a source certificate that is not a JSON object",
    });
    expect(await complete({ test_id: "TEST-1" })).toEqual({
      ok: false,
      reason: "the certificate kind (none) is not the contract kind source",
    });
    expect(await complete({ kind: "source", test_id: "TEST-2" })).toEqual({
      ok: false,
      reason: "the certificate is for TEST-2",
    });
    expect(
      await complete({ kind: "source", test_id: "TEST-1", source: { reader: "json", file: "b.json" } }),
    ).toEqual({
      ok: false,
      reason: 'the certificate reads {"reader":"json","file":"b.json"}, not the contract\'s source',
    });
  });

  test("refuse a model that is not Kibi's read, naming at most eight members", async () => {
    const many = { members: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] };
    reading({ ok: true, model: many });
    expect(await complete({ kind: "source", test_id: "TEST-1", model })).toEqual({
      ok: false,
      reason: "the certificate's model is not what Kibi reads from json a.json (a, b, c, d, e, f, g, h)",
    });
    reading({ ok: true, model: { members: [] } });
    expect(await complete({ kind: "source", test_id: "TEST-1", model })).toEqual({
      ok: false,
      reason: "the certificate's model is not what Kibi reads from json a.json (no members)",
    });
    reading({ ok: false, reason: "missing file" });
    expect(await complete(undefined)).toEqual({
      ok: false,
      reason: "Kibi could not read json a.json: missing file",
    });
  });

  test("prove a passed run on Kibi's read, and keep a refused one tested", async () => {
    const read = reading();
    prologCheck().set(stored);
    expect(await check(context("/w"), contract, undefined)).toStrictEqual({
      kind: "source",
      evidence_level: "proved",
      certificate: stored,
      certificate_digest: certificateDigest(stored),
    });
    const calls = read.mock.calls.length;
    const left = { kind: "source", test_id: "TEST-1", model: { members: ["z"] } };
    expect(await check(context("/w"), contract, left)).toStrictEqual({
      kind: "source",
      evidence_level: "tested",
      certificate: left,
      certificate_digest: certificateDigest(left),
      certificate_rejection: "the certificate's model is not what Kibi reads from json a.json (a, b)",
    });
    expect(await check(context("/w"), contract, "text")).toStrictEqual({
      kind: "source",
      evidence_level: "tested",
      certificate_rejection: "the run left a source certificate that is not a JSON object",
    });
    expect(read.mock.calls.length).toBe(calls + 1);
    expect((await check(context("/w"), contract, left, "failed")).certificate_rejection).toBe(
      "the proof run did not pass",
    );
    expect(read.mock.calls.length).toBe(calls + 1);
  });
});
