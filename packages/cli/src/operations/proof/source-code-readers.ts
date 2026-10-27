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

/**
 * The readers of `source` specs that need code: the references reader
 * (environment variables, imports, calls, string arguments, thrown errors
 * and property values, read from the syntax tree of TypeScript, JavaScript
 * and Python files), and the readers that load a module (drizzle schemas,
 * Hono and Express route tables, zod and pydantic validators).
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  matchWorkspaceFiles,
  type SourceCodeEvaluation,
  type SourceCodeEvaluator,
  type SourceEntity,
  type SourceRoute,
  type SourceSpec,
  type UnresolvedReference,
  unresolvedReason,
} from "../../public/proof-sources.js";
import { runCodeEvaluator, TS_RESOLVE_HOOKS } from "./code-runner.js";

type TypeScriptApi = typeof import("typescript");
type Node = import("typescript").Node;

const JS_FILE = /\.(?:[cm]?[jt]sx?)$/i;
const PY_FILE = /\.py$/i;

function globList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * TypeScript's parser: the workspace's install first, then Kibi's own, then
 * the copy ts-morph bundles (Kibi's built-in source analysis depends on it),
 * so a JavaScript project needs no TypeScript install of its own.
 */
function loadTypeScript(workspaceRoot: string): TypeScriptApi | null {
  const attempts: (() => unknown)[] = [
    () => createRequire(path.join(workspaceRoot, "package.json"))("typescript"),
    () => createRequire(import.meta.url)("typescript"),
    () => (createRequire(import.meta.url)("ts-morph") as { ts?: unknown }).ts,
    () => {
      const builtin = createRequire(import.meta.url).resolve("kibi-plugin-builtin");
      return (createRequire(builtin)("ts-morph") as { ts?: unknown }).ts;
    },
  ];
  for (const attempt of attempts) {
    try {
      const ts = attempt() as Partial<TypeScriptApi> | undefined;
      if (typeof ts?.createSourceFile === "function") return ts as TypeScriptApi;
    } catch {
      // try the next install
    }
  }
  return null;
}

// Variables Vite defines on import.meta.env itself.
const VITE_BUILTINS = new Set(["MODE", "BASE_URL", "PROD", "DEV", "SSR"]);

type Extracted = { members: string[]; unresolved: UnresolvedReference[] };

/** References one TypeScript or JavaScript file makes. */
export function extractScriptReferences(
  ts: TypeScriptApi,
  file: string,
  text: string,
  spec: SourceSpec,
): Extracted {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const members: string[] = [];
  const unresolved: UnresolvedReference[] = [];
  const at = (node: Node) => ({
    file,
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    text: node.getText(source).replace(/\s+/g, " ").slice(0, 80),
  });
  const literal = (node: Node | undefined): string | null =>
    node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      ? node.text
      : null;
  // The expression under parentheses, `!`, `as T`, `<T>x` and `satisfies T`:
  // a cast does not change what is read, so `(import.meta as X).env` is
  // import.meta.env.
  const unwrapped = (node: Node): Node => {
    if (
      ts.isNonNullExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node)
    )
      return unwrapped(node.expression);
    return node;
  };
  // a.b.c for identifier and property chains, a["b"] for literal element access
  const chain = (node: Node): string | null => {
    if (ts.isIdentifier(node)) return node.text;
    if (node.kind === ts.SyntaxKind.ThisKeyword) return "this";
    if (ts.isPropertyAccessExpression(node)) {
      const left = chain(node.expression);
      return left === null ? null : `${left}.${node.name.text}`;
    }
    if (ts.isElementAccessExpression(node)) {
      const key = literal(node.argumentExpression);
      const left = chain(node.expression);
      return left === null || key === null ? null : `${left}.${key}`;
    }
    if (ts.isMetaProperty(node)) return `${ts.tokenToString(node.keywordToken)}.${node.name.text}`;
    const inner = unwrapped(node);
    return inner === node ? null : chain(inner);
  };
  // Whether the expression, under any casts, is the object of a property read.
  const readsAProperty = (node: Node): boolean => {
    let current = node;
    let parent = node.parent;
    while (parent !== undefined && unwrapped(parent) !== parent) {
      current = parent;
      parent = parent.parent;
    }
    return (
      parent !== undefined &&
      (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
      parent.expression === current
    );
  };
  const extract = spec.extract;
  const callee = typeof spec.callee === "string" ? spec.callee : "";
  const key = typeof spec.key === "string" ? spec.key : "";
  const ENV_OBJECTS = new Set(["process.env", "import.meta.env", "Bun.env"]);
  const catchNames: string[] = [];
  const visit = (node: Node): void => {
    if (ts.isCatchClause(node) && node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
      catchNames.push(node.variableDeclaration.name.text);
      ts.forEachChild(node, visit);
      catchNames.pop();
      return;
    }
    switch (extract) {
      case "env": {
        const name = ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) ? chain(node.expression) : null;
        if (name !== null && ENV_OBJECTS.has(name)) {
          if (ts.isPropertyAccessExpression(node)) {
            if (!(name === "import.meta.env" && VITE_BUILTINS.has(node.name.text))) members.push(node.name.text);
          } else {
            const value = literal((node as import("typescript").ElementAccessExpression).argumentExpression);
            if (value === null) unresolved.push(at(node));
            else members.push(value);
          }
          return;
        }
        if (ts.isCallExpression(node) && chain(node.expression) === "Deno.env.get") {
          const value = literal(node.arguments[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
          return;
        }
        if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectBindingPattern(node.name)) {
          const from = chain(node.initializer);
          if (from !== null && ENV_OBJECTS.has(from)) {
            for (const element of node.name.elements) {
              const property = element.propertyName ?? element.name;
              if (element.dotDotDotToken || !(ts.isIdentifier(property) || ts.isStringLiteral(property)))
                unresolved.push(at(element));
              else members.push(property.text);
            }
            return;
          }
        }
        // The whole environment object handed elsewhere can be read under any name.
        if ((ts.isPropertyAccessExpression(node) || ts.isMetaProperty(node)) && ENV_OBJECTS.has(chain(node) ?? "")) {
          unresolved.push(at(node));
          return;
        }
        // So can import.meta itself, when it is handed on instead of read.
        if (ts.isMetaProperty(node) && chain(node) === "import.meta" && !readsAProperty(node)) {
          unresolved.push(at(node));
          return;
        }
        break;
      }
      case "imports": {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
          const value = literal(node.moduleSpecifier);
          if (value !== null) members.push(value);
          break;
        }
        if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
          const value = literal(node.moduleReference.expression);
          if (value !== null) members.push(value);
          break;
        }
        if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === "require"))
        ) {
          const value = literal(node.arguments[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
        }
        break;
      }
      case "calls": {
        if (ts.isCallExpression(node)) {
          const target = node.expression;
          const name = chain(target);
          if (name !== null) members.push(name);
          else if (ts.isElementAccessExpression(target)) unresolved.push(at(target));
        }
        break;
      }
      case "string_args": {
        if (ts.isCallExpression(node)) {
          const name = chain(node.expression);
          if (name !== null && (name === callee || (!callee.includes(".") && name.endsWith(`.${callee}`)))) {
            const value = literal(node.arguments[0]);
            if (value === null) unresolved.push(at(node));
            else members.push(value);
          }
        }
        break;
      }
      case "thrown": {
        if (ts.isThrowStatement(node) && node.expression) {
          const thrown = unwrapped(node.expression);
          // throw new ForbiddenError(...) names the class; throw
          // createForbiddenError(...) names the factory.
          const name =
            ts.isNewExpression(thrown) || ts.isCallExpression(thrown) ? chain(thrown.expression) : null;
          if (name !== null) members.push(name);
          else if (!(ts.isIdentifier(thrown) && catchNames.includes(thrown.text))) unresolved.push(at(node));
        }
        break;
      }
      case "property": {
        if (ts.isPropertyAssignment(node)) {
          const name = node.name;
          if ((ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === key) {
            const value = literal(node.initializer);
            if (value === null) unresolved.push(at(node));
            else members.push(value);
          }
        } else if (ts.isShorthandPropertyAssignment(node) && node.name.text === key) unresolved.push(at(node));
        break;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { members, unresolved };
}

const PYTHON_REFERENCES = `
import ast, json, sys
plan = json.loads(sys.argv[-1])
extract, callee, key = plan["extract"], plan.get("callee") or "", plan.get("key") or ""
members, unresolved = [], []
def chain(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        left = chain(node.value)
        return None if left is None else left + "." + node.attr
    return None
def literal(node):
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None
ENV_GETTERS = {"os.getenv", "getenv", "os.environ.get", "environ.get"}
ENV_OBJECTS = {"os.environ", "environ"}
for file in plan["files"]:
    with open(file, encoding="utf-8") as handle:
        text = handle.read()
    try:
        tree = ast.parse(text, filename=file)
    except SyntaxError as error:
        print(json.dumps({"ok": False, "error": file + ": " + str(error)}))
        sys.exit(0)
    lines = text.splitlines()
    def miss(node):
        line = getattr(node, "lineno", 1)
        unresolved.append({"file": file, "line": line, "text": (lines[line - 1].strip() if line - 1 < len(lines) else "")[:80]})
    caught = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler) and node.name:
            caught.add(node.name)
    for node in ast.walk(tree):
        if extract == "env":
            if isinstance(node, ast.Call) and chain(node.func) in ENV_GETTERS:
                value = literal(node.args[0]) if node.args else None
                (members.append(value) if value is not None else miss(node))
            elif isinstance(node, ast.Subscript) and chain(node.value) in ENV_OBJECTS:
                value = literal(node.slice)
                (members.append(value) if value is not None else miss(node))
        elif extract == "imports":
            if isinstance(node, ast.Import):
                members.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                members.append("." * node.level + (node.module or ""))
            elif isinstance(node, ast.Call) and chain(node.func) in {"importlib.import_module", "import_module", "__import__"}:
                value = literal(node.args[0]) if node.args else None
                (members.append(value) if value is not None else miss(node))
        elif extract == "calls":
            if isinstance(node, ast.Call):
                name = chain(node.func)
                if name is not None:
                    members.append(name)
                elif isinstance(node.func, ast.Subscript):
                    miss(node)
        elif extract == "string_args":
            if isinstance(node, ast.Call):
                name = chain(node.func)
                if name is not None and (name == callee or ("." not in callee and name.endswith("." + callee))):
                    value = literal(node.args[0]) if node.args else None
                    (members.append(value) if value is not None else miss(node))
        elif extract == "thrown":
            if isinstance(node, ast.Raise) and node.exc is not None:
                target = node.exc.func if isinstance(node.exc, ast.Call) else node.exc
                name = chain(target)
                if name is not None and not (isinstance(node.exc, ast.Name) and name in caught):
                    members.append(name)
                elif name is None:
                    miss(node)
        elif extract == "property":
            if isinstance(node, ast.Dict):
                for k, v in zip(node.keys, node.values):
                    if k is not None and literal(k) == key:
                        value = literal(v)
                        (members.append(value) if value is not None else miss(v))
            elif isinstance(node, ast.Call):
                for keyword in node.keywords:
                    if keyword.arg == key:
                        value = literal(keyword.value)
                        (members.append(value) if value is not None else miss(keyword.value))
print(json.dumps({"ok": True, "members": members, "unresolved": unresolved}))
`;

const EXTRACT_WHAT: Readonly<Record<string, string>> = {
  env: "environment variable reads",
  imports: "imports",
  calls: "calls",
  string_args: "first arguments",
  thrown: "throw statements",
  property: "property values",
};

async function readReferences(workspaceRoot: string, spec: SourceSpec): Promise<SourceCodeEvaluation> {
  const files = matchWorkspaceFiles(workspaceRoot, globList(spec.files), globList(spec.ignore));
  if (files.length === 0)
    return { ok: false, reason: `no file matches ${globList(spec.files).join(", ")}` };
  const other = files.filter((file) => !JS_FILE.test(file) && !PY_FILE.test(file));
  if (other.length > 0)
    return {
      ok: false,
      reason: `the references reader reads TypeScript, JavaScript and Python files; narrow files to exclude ${other.slice(0, 3).join(", ")}`,
    };
  const members: string[] = [];
  const unresolved: UnresolvedReference[] = [];
  const scripts = files.filter((file) => JS_FILE.test(file));
  if (scripts.length > 0) {
    const ts = loadTypeScript(workspaceRoot);
    if (ts === null)
      return {
        ok: false,
        reason: "Kibi reads TypeScript and JavaScript references with the TypeScript parser; install typescript in the workspace",
      };
    for (const file of scripts) {
      const found = extractScriptReferences(ts, file, readFileSync(path.join(workspaceRoot, file), "utf8"), spec);
      members.push(...found.members);
      unresolved.push(...found.unresolved);
    }
  }
  const python = files.filter((file) => PY_FILE.test(file));
  if (python.length > 0) {
    const run = runCodeEvaluator(
      workspaceRoot,
      python[0] as string,
      { js: "", python: PYTHON_REFERENCES },
      [JSON.stringify({ extract: spec.extract, callee: spec.callee, key: spec.key, files: python })],
      (parsed) => parsed !== null && typeof parsed === "object" && "ok" in (parsed as object),
    );
    if (!run.ok)
      return { ok: false, reason: `Kibi could not run Python to read ${python[0]}${run.failure ? `: ${run.failure}` : ""}` };
    const value = run.value as { ok: boolean; members?: string[]; unresolved?: UnresolvedReference[]; error?: string };
    if (!value.ok) return { ok: false, reason: `Kibi could not parse ${value.error ?? "a Python file"}` };
    members.push(...(value.members ?? []));
    unresolved.push(...(value.unresolved ?? []));
  }
  if (unresolved.length > 0)
    return { ok: false, reason: unresolvedReason(EXTRACT_WHAT[String(spec.extract)] ?? "references", unresolved) };
  return { ok: true, members };
}

// Built on first use so TS_RESOLVE_HOOKS is initialized.
const jsModuleEvaluator = () => `
const plan = JSON.parse(process.argv.at(-1));
const { pathToFileURL } = await import("node:url");
const { createRequire } = await import("node:module");
if (typeof globalThis.Bun === "undefined") {
  const { register } = await import("node:module");
  register?.("data:text/javascript," + encodeURIComponent(${JSON.stringify(TS_RESOLVE_HOOKS)}));
}
const message = (error) => (error instanceof Error ? error.message : String(error));
const requireFrom = createRequire(plan.file);
// Express keeps no mount path on a router layer, so record it as routers are mounted.
const mounts = new WeakMap();
if (plan.reader === "routes") {
  try {
    const express = requireFrom("express");
    let proto = Object.getPrototypeOf(express.Router());
    while (proto && !Object.prototype.hasOwnProperty.call(proto, "use")) proto = Object.getPrototypeOf(proto);
    const use = proto.use;
    proto.use = function (...args) {
      const before = this.stack.length;
      const result = use.apply(this, args);
      const mount = typeof args[0] === "function" || Array.isArray(args[0]) && typeof args[0][0] === "function" ? "/" : args[0];
      for (const layer of this.stack.slice(before)) mounts.set(layer, mount);
      return result;
    };
  } catch {}
}
async function exportsOf(file) {
  return await import(pathToFileURL(file).href);
}
// Middleware by identity, and middleware a factory export makes: a factory
// such as requireAuth() returns a fresh closure per route, so its result is
// known by its source text and labelled with the factory name. A text two
// factories share names neither.
async function names() {
  const byValue = new Map();
  const byText = new Map();
  for (const file of plan.names_from ?? []) {
    const mod = await exportsOf(file);
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value !== "function") continue;
      if (!byValue.has(value)) byValue.set(value, name);
      // Only plain zero-argument functions: never a class, an async function
      // or a generator, whose call could do work.
      if (value.length !== 0 || value.constructor?.name !== "Function" || /^class\b/.test(Function.prototype.toString.call(value))) continue;
      let made;
      try {
        made = value();
      } catch {
        continue;
      }
      if (made && typeof made.then === "function") {
        made.then(() => {}, () => {});
        continue;
      }
      if (typeof made !== "function") continue;
      const text = Function.prototype.toString.call(made);
      byText.set(text, byText.has(text) && byText.get(text) !== name ? null : name);
    }
  }
  return {
    get(handler) {
      if (byValue.has(handler)) return byValue.get(handler);
      if (typeof handler !== "function") return undefined;
      return byText.get(Function.prototype.toString.call(handler)) ?? undefined;
    },
  };
}
const symbolNamed = (object, pattern) => Object.getOwnPropertySymbols(object).find((symbol) => pattern.test(String(symbol.description)));
async function drizzle(mod) {
  const isTable = Symbol.for("drizzle:IsDrizzleTable");
  const entities = [];
  const chosen = plan.exports ?? Object.keys(mod);
  for (const name of chosen) {
    const table = mod[name];
    if (table === undefined) throw new Error(name + " is not exported from " + plan.file);
    if (table === null || typeof table !== "object" || table[isTable] !== true) {
      if (plan.exports) throw new Error(name + " is not a drizzle table");
      continue;
    }
    const tableName = table[Symbol.for("drizzle:Name")];
    const columns = Object.values(table[Symbol.for("drizzle:Columns")] ?? {}).map((column) => ({
      name: column.name,
      nullable: column.notNull !== true,
      optional: false,
    }));
    const foreign_keys = [];
    const inline = symbolNamed(table, /^drizzle:(SQLite|Pg|MySql|SingleStore|Gel)InlineForeignKeys$/);
    const dialect = inline ? { SQLite: "sqlite", Pg: "pg", MySql: "mysql", SingleStore: "singlestore", Gel: "gel" }[String(inline.description).match(/^drizzle:(\\w+?)InlineForeignKeys$/)[1]] : null;
    if (dialect === null) throw new Error("Kibi does not know the dialect of drizzle table " + tableName);
    let core;
    try {
      core = await import(pathToFileURL(requireFrom.resolve("drizzle-orm/" + dialect + "-core")).href);
    } catch (error) {
      throw new Error("Kibi could not load drizzle-orm/" + dialect + "-core next to " + plan.file + ": " + message(error));
    }
    const config = core.getTableConfig(table);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      const target = ref.foreignTable[Symbol.for("drizzle:Name")];
      foreign_keys.push(tableName + "." + ref.columns.map((c) => c.name).join(",") + "->" + target + "." + ref.foreignColumns.map((c) => c.name).join(",") + (fk.onDelete ? " on delete " + String(fk.onDelete).toLowerCase() : ""));
    }
    for (const column of config.columns ?? []) {
      const row = columns.find((c) => c.name === column.name);
      if (row && column.notNull === true) row.nullable = false;
    }
    entities.push({ name: tableName, columns, foreign_keys });
  }
  if (entities.length === 0) throw new Error(plan.file + " exports no drizzle table");
  return { entities };
}
function honoRoutes(app, named) {
  const label = (handler) => named.get(handler) ?? (handler.name || "(anonymous)");
  const pattern = (text) => {
    if (text === "*" || text === "/*") return /^.*$/;
    const body = text.replace(/\\/\\*$/, "").replace(/[.+^$()|[\\]\\\\{}]/g, "\\\\$&").replace(/\\*/g, ".*").replace(/\\/:[^/]+/g, "/[^/]+");
    return new RegExp("^" + body + (text.endsWith("/*") ? "(?:/.*)?" : "") + "$");
  };
  const entries = app.routes;
  const routes = [];
  const seen = new Set();
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index];
    if (entry.method === "ALL") continue;
    const id = entry.method + " " + entry.path;
    if (seen.has(id)) continue;
    seen.add(id);
    const middleware = [];
    for (let before = 0; before < index; before++) {
      const other = entries[before];
      if ((other.method === "ALL" || other.method === entry.method) && pattern(other.path).test(entry.path)) middleware.push(label(other.handler));
    }
    routes.push({ method: entry.method.toUpperCase(), path: entry.path, middleware });
  }
  return routes;
}
function expressRoutes(app, named) {
  const label = (layer) => named.get(layer.handle) ?? (layer.name && layer.name !== "<anonymous>" ? layer.name : "(anonymous)");
  const stackOf = (handle) => (handle?._router ?? handle?.router ?? handle)?.stack;
  const mountOf = (layer) => {
    if (mounts.has(layer)) {
      const mount = mounts.get(layer);
      if (typeof mount !== "string") throw new Error("a router is mounted on a pattern Kibi cannot read: " + String(mount));
      return mount;
    }
    const source = layer.regexp?.source;
    if (layer.regexp?.fast_slash) return "/";
    const match = source && source.match(/^\\^((?:\\\\\\/[\\w.~-]+)*)\\\\\\/\\?\\(\\?=\\\\\\/\\|\\$\\)$/);
    if (!match) throw new Error("Kibi cannot read where a router is mounted" + (source ? " (" + source + ")" : ""));
    return match[1].replace(/\\\\\\//g, "/") || "/";
  };
  const join = (mount, sub) => (mount === "/" ? sub : sub === "/" ? mount : mount.replace(/\\/$/, "") + sub);
  const collect = (stack) => {
    const out = [];
    const earlier = [];
    for (const layer of stack) {
      if (layer.name === "query" || layer.name === "expressInit") continue;
      if (layer.route) {
        if (typeof layer.route.path !== "string") throw new Error("a route path is not a string: " + String(layer.route.path));
        const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
        if (methods.includes("_all")) { earlier.push(layer); continue; }
        const own = layer.route.stack.slice(0, -1).map(label);
        for (const method of methods)
          out.push({ method: method.toUpperCase(), path: layer.route.path, middleware: [...earlier.filter((e) => e.match(layer.route.path)).map(label), ...own] });
        continue;
      }
      const nested = stackOf(layer.handle);
      if (Array.isArray(nested)) {
        const mount = mountOf(layer);
        for (const route of collect(nested)) {
          const full = join(mount, route.path);
          out.push({ method: route.method, path: full, middleware: [...earlier.filter((e) => e.match(full)).map(label), ...route.middleware] });
        }
        continue;
      }
      earlier.push(layer);
    }
    return out;
  };
  const stack = stackOf(app);
  if (!Array.isArray(stack)) throw new Error("the express app has no router stack");
  return collect(stack);
}
async function routes(mod) {
  let app = mod[plan.export];
  if (app === undefined) throw new Error(plan.export + " is not exported from " + plan.file);
  const named = await names();
  const isExpress = (value) => typeof value === "function" && typeof value.use === "function" && typeof value.handle === "function";
  if (typeof app === "function" && !isExpress(app)) app = await app();
  const framework = plan.framework ?? (Array.isArray(app?.routes) ? "hono" : isExpress(app) || Array.isArray(app?.stack) ? "express" : null);
  if (framework === "hono") return { routes: honoRoutes(app, named) };
  if (framework === "express") return { routes: expressRoutes(app, named) };
  throw new Error(plan.export + " is neither a Hono nor an Express app; name the framework");
}
// The fields of an object schema: zod's shape (under refine, transform,
// pipe or effects), or valibot's entries (under pipe).
function shapeOf(schema) {
  let current = schema;
  for (let depth = 0; depth < 10 && current; depth++) {
    const shape = typeof current.shape === "function" ? current.shape() : current.shape;
    if (shape && typeof shape === "object") return shape;
    if (current.kind === "schema" && current.entries && typeof current.entries === "object") return current.entries;
    const def = current._def ?? current._zod?.def;
    current = def?.schema ?? def?.innerType ?? def?.in ?? (Array.isArray(current.pipe) && current.pipe[0] !== current ? current.pipe[0] : undefined);
  }
  return null;
}
// Whether a field accepts a value: zod's safeParse, or any Standard Schema
// (valibot, arktype, zod 3.24+).
async function accepts(field, value) {
  if (typeof field?.safeParse === "function") return field.safeParse(value).success === true;
  const standard = field?.["~standard"];
  if (standard && typeof standard.validate === "function") {
    const result = await standard.validate(value);
    return !result.issues;
  }
  return null;
}
async function validator(mod) {
  const schema = mod[plan.export];
  if (schema === undefined) throw new Error(plan.export + " is not exported from " + plan.file);
  const shape = shapeOf(schema);
  if (shape === null) throw new Error(plan.export + " is not an object schema whose fields Kibi can list (a zod or valibot object, or one wrapped in refine, transform or pipe)");
  const columns = [];
  for (const [name, field] of Object.entries(shape)) {
    const optional = await accepts(field, undefined);
    const nullable = await accepts(field, null);
    if (optional === null || nullable === null) throw new Error("field " + name + " of " + plan.export + " is neither a zod schema nor a Standard Schema");
    columns.push({ name, optional, nullable });
  }
  return { entities: [{ name: plan.export, columns, foreign_keys: [] }] };
}
try {
  const mod = await exportsOf(plan.file);
  const result = plan.reader === "routes" ? await routes(mod) : plan.reader === "validator" ? await validator(mod) : await drizzle(mod);
  console.log(JSON.stringify({ ok: true, ...result }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: message(error) }));
}
`;

const PYTHON_MODULE_EVALUATOR = `
import importlib.util, json, sys, types, typing
plan = json.loads(sys.argv[-1])
def load(file):
    spec = importlib.util.spec_from_file_location("kibi_source_module", file)
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, plan["root"])
    spec.loader.exec_module(module)
    return module
try:
    if plan["reader"] != "validator":
        raise ValueError("reader " + plan["reader"] + " reads TypeScript and JavaScript modules only")
    model = getattr(load(plan["file"]), plan["export"], None)
    if model is None:
        raise ValueError(plan["export"] + " is not defined in " + plan["file"])
    fields = getattr(model, "model_fields", None)
    if not isinstance(fields, dict):
        raise ValueError(plan["export"] + " is not a pydantic model (it has no model_fields)")
    columns = []
    for name, field in fields.items():
        annotation = field.annotation
        args = typing.get_args(annotation)
        nullable = annotation is type(None) or type(None) in args
        columns.append({"name": field.alias or name, "optional": not field.is_required(), "nullable": nullable})
    print(json.dumps({"ok": True, "entities": [{"name": plan["export"], "columns": columns, "foreign_keys": []}]}))
except Exception as error:
    print(json.dumps({"ok": False, "error": type(error).__name__ + ": " + str(error)}))
`;

function evaluateModule(workspaceRoot: string, spec: SourceSpec): SourceCodeEvaluation {
  const file = String(spec.file);
  const absolute = path.resolve(workspaceRoot, file);
  const plan = {
    reader: spec.reader,
    root: path.resolve(workspaceRoot),
    file: absolute,
    export: spec.export,
    exports: spec.exports,
    framework: spec.framework,
    names_from: globList(spec.names_from).map((name) => path.resolve(workspaceRoot, name)),
  };
  const run = runCodeEvaluator(
    workspaceRoot,
    file,
    { js: jsModuleEvaluator(), python: PYTHON_MODULE_EVALUATOR },
    [JSON.stringify(plan)],
    (parsed) => parsed !== null && typeof parsed === "object" && "ok" in (parsed as object),
  );
  if (!run.ok)
    return { ok: false, reason: `Kibi could not load ${file}${run.failure ? `: ${run.failure}` : ""}` };
  const value = run.value as {
    ok: boolean;
    error?: string;
    entities?: SourceEntity[];
    routes?: SourceRoute[];
  };
  if (!value.ok) return { ok: false, reason: `Kibi could not read ${file}: ${value.error ?? "unknown error"}` };
  return {
    ok: true,
    ...(value.entities ? { entities: value.entities } : {}),
    ...(value.routes ? { routes: value.routes } : {}),
  };
}

/** The CLI's evaluator for source readers that need code. */
// implements REQ-kibi-source-proof-kinds
export const evaluateSourceCode: SourceCodeEvaluator = async (workspaceRoot, spec) => {
  if (spec.reader === "references") return readReferences(workspaceRoot, spec);
  if (spec.reader === "schema" && spec.format !== "drizzle")
    return { ok: false, reason: `format ${String(spec.format)} is read without code` };
  return evaluateModule(workspaceRoot, spec);
};
