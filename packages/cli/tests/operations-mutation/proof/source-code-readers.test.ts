import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ReferenceExtractorV1 } from "kibi-plugin-sdk";
import ts from "typescript";
import * as runner from "../../../src/operations/proof/code-runner.js";
import { PROLOG_SOURCE_READER } from "../../../src/operations/proof/prolog-source-reader.js";
import {
  csharpProjectUsings,
  evaluateSourceCode,
  extractScriptReferences,
  typeScriptInstalls,
} from "../../../src/operations/proof/source-code-readers.js";
import { proofReferenceExtractorLoader } from "../../../src/plugins/proof-reference-extractors.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A scratch workspace with the given files. */
function workspace(files: Readonly<Record<string, string>> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-code-readers-"));
  roots.push(root);
  for (const [relative, body] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, body);
  }
  return root;
}

/** A scratch git repository with the given files tracked. */
function repository(files: Readonly<Record<string, string>>): string {
  const root = workspace(files);
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  return root;
}

type Spy = {
  mock: { calls: unknown[][] };
  mockRestore: () => void;
};

function spy<T extends object, K extends keyof T>(target: T, key: K, implementation: T[K]): Spy {
  const handle = spyOn(target, key as never).mockImplementation(implementation as never) as unknown as Spy;
  restores.push(() => handle.mockRestore());
  return handle;
}

/** What one file's references read, with each refusal as `line:text`. */
function refs(text: string, spec: Record<string, unknown>) {
  const found = extractScriptReferences(ts, "src/a.ts", text, spec as unknown as SourceSpec);
  return { members: found.members, unresolved: found.unresolved.map((row) => `${row.line}:${row.text}`) };
}

const read = (root: string, spec: Record<string, unknown>) =>
  evaluateSourceCode(root, spec as unknown as SourceSpec);

type EvaluatorCall = {
  root: string;
  file: string;
  scripts: Record<string, string>;
  args: string[];
  accept: (parsed: unknown) => boolean;
};

/** Stand in for the subprocess evaluator: record each call, answer in turn. */
function evaluator(...answers: unknown[]): EvaluatorCall[] {
  const calls: EvaluatorCall[] = [];
  spy(runner, "runCodeEvaluator", ((
    root: string,
    file: string,
    scripts: Record<string, string>,
    args: string[],
    accept: (parsed: unknown) => boolean,
  ) => {
    calls.push({ root, file, scripts, args, accept });
    return answers.shift();
  }) as never);
  return calls;
}

/** The plan an evaluator call was handed. */
const plan = (call: EvaluatorCall | undefined) => JSON.parse(call?.args[0] as string) as unknown;

/** Whether the evaluator's acceptance test takes each candidate answer. */
const accepts = (call: EvaluatorCall | undefined) =>
  [null, 1, "ok", {}, { ok: false }].map((candidate) => call?.accept(candidate));

describe("environment variable reads", () => {
  test("reads a property and a literal key, and refuses a computed key", () => {
    expect(refs("process.env.PORT;\nprocess.env['HOST'];\nprocess.env[k];", {"extract":"env"})).toEqual({
      members: ["PORT", "HOST"],
      unresolved: ["3:process.env[k]"],
    });
  });
  test("skips the variables Vite defines itself, on import.meta.env only", () => {
    expect(refs("import.meta.env.MODE; import.meta.env.BASE_URL; import.meta.env.PROD; import.meta.env.DEV; import.meta.env.SSR; import.meta.env.VITE_API; process.env.MODE; Bun.env.B; import.meta.env['MODE']", {"extract":"env"})).toEqual({
      members: ["VITE_API", "MODE", "B", "MODE"],
      unresolved: [],
    });
  });
  test("reads Deno.env.get with a literal name only", () => {
    expect(refs("Deno.env.get('A');\nDeno.env.get(k);\nDeno.env.set('Z', '1');", {"extract":"env"})).toEqual({
      members: ["A"],
      unresolved: ["2:Deno.env.get(k)"],
    });
  });
  test("reads destructured names and refuses a rest element", () => {
    expect(refs("const { PORT, 'HOST': h, ...rest } = process.env;", {"extract":"env"})).toEqual({
      members: ["PORT", "HOST"],
      unresolved: ["1:...rest"],
    });
  });
  test("follows destructuring through env and an env alias", () => {
    expect(refs("const { env: { A } } = process;\nconst { env } = process;\nenv.B;", {"extract":"env"})).toEqual({
      members: ["A", "B"],
      unresolved: [],
    });
  });
  test("follows destructuring from the global object", () => {
    expect(refs("const { process: { env: { C } } } = globalThis;", {"extract":"env"})).toEqual({
      members: ["C"],
      unresolved: [],
    });
  });
  test("refuses an array pattern and a computed key", () => {
    expect(refs("const [a] = process.env;\nconst { [k]: v } = process.env;", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:[a]", "2:[k]: v"],
    });
  });
  test("follows destructuring from a required process", () => {
    expect(refs("const { x } = require('process');\nconst { env: { D } } = require('node:process');", {"extract":"env"})).toEqual({
      members: ["D"],
      unresolved: [],
    });
  });
  test("destructures under casts", () => {
    expect(refs("const { E } = (process.env as any);\nconst { F } = process.env!;", {"extract":"env"})).toEqual({
      members: ["E", "F"],
      unresolved: [],
    });
  });
  test("refuses process, its env and the global object handed on", () => {
    expect(refs("f(process.env);\nf(process);\nprocess.cwd();\nf(globalThis);\ntypeof window;\n'Notification' in window;\n'process' in globalThis;\n'Bun' in globalThis;\nx in window;", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:process.env", "2:process", "4:globalThis", "7:globalThis", "8:globalThis", "9:window"],
    });
  });
  test("refuses import.meta handed on and follows it through a name", () => {
    expect(refs("f(import.meta);\nimport.meta.url;\nconst m = import.meta;\nm.env.X;", {"extract":"env"})).toEqual({
      members: ["X"],
      unresolved: ["1:import.meta"],
    });
  });
  test("lets a parameter, a block local and a function shadow a global", () => {
    expect(refs("function f(process) { g(process); }\n{ const globalThis = 1; g(globalThis); }\nfunction process() {}\ng(process);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("lets a class shadow a global", () => {
    expect(refs("class window {}\ng(window);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("lets a destructured parameter shadow a global", () => {
    expect(refs("function f([process]) { g(process); }\nfunction h([, globalThis]) { g(globalThis); }\nfunction k({ a: self }) { g(self); }", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("reads a name bound to the global object as that object", () => {
    expect(refs("const g = globalThis;\nh(g);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["2:g"],
    });
  });
  test("lets a local that binds no name shadow a global", () => {
    expect(refs("const window = pick();\nh(window);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("refuses a re-export of the process module", () => {
    expect(refs("export { env } from 'node:process';\nexport { x } from './y';\nexport * from 'process';\nexport { z };", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:export { env } from 'node:process';", "3:export * from 'process';"],
    });
  });
  test("refuses process or an unknown module loaded in place", () => {
    expect(refs("require('process').env.X;\nrequire(name);\nrequire('fs').readFileSync;", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:require('process')", "2:require(name)"],
    });
  });
  test("refuses code built from text", () => {
    expect(refs("eval('x');\nnew Function('x');\nvm.runInThisContext('x');\nvm.runInNewContext('x');\nvm.runInContext('x');\nvm.compileFunction('x');\nnew vm.Script('x');\nnew vm.SourceTextModule('x');", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:eval('x')", "2:new Function('x')", "3:vm.runInThisContext('x')", "4:vm.runInNewContext('x')", "5:vm.runInContext('x')", "6:vm.compileFunction('x')", "7:new vm.Script('x')", "8:new vm.SourceTextModule('x')"],
    });
  });
  test("reads through the global object", () => {
    expect(refs("globalThis.process.env.G;\nwindow.self.process.env.H;\nglobal.process.env.I;", {"extract":"env"})).toEqual({
      members: ["G", "H", "I"],
      unresolved: [],
    });
  });
  test("reads under parentheses, casts and the comma operator", () => {
    expect(refs("(0, process).env.J;\n(import.meta as any).env.K;\n(<any>process).env.L;\n(process satisfies object).env.M;\n(await p, process).env.N;", {"extract":"env"})).toEqual({
      members: ["J", "K", "L", "M", "N"],
      unresolved: [],
    });
  });
  test("follows aliases of process", () => {
    expect(refs("const p = process;\np.env.O;\nconst q = p;\nq.env.P;", {"extract":"env"})).toEqual({
      members: ["O", "P"],
      unresolved: [],
    });
  });
  test("reads only chains that are env", () => {
    expect(refs("process.env.A.toString();\nfoo.process.env.Q;\nthis.env.R;", {"extract":"env"})).toEqual({
      members: ["A"],
      unresolved: [],
    });
  });
  test("skips type positions", () => {
    expect(refs("let t: typeof process.env;\nclass A extends process.B {}", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("reads process imported or required under a name", () => {
    expect(refs("const n = require('node:process');\nn.env.S;\nimport proc from 'process';\nproc.env.T;\nimport * as pr from 'node:process';\npr.env.U;\nimport { env as e2 } from 'process';\ne2.V;", {"extract":"env"})).toEqual({
      members: ["S", "T", "U", "V"],
      unresolved: [],
    });
  });
  test("reads import-equals and default imports, not type-only ones", () => {
    expect(refs("import cp = require('process');\ncp.env.W;\nimport { default as dp } from 'process';\ndp.env.X;\nimport type { env as te } from 'process';\nimport { type env as te2 } from 'process';\nte.Y;\nte2.Z;", {"extract":"env"})).toEqual({
      members: ["W", "X"],
      unresolved: [],
    });
  });
});

describe("import reads", () => {
  test("lists import and export declarations under both spellings", () => {
    expect(refs("import a from 'a';\nimport * as b from 'node:fs';\nimport { c } from 'c';\nimport type { T } from 't';\nexport { d } from 'd';\nexport * from 'e';\nimport f = require('f');\nexport { z };\nimport 'side';", {"extract":"imports"})).toEqual({
      members: ["a", "node:fs", "fs", "c", "t", "d", "e", "f", "side"],
      unresolved: [],
    });
  });
  test("lists modules loaded by calls and refuses a computed one", () => {
    expect(refs("require('g');\nimport('h');\nrequire(x);\nmodule.require('i');\nprocess.getBuiltinModule('node:path');\ncreateRequire(import.meta.url)('j');\nmodule.createRequire(u)('j2');\nnode('nope');", {"extract":"imports"})).toEqual({
      members: ["g", "h", "i", "node:path", "path", "j", "j2"],
      unresolved: ["3:require(x)"],
    });
  });
  test("follows a created require and refuses a loader handed on", () => {
    expect(refs("const req = createRequire(import.meta.url);\nreq('k');\nconst r = require;\nconst list = [require][0];\nuse(module.require);\nuse(createRequire);\nrequire.resolve('x');", {"extract":"imports"})).toEqual({
      members: ["k"],
      unresolved: ["4:require", "5:module.require", "6:createRequire"],
    });
  });
  test("never reads a declared name as a loader", () => {
    expect(refs("const require = 1;\nfunction require() {}\nclass require {}\nimport { require } from 'x';\nexport { require };\nconst o = { require: 1 };\nclass A { require = 1; require() {} }\ninterface I { require: 1 }\nconst { require } = y;\nconst { require: r } = y;\nimport { require as r2 } from 'x';\nexport { require as r3 };\nx.require;\nimport q = A.require;\nfunction f(require) {}\nrequire: for (;;) {}\nlet t: typeof require;\nclass B implements require {}", {"extract":"imports"})).toEqual({
      members: ["x", "x"],
      unresolved: [],
    });
  });
  test("lists literal loads under casts", () => {
    expect(refs("import x = require(name);\nimport y = A.b;\nconst w = require('node:nonexistent');\nconst v = (require)('paren');\nconst u = require!('bang');", {"extract":"imports"})).toEqual({
      members: ["node:nonexistent", "paren", "bang"],
      unresolved: [],
    });
  });
});

describe("call reads", () => {
  test("lists calls, call, apply and bind targets, and refuses a computed callee", () => {
    expect(refs("foo();\na.b.c();\nf.call(x);\ng.apply(x);\nh.bind(x)();\nobj[k]();\nobj['m']();\n(() => 1)();", {"extract":"calls"})).toEqual({
      members: ["foo", "a.b.c", "f.call", "f", "g.apply", "g", "h.bind", "h", "obj.m"],
      unresolved: ["6:obj[k]"],
    });
  });
  test("lists imported functions and built-in modules used as values", () => {
    expect(refs("import { execSync as run } from 'child_process';\nrun('ls');\nimport cp from 'node:child_process';\nuse(cp);\nimport { readFile } from 'fs';\nuse(readFile);\nimport * as path from 'path';\nuse(path);\nimport lo from 'lodash';\nuse(lo);\nuse(lo.map);", {"extract":"calls"})).toEqual({
      members: ["run", "child_process.execSync", "use", "child_process.*", "use", "readFile", "fs.readFile", "use", "path.*", "use", "lo", "lodash", "use", "lo.map", "lodash.map"],
      unresolved: [],
    });
  });
  test("lists a member called on a module loaded in place", () => {
    expect(refs("require('child_process').exec('x');\nrequire('fs');\nrequire('lodash').x;\nrequire(x);\nrequire('os').platform;\nnew (require('events'))();", {"extract":"calls"})).toEqual({
      members: ["child_process.exec", "require", "fs.*", "require", "require", "require", "os.*", "require", "events.*", "require"],
      unresolved: ["4:require(x)"],
    });
  });
  test("lists an imported member followed into a declaration", () => {
    expect(refs("import { a } from 'm';\nconst b = a.c;\nconst d = a;\nimport e from 'n';\nconst f = e;\nconst g = e.h;", {"extract":"calls"})).toEqual({
      members: ["m.a.c", "m.a", "n.h"],
      unresolved: [],
    });
  });
  test("lists an imported name used as a value outside types", () => {
    expect(refs("import { a } from 'm';\nlet t: typeof a;\nconst o = { a };\nx.a;\na.b.c;\nnew a();\ncls.a();\nconst h = (a as any);", {"extract":"calls"})).toEqual({
      members: ["a", "m.a", "a.b.c", "m.a.b.c", "cls.a", "m.a"],
      unresolved: [],
    });
  });
  test("lists calls on required modules", () => {
    expect(refs("const cp = require('child_process');\ncp.exec('x');\nconst { spawn } = require('node:child_process');\nspawn('y');\nuse(cp);", {"extract":"calls"})).toEqual({
      members: ["require", "cp.exec", "child_process.exec", "require", "spawn", "child_process.spawn", "use", "child_process.*"],
      unresolved: [],
    });
  });
});

describe("first-argument reads", () => {
  test("reads the first argument of a matching call", () => {
    expect(refs("exec('a');\ncp.exec('b');\nexec(x);\nother('c');\ncp.execSync('d');\nexecute('e');\nexec();\n(() => 1)('f');", {"extract":"string_args","callee":"exec"})).toEqual({
      members: ["a", "b"],
      unresolved: ["3:exec(x)", "7:exec()"],
    });
  });
  test("matches a dotted callee exactly", () => {
    expect(refs("exec('a');\ncp.exec('b');\nx.cp.exec('c');", {"extract":"string_args","callee":"cp.exec"})).toEqual({
      members: ["b"],
      unresolved: [],
    });
  });
  test("reads template literals and refuses substitutions", () => {
    expect(refs("import { execSync as run } from 'child_process';\nrun('a');\nrun(`b`);\nrun(`c${d}`);", {"extract":"string_args","callee":"execSync"})).toEqual({
      members: ["a", "b"],
      unresolved: ["4:run(`c${d}`)"],
    });
  });
  test("matches nothing without a callee", () => {
    expect(refs("exec('a');\nf('b');", {"extract":"string_args"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("reads a numeric callee as text", () => {
    expect(refs("exec('a');", {"extract":"string_args","callee":7})).toEqual({
      members: [],
      unresolved: [],
    });
  });
});

describe("throw reads", () => {
  test("names what is thrown", () => {
    expect(refs("throw new E();\nthrow make();\ntry {} catch (e) { throw e; }\nthrow x;\nthrow a.b.C('m');\nthrow (new F());\nthrow 'text';\nthrow (() => 1)();", {"extract":"thrown"})).toEqual({
      members: ["E", "make", "a.b.C", "F"],
      unresolved: ["4:throw x;", "7:throw 'text';", "8:throw (() => 1)();"],
    });
  });
  test("refuses rethrowing anything but a named catch variable", () => {
    expect(refs("try {} catch ({ message }) { throw message; }\ntry {} catch { throw err; }\ntry {} catch (e) {}\nthrow e;", {"extract":"thrown"})).toEqual({
      members: [],
      unresolved: ["1:throw message;", "2:throw err;", "4:throw e;"],
    });
  });
});

describe("property value reads", () => {
  test("reads literal property values and refuses others", () => {
    expect(refs("x = { acl: 'x' };\ny = { 'acl': 'y' };\nz = { acl: v };\nw = { acl };\nu = { other: 'z' };\nt = { [k]: 1 };\ns = { 1: 'n' };\nr = { acl: `tpl` };", {"extract":"property","key":"acl"})).toEqual({
      members: ["x", "y", "tpl"],
      unresolved: ["3:acl: v", "4:acl"],
    });
  });
  test("matches nothing without a key", () => {
    expect(refs("x = { acl: 'x' };", {"extract":"property"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("reads a numeric key as text", () => {
    expect(refs("x = { acl: 'x', '': 'e' };", {"extract":"property","key":3})).toEqual({
      members: [],
      unresolved: [],
    });
  });
});

describe("other reads", () => {
  test("reads nothing for an unknown extract", () => {
    expect(refs("process.env.X; eval('x'); require(y);", {"extract":"nothing"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
});

describe("refusal places", () => {
  test("places a refusal on its line with whitespace folded", () => {
    expect(refs("\n\nf(\n  process.env,\n   1\n);\nf(process\n.env);\nf(process.env /* aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa */);\nprocess.env[  k  ];", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["4:process.env", "7:process .env", "9:process.env", "10:process.env[ k ]"],
    });
  });
  test("cuts a refusal's text at 80 characters", () => {
    expect(refs("process.env[\n  k   +   'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'\n];", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:process.env[ k + 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    });
  });
});

describe("import reads never take as a loader", () => {
  test("a variable", () => {
    expect(refs("const require = 1;", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a function", () => {
    expect(refs("function require() {}", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a class", () => {
    expect(refs("class require {}", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("an export", () => {
    expect(refs("export { require };", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a property", () => {
    expect(refs("const o = { require: 1 };", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a class field", () => {
    expect(refs("class A { require = 1; }", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a method", () => {
    expect(refs("class A { require() {} }", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("an interface member", () => {
    expect(refs("interface I { require: 1 }", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a destructured name", () => {
    expect(refs("const { require } = f();", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a destructured key", () => {
    expect(refs("const { require: r } = f();", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("an imported name", () => {
    expect(refs("import { require as r } from 'x';", {"extract":"imports"})).toEqual({
      members: ["x"],
      unresolved: [],
    });
  });
  test("an exported name", () => {
    expect(refs("export { require as r };", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a member name", () => {
    expect(refs("x.require;", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a qualified name", () => {
    expect(refs("import q = A.require;", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a parameter", () => {
    expect(refs("function f(require) {}", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a label", () => {
    expect(refs("require: for (;;) {}", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a typeof type", () => {
    expect(refs("let t: typeof require;", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("an implements clause", () => {
    expect(refs("class B implements require {}", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a default import", () => {
    expect(refs("import require from 'require';", {"extract":"imports"})).toEqual({
      members: ["require"],
      unresolved: [],
    });
  });
  test("a namespace import", () => {
    expect(refs("import * as require from 'require';", {"extract":"imports"})).toEqual({
      members: ["require"],
      unresolved: [],
    });
  });
  test("a renamed default import", () => {
    expect(refs("import { default as require } from 'require';", {"extract":"imports"})).toEqual({
      members: ["require"],
      unresolved: [],
    });
  });
  test("a shorthand property value", () => {
    expect(refs("use({ require });", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: ["1:require"],
    });
  });
  test("a class field value", () => {
    expect(refs("class A { x = require; }", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: ["1:require"],
    });
  });
  test("a property value", () => {
    expect(refs("({ a: require });", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: ["1:require"],
    });
  });
  test("a parameter default", () => {
    expect(refs("function f(a = require) {}", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: ["1:require"],
    });
  });
  test("a destructuring default", () => {
    expect(refs("const { a = require } = f();", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: ["1:require"],
    });
  });
  test("an import-equals", () => {
    expect(refs("import require = require('require');", {"extract":"imports"})).toEqual({
      members: ["require"],
      unresolved: [],
    });
  });
  test("an argument", () => {
    expect(refs("use(require);", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: ["1:require"],
    });
  });
  test("an extends clause", () => {
    expect(refs("class B extends require {}", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a type alias", () => {
    expect(refs("type T = typeof require;", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("a type argument", () => {
    expect(refs("let u: A<typeof require>;", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
});

describe("bound names", () => {
  test("follows at most eight aliases", () => {
    expect(refs("const a1 = process;\nconst a2 = a1;\nconst a3 = a2;\nconst a4 = a3;\nconst a5 = a4;\nconst a6 = a5;\nconst a7 = a6;\nconst a8 = a7;\nconst a9 = a8;\na8.env.X;\na9.env.Y;", {"extract":"env"})).toEqual({
      members: ["X"],
      unresolved: [],
    });
  });
  test("drops a global object prefix only before a known name", () => {
    expect(refs("const self = globalThis;\nself.process.env.Z;\nglobalThis.foo.env.W;\nwindow.process;", {"extract":"env"})).toEqual({
      members: ["Z"],
      unresolved: ["4:window.process"],
    });
  });
  test("binds nothing from a named import of process and refuses a computed key", () => {
    expect(refs("import { a } from 'process';\nconst { b, ...c } = require('x');\nconst { ['d']: d2, 'e': e2, f: { g } } = process;\ng;", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["3:['d']: d2"],
    });
  });
  test("binds destructured names from a required module", () => {
    expect(refs("const { a, ...rest } = require('m');\na();\nrest.x();\nconst { [k]: z } = require('m');\nz();\nconst { 'q': qq } = require('m');\nqq();\nconst [arr] = require('m');\narr();", {"extract":"calls"})).toEqual({
      members: ["require", "a", "m.a", "rest.x", "require", "z", "require", "qq", "m.q", "require", "arr"],
      unresolved: [],
    });
  });
  test("binds default, namespace and named imports but not type-only ones", () => {
    expect(refs("import def, * as ns from 'm';\ndef();\nns.f();\nimport d2, { n1 } from 'm2';\nd2();\nn1();\nimport { type T1, n2 } from 'm3';\nT1();\nn2();\nimport type D3 from 'm4';\nD3();\nimport {} from 'm5';\nimport 'm6';", {"extract":"calls"})).toEqual({
      members: ["def", "m", "ns.f", "m.f", "d2", "m2", "n1", "m2.n1", "T1", "n2", "m3.n2", "D3"],
      unresolved: [],
    });
  });
  test("binds import-equals, required and created-require names", () => {
    expect(refs("import x = require('m');\nx.y();\nimport w = N.M;\nw();\nconst v = require(name);\nv.f();\nconst u = createRequire(import.meta.url);\nu('fs').readFileSync();\nconst [t] = createRequire(import.meta.url);\nlet s;\nconst r = (q as any);\nr.z();", {"extract":"calls"})).toEqual({
      members: ["x.y", "m.y", "w", "require", "v.f", "createRequire", "fs.readFileSync", "u", "require", "createRequire", "r.z", "q.z"],
      unresolved: [],
    });
  });
  test("binds a default import named as default", () => {
    expect(refs("import { default as dd } from 'm';\ndd.f();\nuse(dd);\nimport cp from 'child_process';\nconst c2 = cp;\nuse(c2);", {"extract":"calls"})).toEqual({
      members: ["dd.f", "m.f", "use", "dd", "m", "use", "c2", "child_process"],
      unresolved: [],
    });
  });
});

describe("shadowing and chains", () => {
  test("lets an unnamed default export shadow nothing", () => {
    expect(refs("export default function () {}\ng(process);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["2:process"],
    });
  });
  test("lets any declarator shadow", () => {
    expect(refs("const a = 1, process = f();\ng(process);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("lets an interface shadow nothing", () => {
    expect(refs("interface process {}\ng(process);", { extract: "env" })).toEqual({
      members: [],
      unresolved: ["2:process"],
    });
  });
  test("never reads a type, type parameter or enum name as a loader", () => {
    expect(
      refs("interface require {}\ntype require = 1;\nfunction f<require>() {}\nenum require {}", { extract: "imports" }),
    ).toEqual({ members: [], unresolved: [] });
  });
  test("lets a later file local shadow", () => {
    expect(refs("function f() { g(self); }\nconst self = pick();", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("never reads a label as a global", () => {
    expect(refs("label: for (;;) { break label; }\nprocess: for (;;) { continue process; }", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("lists call targets only at the end of a chain", () => {
    expect(refs("f.call.x();\nab.call();\nf.bind.call();", {"extract":"calls"})).toEqual({
      members: ["f.call.x", "ab.call", "ab", "f.bind.call", "f.bind"],
      unresolved: [],
    });
  });
  test("refuses process handed on under casts and env aliases handed on", () => {
    expect(refs("f(process!);\nf((process));\nf(process as any);\nconst e = process.env;\ne.X;\nf(e);", {"extract":"env"})).toEqual({
      members: ["X"],
      unresolved: ["1:process", "2:process", "3:process", "6:e"],
    });
  });
  test("reads optional chains and refuses a global's member handed on", () => {
    expect(refs("process?.env.Y;\nprocess.env?.Z;\nf(globalThis.window);\nnew globalThis.Foo();", {"extract":"env"})).toEqual({
      members: ["Y", "Z"],
      unresolved: ["3:globalThis.window"],
    });
  });
});

describe("edge cases", () => {
  test("chains through this and stops at a call", () => {
    expect(refs("this.run();\nf().x();", {"extract":"calls"})).toEqual({
      members: ["this.run", "f"],
      unresolved: [],
    });
  });
  test("reads import.meta's members under casts and refuses process as a key", () => {
    expect(refs("(import.meta as any).url;\nx[process];", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["2:process"],
    });
  });
  test("strips node: only before a built-in name", () => {
    expect(refs("import x from 'abcd:fs';\nimport y from 'node:abcfs';", {"extract":"imports"})).toEqual({
      members: ["abcd:fs", "node:abcfs"],
      unresolved: [],
    });
  });
  test("counts no private built-in module as public", () => {
    expect(refs("import x from '_http_agent';\nuse(x);", {"extract":"calls"})).toEqual({
      members: ["use", "x", "_http_agent"],
      unresolved: [],
    });
  });
  test("marks default and import-equals bindings of a built-in as the module", () => {
    expect(refs("import { default as cp } from 'child_process';\nuse(cp);\nimport cp2 = require('child_process');\nuse(cp2);", {"extract":"calls"})).toEqual({
      members: ["use", "child_process.*", "use", "child_process.*"],
      unresolved: [],
    });
  });
  test("binds nothing from a module that is not a literal", () => {
    expect(refs("import x from y;\nimport z = require(w);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("binds nothing from a call", () => {
    expect(refs("const x = f();\nx.y();", {"extract":"calls"})).toEqual({
      members: ["f", "x.y"],
      unresolved: [],
    });
  });
  test("lets a pattern from a created require shadow", () => {
    expect(refs("const { window } = createRequire(import.meta.url);\ng(window);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("binds no created require to a pattern", () => {
    expect(refs("const { a } = createRequire(u);\nundefined('m');", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("refuses a loader read as a namespace, under parentheses, and code built from text", () => {
    expect(refs("import q = require.x;\nuse((require));\neval('x');", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: ["1:require", "2:require", "3:eval('x')"],
    });
  });
  test("lets only a parameter pattern element that binds the name shadow", () => {
    expect(refs("function h([a, b]) { g(globalThis); }\nfunction k([, a]) { g(globalThis); }", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:globalThis", "2:globalThis"],
    });
  });
  test("refuses the global object outside an in query", () => {
    expect(refs("'a' + window;\nwindow in x;", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:window", "2:window"],
    });
  });
  test("reads inside catch blocks and lists no module member as a variable", () => {
    expect(refs("try {} catch (e) { process.env.X; }\nrequire('fs').readFileSync();", {"extract":"env"})).toEqual({
      members: ["X"],
      unresolved: [],
    });
  });
  test("lists modules used in place and imports used as values", () => {
    expect(refs("require(x).run();\nrequire('fs')();\nrequire('process').x;\nimport lodash from 'lodash';\nuse(lodash);\nimport x2 from 'x2';\nconst y = x2.z;", {"extract":"calls"})).toEqual({
      members: ["require", "fs.*", "require", "process.*", "require", "use"],
      unresolved: ["1:require(x)"],
    });
  });
  test("refuses a parameter default and follows no call or new.target", () => {
    expect(refs("function f({ A } = process.env) {}\nconst { a } = f();\nfunction F() { g(new.target); }", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["1:process.env"],
    });
  });
  test("lists no module that is not a literal", () => {
    expect(refs("import x from y;", {"extract":"imports"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("matches numeric keys only as written strings, and a shorthand only by its name", () => {
    expect(refs("({ 1: 'n', '1': 's' });\n({ other });", {"extract":"property","key":"1"})).toEqual({
      members: ["s"],
      unresolved: [],
    });
  });
  test("reads nothing from a rest under a non-env key", () => {
    expect(refs("const { a: { ...r } } = process;\nconst { env } = process;", {"extract":"env"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("matches no call that is no name", () => {
    expect(refs("f()('a');\nnull('b');", {"extract":"string_args","callee":"null"})).toEqual({
      members: [],
      unresolved: [],
    });
  });
  test("refuses the global object put in an array", () => {
    expect(refs("const a = 1;\nconst [x] = [globalThis];\ng(x);", {"extract":"env"})).toEqual({
      members: [],
      unresolved: ["2:globalThis"],
    });
  });
});

describe("calls under chains", () => {
  test("refuse a computed member of a call and list a built-in called in place", () => {
    expect(refs("f()['x']();\nrequire('fs')()();", { extract: "calls" })).toEqual({
      members: ["f", "fs.*", "require"],
      unresolved: ["1:f()['x']"],
    });
  });
  test("never read a loader that is the object of a member read", () => {
    expect(refs("(require).resolve('x');\nrequire['resolve']('y');", { extract: "imports" })).toEqual({
      members: [],
      unresolved: [],
    });
  });
});

describe("the references reader", () => {
  const files = { "src/a.ts": "process.env.A;\n", "src/b.ts": "process.env.B;\n" };

  test("names the globs nothing matches", async () => {
    const root = workspace();
    expect(await read(root, { reader: "references", files: ["src/*.ts", 3, "lib/*.ts"], extract: "env" })).toEqual({
      ok: false,
      reason: "no file matches src/*.ts, lib/*.ts",
    });
    expect(await read(root, { reader: "references", files: "src/*.ts", extract: "env" })).toEqual({
      ok: false,
      reason: "no file matches src/*.ts",
    });
    expect(await read(root, { reader: "references", files: 5, extract: "env" })).toEqual({
      ok: false,
      reason: "no file matches ",
    });
  });

  test("leaves out ignored files, from a glob or a list", async () => {
    const root = workspace(files);
    for (const ignore of ["src/b.ts", ["src/b.ts", 7]])
      expect(await read(root, { reader: "references", files: "src/*.ts", ignore, extract: "env" })).toEqual({
        ok: true,
        members: ["A"],
      });
    expect(await read(root, { reader: "references", files: "src/*.ts", ignore: 7, extract: "env" })).toEqual({
      ok: true,
      members: ["A", "B"],
    });
  });

  test("reads scripts without the plugin loader or a subprocess", async () => {
    const root = workspace(files);
    const load = spy(proofReferenceExtractorLoader, "load", (() => {
      throw new Error("plugins loaded");
    }) as never);
    const calls = evaluator();
    expect(await read(root, { reader: "references", files: "src/*.ts", extract: "env" })).toEqual({
      ok: true,
      members: ["A", "B"],
    });
    expect(load.mock.calls).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  test("names what each extract could not read", async () => {
    const cases: [Record<string, unknown>, string, string][] = [
      [{ extract: "env" }, "process.env[k];", "environment variable reads: src/a.ts:1 process.env[k]"],
      [{ extract: "imports" }, "require(x);", "imports: src/a.ts:1 require(x)"],
      [{ extract: "calls" }, "obj[k]();", "calls: src/a.ts:1 obj[k]"],
      [{ extract: "string_args", callee: "exec" }, "exec(x);", "first arguments: src/a.ts:1 exec(x)"],
      [{ extract: "thrown" }, "throw x;", "throw statements: src/a.ts:1 throw x;"],
      [{ extract: "property", key: "acl" }, "({ acl: v });", "property values: src/a.ts:1 acl: v"],
    ];
    for (const [spec, text, shown] of cases) {
      const root = workspace({ "src/a.ts": text });
      const [what, rows] = shown.split(": ") as [string, string];
      expect(await read(root, { reader: "references", files: "src/a.ts", ...spec })).toEqual({
        ok: false,
        reason: `Kibi cannot read 1 ${what} statically, so the set is not known exactly: ${shown.slice(what.length + 2)}`,
      });
      expect(rows).toContain("src/a.ts:1");
    }
  });

  test("refuses scripts when no TypeScript parser loads", async () => {
    const root = workspace(files);
    for (const attempts of [[], [() => { throw new Error("missing"); }, () => ({}), () => undefined, () => null]]) {
      spy(typeScriptInstalls, "attempts", () => attempts);
      expect(await read(root, { reader: "references", files: "src/*.ts", extract: "env" })).toEqual({
        ok: false,
        reason: "Kibi reads TypeScript and JavaScript references with the TypeScript parser; install typescript in the workspace",
      });
      for (const restore of restores.splice(0)) restore();
    }
  });

  test("parses with the workspace's own TypeScript first", async () => {
    const parsed: string[] = [];
    const holder = globalThis as { __kibiReadersTs?: unknown };
    holder.__kibiReadersTs = {
      ...ts,
      createSourceFile: (...args: Parameters<typeof ts.createSourceFile>) => {
        parsed.push(args[0]);
        return ts.createSourceFile(...args);
      },
    };
    restores.push(() => {
      delete holder.__kibiReadersTs;
    });
    const root = workspace({
      ...files,
      "node_modules/typescript/package.json": '{"name":"typescript","main":"index.js"}',
      "node_modules/typescript/index.js": "module.exports = globalThis.__kibiReadersTs;\n",
    });
    expect(await read(root, { reader: "references", files: "src/*.ts", extract: "env" })).toEqual({
      ok: true,
      members: ["A", "B"],
    });
    expect(parsed).toEqual(["src/a.ts", "src/b.ts"]);
  });

  test("passes over a workspace TypeScript without a parser", async () => {
    const root = workspace({
      ...files,
      "node_modules/typescript/package.json": '{"name":"typescript","main":"index.js"}',
      "node_modules/typescript/index.js": 'module.exports = { version: "0.0.0" };\n',
    });
    expect(await read(root, { reader: "references", files: "src/*.ts", extract: "env" })).toEqual({
      ok: true,
      members: ["A", "B"],
    });
  });
});

describe("Python references", () => {
  const python = { "app.py": "import os\n", "lib.py": "import sys\n", "src/a.ts": "process.env.A;\n" };
  const answer = (value: unknown) => ({ ok: true, value, language: "python" });

  test("run one subprocess over every Python file, after the scripts", async () => {
    const root = workspace(python);
    const calls = evaluator(answer({ ok: true, members: ["HOME"], unresolved: [] }));
    expect(await read(root, { reader: "references", files: "**/*", ignore: "node_modules/**", extract: "env" })).toEqual({
      ok: true,
      members: ["A", "HOME"],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.root).toBe(root);
    expect(calls[0]?.file).toBe("app.py");
    expect(Object.keys(calls[0]?.scripts ?? {})).toEqual(["python"]);
    expect(calls[0]?.scripts.python).toContain("import ast, json, sys");
    expect(plan(calls[0])).toEqual({ extract: "env", files: ["app.py", "lib.py"] });
    expect(accepts(calls[0])).toEqual([false, false, false, false, true]);
  });

  test("hand the callee and the key on", async () => {
    const root = workspace(python);
    const calls = evaluator(answer({ ok: true, members: [] }), answer({ ok: true }));
    expect(await read(root, { reader: "references", files: "*.py", extract: "string_args", callee: "run" })).toEqual({
      ok: true,
      members: [],
    });
    expect(await read(root, { reader: "references", files: "*.py", extract: "property", key: "acl" })).toEqual({
      ok: true,
      members: [],
    });
    expect(plan(calls[0])).toEqual({ extract: "string_args", callee: "run", files: ["app.py", "lib.py"] });
    expect(plan(calls[1])).toEqual({ extract: "property", key: "acl", files: ["app.py", "lib.py"] });
  });

  test("read only Python files with it, and load no TypeScript for them", async () => {
    const root = workspace(python);
    spy(typeScriptInstalls, "attempts", (() => {
      throw new Error("TypeScript loaded");
    }) as never);
    const calls = evaluator(answer({ ok: true, members: ["X"], unresolved: [] }));
    expect(await read(root, { reader: "references", files: "lib.py", extract: "env" })).toEqual({
      ok: true,
      members: ["X"],
    });
    expect(plan(calls[0])).toEqual({ extract: "env", files: ["lib.py"] });
  });

  test("refuse what the subprocess could not read", async () => {
    const root = workspace(python);
    evaluator(
      { ok: false, failure: "python3 is missing", language: null },
      { ok: false, failure: "", language: "python" },
      answer({ ok: false, error: "app.py: invalid syntax" }),
      answer({ ok: false }),
      answer({ ok: true, members: ["A"], unresolved: [{ file: "app.py", line: 3, text: "os.environ" }] }),
    );
    const spec = { reader: "references", files: "*.py", extract: "env" };
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not run Python to read app.py: python3 is missing" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not run Python to read app.py" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not parse app.py: invalid syntax" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not parse a Python file" });
    expect(await read(root, spec)).toEqual({
      ok: false,
      reason: "Kibi cannot read 1 environment variable reads statically, so the set is not known exactly: app.py:3 os.environ",
    });
  });
});

describe("SWI-Prolog references", () => {
  const prolog = { "rules.pl": "p :- q.\n", "more.pl": "q.\n" };
  const answer = (value: unknown) => ({ ok: true, value, language: "prolog" });

  test("read through the source reader with the extract and callee", async () => {
    const root = workspace(prolog);
    const calls = evaluator(answer({ ok: true, members: ["q/0"], unresolved: [] }), answer({ ok: true }));
    expect(await read(root, { reader: "references", files: "*.pl", extract: "calls" })).toEqual({
      ok: true,
      members: ["q/0"],
    });
    expect(await read(root, { reader: "references", files: "*.pl", extract: "string_args", callee: "format" })).toEqual({
      ok: true,
      members: [],
    });
    expect(calls[0]?.file).toBe("more.pl");
    expect(calls[0]?.scripts).toEqual({ prolog: PROLOG_SOURCE_READER });
    expect(plan(calls[0])).toEqual({ mode: "references", extract: "calls", files: ["more.pl", "rules.pl"] });
    expect(plan(calls[1])).toEqual({
      mode: "references",
      extract: "string_args",
      callee: "format",
      files: ["more.pl", "rules.pl"],
    });
    expect(accepts(calls[0])).toEqual([false, false, false, false, true]);
  });

  test("have no property values", async () => {
    const root = workspace(prolog);
    const calls = evaluator();
    expect(await read(root, { reader: "references", files: "rules.pl", extract: "property", key: "acl" })).toEqual({
      ok: false,
      reason: "SWI-Prolog has no property values to extract (rules.pl); read fact arguments with the prolog reader",
    });
    expect(calls).toHaveLength(0);
  });

  test("refuse what the reader could not read", async () => {
    const root = workspace(prolog);
    evaluator(
      { ok: false, failure: "swipl is missing", language: null },
      { ok: false, failure: "", language: "prolog" },
      answer({ ok: false, error: "rules.pl:1: syntax error" }),
      answer({ ok: false }),
      answer({ ok: true, members: ["q/0"], unresolved: [{ file: "rules.pl", line: 2, text: "call(G)" }] }),
    );
    const spec = { reader: "references", files: "rules.pl", extract: "calls" };
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not run SWI-Prolog to read rules.pl: swipl is missing" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not run SWI-Prolog to read rules.pl" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "rules.pl:1: syntax error" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not read rules.pl" });
    expect(await read(root, spec)).toEqual({
      ok: false,
      reason: "Kibi cannot read 1 calls statically, so the set is not known exactly: rules.pl:2 call(G)",
    });
  });
});

describe("the prolog reader", () => {
  const answer = (value: unknown) => ({ ok: true, value, language: "prolog" });

  test("reads one argument of each fact, with or without a position", async () => {
    const root = workspace({ "facts.pl": "color(red).\n" });
    const calls = evaluator(answer({ ok: true, members: ["red"], sequence: ["red"] }), answer({ ok: true }));
    expect(await read(root, { reader: "prolog", file: "facts.pl", functor: "color", arg: 1 })).toEqual({
      ok: true,
      members: ["red"],
      sequence: ["red"],
    });
    expect(await read(root, { reader: "prolog", file: "facts.pl", functor: "color" })).toEqual({
      ok: true,
      members: [],
      sequence: [],
    });
    expect(calls[0]?.file).toBe("facts.pl");
    expect(calls[0]?.scripts).toEqual({ prolog: PROLOG_SOURCE_READER });
    expect(plan(calls[0])).toEqual({ mode: "terms", file: "facts.pl", functor: "color", arg: 1 });
    expect(plan(calls[1])).toEqual({ mode: "terms", file: "facts.pl", functor: "color" });
  });

  test("refuses what the reader could not read", async () => {
    const root = workspace({ "facts.pl": "color(red).\n" });
    evaluator({ ok: false, failure: "swipl is missing", language: null }, answer({ ok: false, error: "no functor" }));
    const spec = { reader: "prolog", file: "facts.pl", functor: "color" };
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not run SWI-Prolog to read facts.pl: swipl is missing" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "no functor" });
  });
});

describe("the module readers", () => {
  const answer = (value: unknown) => ({ ok: true, value, language: "js" });
  const users = { name: "users", columns: [], foreign_keys: [] };

  test("load a drizzle schema with the module evaluator", async () => {
    const root = workspace({ "db/schema.ts": "export const users = {};\n" });
    const calls = evaluator(answer({ ok: true, entities: [users] }));
    expect(
      await read(root, { reader: "schema", format: "drizzle", file: "db/schema.ts", exports: ["users"], names_from: ["a.ts", 4] }),
    ).toEqual({ ok: true, entities: [users] });
    expect(calls[0]?.root).toBe(root);
    expect(calls[0]?.file).toBe("db/schema.ts");
    expect(Object.keys(calls[0]?.scripts ?? {})).toEqual(["js", "python"]);
    expect(calls[0]?.scripts.js).toContain(JSON.stringify(runner.TS_RESOLVE_HOOKS));
    expect(calls[0]?.scripts.js).toContain('Symbol.for("drizzle:IsDrizzleTable")');
    expect(calls[0]?.scripts.python).toContain("model_fields");
    expect(plan(calls[0])).toEqual({
      reader: "schema",
      root: path.resolve(root),
      file: path.resolve(root, "db/schema.ts"),
      exports: ["users"],
      names_from: [path.resolve(root, "a.ts")],
    });
    expect(accepts(calls[0])).toEqual([false, false, false, false, true]);
  });

  test("load a route table with its framework and middleware names", async () => {
    const root = workspace({ "app.ts": "export const app = {};\n" });
    const route = { method: "GET", path: "/", middleware: [] };
    const calls = evaluator(answer({ ok: true, routes: [route] }), answer({ ok: true }));
    expect(
      await read(root, { reader: "routes", file: "app.ts", export: "app", framework: "hono", names_from: "mw.ts" }),
    ).toEqual({ ok: true, routes: [route] });
    expect(await read(root, { reader: "validator", file: "app.ts", export: "Body" })).toEqual({ ok: true });
    expect(plan(calls[0])).toEqual({
      reader: "routes",
      root: path.resolve(root),
      file: path.resolve(root, "app.ts"),
      export: "app",
      framework: "hono",
      names_from: [path.resolve(root, "mw.ts")],
    });
    expect(plan(calls[1])).toEqual({
      reader: "validator",
      root: path.resolve(root),
      file: path.resolve(root, "app.ts"),
      export: "Body",
      names_from: [],
    });
  });

  test("refuse a module that does not load or read", async () => {
    const root = workspace({ "app.ts": "export const app = {};\n" });
    evaluator(
      { ok: false, failure: "no runtime", language: "js" },
      { ok: false, failure: "", language: "js" },
      answer({ ok: false, error: "app is not exported" }),
      answer({ ok: false }),
    );
    const spec = { reader: "routes", file: "app.ts", export: "app" };
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not load app.ts: no runtime" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not load app.ts" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not read app.ts: app is not exported" });
    expect(await read(root, spec)).toEqual({ ok: false, reason: "Kibi could not read app.ts: unknown error" });
  });

  test("read a schema of another format without code", async () => {
    const root = workspace();
    const calls = evaluator();
    expect(await read(root, { reader: "schema", format: "prisma", file: "schema.prisma" })).toEqual({
      ok: false,
      reason: "format prisma is read without code",
    });
    expect(calls).toHaveLength(0);
  });
});

/** A provider that lists `uses(name)` in Go, Rust and C# files, recording each request. */
function useProvider(problems: string[] = [], requests: unknown[] = []): void {
  const extractor: ReferenceExtractorV1 = {
    id: "test.references",
    supports: ({ path: file }) => /\.(?:go|rs|cs)$/.test(file),
    extract: (request) => {
      requests.push(request);
      return {
        contractVersion: "kibi.reference-extractor.v1",
        status: "ok",
        language: "go",
        members: [...request.content.matchAll(/uses\((\w+)\)/g)].map((match) => match[1] as string),
        unresolved: [],
      };
    },
  };
  spy(proofReferenceExtractorLoader, "load", (async () => ({ extractors: [extractor], problems })) as never);
}

describe("plugin references", () => {
  test("name the unread files, at most three, with the loader's problems", async () => {
    const root = workspace({ "a.java": "", "b.java": "", "c.java": "", "d.java": "" });
    useProvider(["p1 failed", "p2 failed"]);
    expect(await read(root, { reader: "references", files: "*.java", extract: "imports" })).toEqual({
      ok: false,
      reason:
        "the references reader reads Java files through kibi-plugin-treesitter, which is not active for proofs here (p1 failed; p2 failed); add it to devDependencies and activate kibi.reference-extractor.v1 in package.json#kibi.plugins (kibi doctor lists what this project needs): a.java, b.java, c.java and 1 more",
    });
  });

  test("name every language and up to three files without problems", async () => {
    const root = workspace({ "a.java": "", "b.php": "", "c.java": "" });
    useProvider();
    expect(await read(root, { reader: "references", files: "*", extract: "imports" })).toEqual({
      ok: false,
      reason:
        "the references reader reads Java, PHP files through kibi-plugin-treesitter, which is not active for proofs here; add it to devDependencies and activate kibi.reference-extractor.v1 in package.json#kibi.plugins (kibi doctor lists what this project needs): a.java, b.php, c.java",
    });
  });

  test("hand the callee and the key to the provider", async () => {
    const root = workspace({ "main.go": "uses(a)\n" });
    const requests: unknown[] = [];
    useProvider([], requests);
    for (const spec of [
      { extract: "string_args", callee: "run" },
      { extract: "property", key: "acl" },
      { extract: "calls" },
    ])
      expect(await read(root, { reader: "references", files: "main.go", ...spec })).toEqual({ ok: true, members: ["a"] });
    const base = { path: "main.go", content: "uses(a)\n", timeoutMs: 10_000 };
    expect(requests).toStrictEqual([
      { ...base, extract: "string_args", callee: "run" },
      { ...base, extract: "property", key: "acl" },
      { ...base, extract: "calls" },
    ]);
  });

  test("refuse a file the provider fails on", async () => {
    const root = workspace({ "main.go": "uses(a)\n" });
    const fail = (thrown: unknown) => {
      for (const restore of restores.splice(0)) restore();
      spy(proofReferenceExtractorLoader, "load", (async () => ({
        extractors: [
          {
            id: "test.failing",
            supports: () => true,
            extract: () => {
              throw thrown;
            },
          },
        ],
        problems: [],
      })) as never);
    };
    fail(new Error("parser crashed"));
    expect(await read(root, { reader: "references", files: "main.go", extract: "calls" })).toEqual({
      ok: false,
      reason: "Kibi could not read main.go: parser crashed",
    });
    fail("timed out");
    expect(await read(root, { reader: "references", files: "main.go", extract: "calls" })).toEqual({
      ok: false,
      reason: "Kibi could not read main.go: timed out",
    });
  });

  test("add the project's C# usings to C# imports only", async () => {
    const root = repository({ "G.cs": "global using Foo.Bar;\n", "main.go": "uses(a)\n", "a.cs.go": "uses(b)\n" });
    useProvider();
    const imports = (files: unknown, extract = "imports") => read(root, { reader: "references", files, extract });
    expect(await imports("main.go")).toEqual({ ok: true, members: ["a"] });
    expect(await imports("a.cs.go")).toEqual({ ok: true, members: ["b"] });
    expect(await imports(["G.cs", "main.go"])).toEqual({ ok: true, members: ["a", "Foo.Bar"] });
    expect(await imports(["G.cs", "main.go"], "calls")).toEqual({ ok: true, members: ["a"] });
  });
});

describe("C# project usings", () => {
  test("list global usings, <Using> items and implicit usings, sorted", () => {
    const root = repository({
      "B.cs": [
        "global using Zeta;",
        "global using Space.Before ;",
        "  global using Lead.Space;",
        "global  using Two.Spaces;",
        "global using  After.Using;",
        "global using static  Static.Spaced;",
        "global using Ab = Aliased.Name;",
        "global using Cd =  Spaced.Alias;",
        "global using Ef=Tight.Alias;",
        "global using Gh = global::Rooted.Name;",
        "global using X.global::Inner;",
        "global using global::;",
        "// global using Commented.Out;",
        "x global using Mid.Line;",
      ].join("\n"),
      "App.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><ImplicitUsings> enable </ImplicitUsings><Using  Include="Serilog" /></Project>',
      "Lib.props": '<Project><Using Include="Alpha" /></Project>',
    });
    expect(csharpProjectUsings(root)).toEqual([
      "After.Using",
      "Aliased.Name",
      "Alpha",
      "Lead.Space",
      "Microsoft.AspNetCore.Builder",
      "Microsoft.AspNetCore.Hosting",
      "Microsoft.AspNetCore.Http",
      "Microsoft.AspNetCore.Routing",
      "Microsoft.Extensions.Configuration",
      "Microsoft.Extensions.DependencyInjection",
      "Microsoft.Extensions.Hosting",
      "Microsoft.Extensions.Logging",
      "Rooted.Name",
      "Serilog",
      "Space.Before",
      "Spaced.Alias",
      "Static.Spaced",
      "System",
      "System.Collections.Generic",
      "System.IO",
      "System.Linq",
      "System.Net.Http",
      "System.Net.Http.Json",
      "System.Threading",
      "System.Threading.Tasks",
      "Tight.Alias",
      "Two.Spaces",
      "X.global::Inner",
      "Zeta",
    ]);
  });

  test("add only the console SDK's implicit usings without the web SDK", () => {
    const root = repository({ "App.csproj": "<Project><ImplicitUsings>true </ImplicitUsings></Project>" });
    expect(csharpProjectUsings(root)).toEqual([
      "System",
      "System.Collections.Generic",
      "System.IO",
      "System.Linq",
      "System.Net.Http",
      "System.Threading",
      "System.Threading.Tasks",
    ]);
  });

  test("read a long listing of tracked files", () => {
    const files: Record<string, string> = {};
    for (let index = 0; index < 6; index++)
      files[`src/a-rather-long-folder-name/Usings${index}.cs`] = `global using Name${index};\n`;
    expect(csharpProjectUsings(repository(files))).toEqual(["Name0", "Name1", "Name2", "Name3", "Name4", "Name5"]);
  });

  test("list nothing outside a repository", () => {
    expect(csharpProjectUsings(workspace({ "G.cs": "global using Foo;\n" }))).toEqual([]);
  });
});
