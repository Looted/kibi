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
 * and Python files, from the terms of SWI-Prolog files, and from the syntax
 * trees of Go, Java, C#, Rust, PHP, C, Bash and Terraform files through a qualified
 * kibi.reference-extractor.v1 plugin), the prolog
 * reader (fact arguments of a Prolog file), and the readers that load a module (drizzle schemas,
 * Hono and Express route tables, zod and pydantic validators).
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { builtinModules, createRequire } from "node:module";
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
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";
import {
  REFERENCE_PLUGIN_PACKAGE,
  proofReferenceExtractorLoader,
} from "../../plugins/proof-reference-extractors.js";
import {
  codeLanguage,
  PLUGIN_REFERENCE_LANGUAGE_NAMES,
  pluginReferenceLanguage,
  unsupportedLanguageReason,
} from "./code-languages.js";
import { createShadowRowFilter } from "./java-package-shadow.js";
import { runCodeEvaluator, TS_RESOLVE_HOOKS } from "./code-runner.js";
import { PROLOG_SOURCE_READER } from "./prolog-source-reader.js";

type TypeScriptApi = typeof import("typescript");
type Node = import("typescript").Node;

const NODE_BUILTINS = new Set(builtinModules.filter((name) => !name.startsWith("_")));


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
  // The expression under parentheses, `!`, `as T`, `<T>x`, `satisfies T`,
  // `await` and the comma operator: none of them changes what is read, so
  // `(import.meta as X).env` is import.meta.env and `(0, process).env` is
  // process.env.
  const unwrapped = (node: Node): Node => {
    if (
      ts.isNonNullExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isAwaitExpression(node)
    )
      return unwrapped(node.expression);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.CommaToken)
      return unwrapped(node.right);
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
  // The node an expression stands in, above its casts and parentheses.
  const outer = (node: Node): Node => {
    let current = node;
    while (current.parent !== undefined && unwrapped(current.parent) !== current.parent) current = current.parent;
    return current;
  };
  const extract = spec.extract;
  const callee = typeof spec.callee === "string" ? spec.callee : "";
  const key = typeof spec.key === "string" ? spec.key : "";
  const ENV_OBJECTS = new Set(["process.env", "import.meta.env", "Bun.env"]);
  // A Node built-in under its `node:` name is the same module.
  const moduleName = (specifier: string): string =>
    specifier.startsWith("node:") && NODE_BUILTINS.has(specifier.slice(5)) ? specifier.slice(5) : specifier;
  const spellings = (specifier: string): string[] => [...new Set([specifier, moduleName(specifier)])];

  // What each local name stands for: `import { execSync as run } from
  // "child_process"` makes run child_process.execSync, `const { env } =
  // process` makes env process.env, `const g = globalThis` makes g
  // globalThis. Names are file-wide; a shadowing local is read as the import,
  // which can list more than the code does but never less.
  const names = new Map<string, string>();
  // Local names bound to a module itself (import * as cp, const cp = require(...)).
  const moduleNames = new Set<string>();
  // The declarations those names come from.
  const bindingDeclarations = new Set<Node>();
  const GLOBAL_OBJECTS = new Set(["globalThis", "global", "window", "self"]);
  const canonical = (written: string): string => {
    let current = written;
    for (let depth = 0; depth < 8; depth++) {
      const dot = current.indexOf(".");
      const head = dot < 0 ? current : current.slice(0, dot);
      const bound = names.get(head);
      if (bound === undefined || bound === head) break;
      current = bound + (dot < 0 ? "" : current.slice(dot));
    }
    // globalThis.process is process.
    const parts = current.split(".");
    while (parts.length > 1 && GLOBAL_OBJECTS.has(parts[0] ?? "") && !names.has(parts[0] ?? "")) parts.shift();
    return parts.join(".");
  };
  const LOADERS = new Set(["require", "module.require", "process.getBuiltinModule"]);
  const REQUIRE_FACTORIES = new Set(["createRequire", "module.createRequire"]);
  // A call that loads a module: require("m"), import("m"),
  // process.getBuiltinModule("m"), createRequire(url)("m"). Undefined when the
  // call loads nothing; `{ specifier: null }` when the module is not a literal.
  const loaded = (node: Node): { specifier: string | null } | undefined => {
    const call = unwrapped(node);
    if (!ts.isCallExpression(call)) return undefined;
    const target = unwrapped(call.expression);
    const isLoader =
      call.expression.kind === ts.SyntaxKind.ImportKeyword ||
      LOADERS.has(canonical(chain(target) ?? "")) ||
      (ts.isCallExpression(target) && REQUIRE_FACTORIES.has(canonical(chain(target.expression) ?? "")));
    if (!isLoader) return undefined;
    const value = literal(call.arguments[0]);
    return { specifier: value === null ? null : moduleName(value) };
  };
  const bindPattern = (pattern: import("typescript").BindingName, from: string): void => {
    if (ts.isIdentifier(pattern)) {
      names.set(pattern.text, from);
      return;
    }
    if (!ts.isObjectBindingPattern(pattern)) return;
    for (const element of pattern.elements) {
      if (element.dotDotDotToken) continue;
      const property = element.propertyName ?? element.name;
      if (ts.isIdentifier(property) || ts.isStringLiteral(property)) bindPattern(element.name, `${from}.${property.text}`);
    }
  };
  const collect = (node: Node): void => {
    if (ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly) {
      const from = literal(node.moduleSpecifier);
      if (from !== null) {
        const mod = moduleName(from);
        const clause = node.importClause;
        if (clause.name) {
          names.set(clause.name.text, mod);
          moduleNames.add(clause.name.text);
        }
        const bindings = clause.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) {
          names.set(bindings.name.text, mod);
          moduleNames.add(bindings.name.text);
        } else if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            if (element.isTypeOnly) continue;
            const imported = (element.propertyName ?? element.name).text;
            names.set(element.name.text, imported === "default" ? mod : `${mod}.${imported}`);
            if (imported === "default") moduleNames.add(element.name.text);
          }
        }
      }
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const from = literal(node.moduleReference.expression);
      if (from !== null) {
        names.set(node.name.text, moduleName(from));
        moduleNames.add(node.name.text);
      }
    } else if (ts.isVariableDeclaration(node) && node.initializer) {
      bindingDeclarations.add(node);
      const init = unwrapped(node.initializer);
      const module = loaded(init);
      if (module !== undefined) {
        if (module.specifier !== null) {
          bindPattern(node.name, module.specifier);
          if (ts.isIdentifier(node.name)) moduleNames.add(node.name.text);
        }
      } else if (ts.isCallExpression(init) && REQUIRE_FACTORIES.has(canonical(chain(init.expression) ?? ""))) {
        // const req = createRequire(import.meta.url): req loads modules.
        if (ts.isIdentifier(node.name)) names.set(node.name.text, "require");
      } else {
        const from = chain(init);
        if (from !== null) bindPattern(node.name, from);
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(source);
  // Bound names are read through what they stand for; a declaration's own
  // name is not a read.
  const declares = (node: Node): boolean => {
    const parent = node.parent;
    if (parent === undefined) return false;
    return (
      ((ts.isVariableDeclaration(parent) ||
        ts.isBindingElement(parent) ||
        ts.isParameter(parent) ||
        ts.isFunctionDeclaration(parent) ||
        ts.isClassDeclaration(parent) ||
        ts.isImportClause(parent) ||
        ts.isNamespaceImport(parent) ||
        ts.isImportSpecifier(parent) ||
        ts.isImportEqualsDeclaration(parent) ||
        ts.isExportSpecifier(parent) ||
        ts.isPropertyAssignment(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isLabeledStatement(parent)) &&
        (parent as { name?: Node }).name === node) ||
      (ts.isBindingElement(parent) && parent.propertyName === node) ||
      (ts.isImportSpecifier(parent) && parent.propertyName === node) ||
      (ts.isExportSpecifier(parent) && parent.propertyName === node) ||
      (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
      (ts.isQualifiedName(parent) && parent.right === node)
    );
  };
  const inType = (node: Node): boolean => {
    for (let current: Node | undefined = node.parent; current !== undefined; current = current.parent) {
      if (ts.isTypeNode(current) || ts.isTypeQueryNode(current) || ts.isHeritageClause(current)) return true;
      if (ts.isStatement(current) || ts.isSourceFile(current)) return false;
    }
    return false;
  };
  // Whether a global name (process, globalThis) is a parameter or local of
  // an enclosing function or block there.
  const shadowed = (node: Node, name: string): boolean => {
    const binds = (binding: import("typescript").BindingName): boolean =>
      ts.isIdentifier(binding)
        ? binding.text === name
        : binding.elements.some((element) => !ts.isOmittedExpression(element) && binds(element.name));
    for (let current: Node | undefined = node.parent; current !== undefined; current = current.parent) {
      if (ts.isFunctionLike(current) && current.parameters.some((parameter) => binds(parameter.name))) return true;
      if (ts.isBlock(current) || ts.isSourceFile(current)) {
        for (const statement of current.statements) {
          if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((d) => !bindingDeclarations.has(d) && binds(d.name)))
            return true;
          if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name)
            return true;
        }
      }
    }
    return false;
  };
  // Whether an expression is a whole chain (not the head of a longer one).
  const maximal = (node: Node): boolean => {
    const top = outer(node);
    const parent = top.parent;
    return !(
      parent !== undefined &&
      (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
      parent.expression === top
    );
  };
  const calledAs = (node: Node): boolean => {
    const top = outer(node);
    const parent = top.parent;
    return (
      parent !== undefined && (ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === top
    );
  };
  // The initializer of a declaration whose names are followed above.
  const followed = (node: Node): boolean => {
    const top = outer(node);
    const parent = top.parent;
    return parent !== undefined && ts.isVariableDeclaration(parent) && parent.initializer === top;
  };
  // Code built from text runs anything.
  const DYNAMIC_CODE = new Set(["eval", "Function", "vm.runInThisContext", "vm.runInNewContext", "vm.runInContext", "vm.compileFunction", "vm.Script", "vm.SourceTextModule"]);
  const catchNames: string[] = [];
  const visit = (node: Node): void => {
    if (ts.isCatchClause(node) && node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
      catchNames.push(node.variableDeclaration.name.text);
      ts.forEachChild(node, visit);
      catchNames.pop();
      return;
    }
    const reads = extract === "env" || extract === "calls" || extract === "imports";
    if (reads && (ts.isCallExpression(node) || ts.isNewExpression(node))) {
      const name = canonical(chain(node.expression) ?? "");
      if (DYNAMIC_CODE.has(name)) unresolved.push(at(node));
      const module = loaded(node);
      if (module !== undefined && extract !== "imports" && !followed(node)) {
        // A module loaded in place: what is read or called on it is not followed
        // unless it is a known module whose member is called directly.
        const top = outer(node);
        const parent = top.parent;
        const member =
          parent !== undefined && ts.isPropertyAccessExpression(parent) && parent.expression === top
            ? parent.name.text
            : null;
        const direct =
          extract === "calls" &&
          module.specifier !== null &&
          member !== null &&
          parent !== undefined &&
          calledAs(parent);
        if (direct) members.push(`${module.specifier}.${member}`);
        else if (module.specifier === null || (extract === "env" && module.specifier === "process"))
          unresolved.push(at(node));
        else if (extract === "calls" && NODE_BUILTINS.has(module.specifier))
          // A built-in module used in place: any of its members may be called.
          members.push(`${module.specifier}.*`);
      }
    }
    switch (extract) {
      case "env": {
        // `export { env } from "node:process"` hands the environment to the files that import it.
        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          moduleName(literal(node.moduleSpecifier) ?? "") === "process"
        ) {
          unresolved.push(at(node));
          return;
        }
        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
          const written = chain(node.expression);
          const name = written === null ? null : canonical(written);
          if (name !== null && ENV_OBJECTS.has(name)) {
            if (ts.isPropertyAccessExpression(node)) {
              if (!(name === "import.meta.env" && VITE_BUILTINS.has(node.name.text))) members.push(node.name.text);
            } else {
              const value = literal(node.argumentExpression);
              if (value === null) unresolved.push(at(node));
              else members.push(value);
            }
            return;
          }
        }
        if (ts.isCallExpression(node) && canonical(chain(node.expression) ?? "") === "Deno.env.get") {
          const value = literal(node.arguments[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
          return;
        }
        if (ts.isVariableDeclaration(node) && node.initializer && !ts.isIdentifier(node.name)) {
          const written = chain(unwrapped(node.initializer));
          const from = written === null ? (loaded(node.initializer)?.specifier ?? null) : canonical(written);
          if (from !== null && (ENV_OBJECTS.has(from) || from === "process" || GLOBAL_OBJECTS.has(from))) {
            readPattern(node.name, from);
            return;
          }
        }
        // The environment object, process or the global object handed on can
        // be read under any name.
        if (
          (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) || ts.isMetaProperty(node)) &&
          !declares(node) &&
          !inType(node) &&
          maximal(node) &&
          !followed(node)
        ) {
          const name = canonical(chain(node) ?? "");
          if (ts.isIdentifier(node) && shadowed(node, node.text)) break;
          const handedOn =
            ENV_OBJECTS.has(name) ||
            (name === "process" && !readsAProperty(node)) ||
            (GLOBAL_OBJECTS.has(name) && !readsAProperty(node));
          if (handedOn) {
            unresolved.push(at(node));
            return;
          }
        }
        // So can import.meta itself, when it is handed on instead of read.
        if (ts.isMetaProperty(node) && chain(node) === "import.meta" && !readsAProperty(node) && !followed(node)) {
          unresolved.push(at(node));
          return;
        }
        break;
      }
      case "imports": {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
          const value = literal(node.moduleSpecifier);
          if (value !== null) members.push(...spellings(value));
          break;
        }
        if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
          const value = literal(node.moduleReference.expression);
          if (value !== null) members.push(...spellings(value));
          break;
        }
        if (ts.isCallExpression(node)) {
          const module = loaded(node);
          if (module !== undefined) {
            const value = literal(node.arguments[0]);
            if (value === null) unresolved.push(at(node));
            else members.push(...spellings(value));
          }
          break;
        }
        // A loader handed on (const r = [require][0]) loads under a name Kibi does not follow.
        if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
          const name = canonical(chain(node) ?? "");
          if (
            (LOADERS.has(name) || REQUIRE_FACTORIES.has(name)) &&
            maximal(node) &&
            !calledAs(node) &&
            !declares(node) &&
            !inType(node) &&
            !followed(node)
          )
            unresolved.push(at(node));
        }
        break;
      }
      case "calls": {
        if (ts.isCallExpression(node)) {
          const target = node.expression;
          const written = chain(target);
          if (written !== null) {
            const listed = [written, canonical(written)];
            // f.call(...), f.apply(...) and f.bind(...)() call f.
            for (const name of [...listed]) {
              const bound = /^(.*)\.(?:call|apply|bind)$/.exec(name);
              if (bound?.[1]) listed.push(bound[1]);
            }
            members.push(...new Set(listed));
          } else if (ts.isElementAccessExpression(target)) unresolved.push(at(target));
        } else if (
          (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
          maximal(node) &&
          !calledAs(node) &&
          !declares(node) &&
          !inType(node)
        ) {
          const written = chain(node);
          const head = written?.split(".")[0];
          if (written !== null && head !== undefined && names.has(head) && !followed(node)) {
            const name = canonical(written);
            if (moduleNames.has(head) && written === head && NODE_BUILTINS.has(name)) {
              // A built-in module handed on: any of its members may be called.
              members.push(`${name}.*`);
            } else if (name.includes(".") || written !== name) {
              // An imported function used as a value is listed as called.
              members.push(...new Set([written, name]));
            }
          } else if (written !== null && head !== undefined && names.has(head) && followed(node)) {
            const name = canonical(written);
            if (name !== written && name.includes(".")) members.push(name);
          }
        }
        break;
      }
      case "string_args": {
        if (ts.isCallExpression(node)) {
          const written = chain(node.expression);
          const listed = written === null ? [] : [...new Set([written, canonical(written)])];
          if (listed.some((name) => name === callee || (!callee.includes(".") && name.endsWith(`.${callee}`)))) {
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
  // Destructuring from the environment, process or the global object:
  // `const { PORT } = process.env` reads PORT, `const { env: { HOST } } =
  // process` reads HOST; a rest element or a computed key could read any.
  const readPattern = (pattern: import("typescript").BindingName, from: string): void => {
    if (ts.isIdentifier(pattern)) return;
    if (!ts.isObjectBindingPattern(pattern)) {
      unresolved.push(at(pattern));
      return;
    }
    for (const element of pattern.elements) {
      const property = element.propertyName ?? element.name;
      if (element.dotDotDotToken || !(ts.isIdentifier(property) || ts.isStringLiteral(property))) {
        unresolved.push(at(element));
        continue;
      }
      const path = canonical(`${from}.${property.text}`);
      if (ENV_OBJECTS.has(from)) members.push(property.text);
      else if (ENV_OBJECTS.has(path) || path === "process" || GLOBAL_OBJECTS.has(path)) {
        if (!ts.isIdentifier(element.name)) readPattern(element.name, path);
      }
    }
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
# Bare getenv and environ are read as the environment even without an import.
ENV_GETTERS = {"os.getenv", "os.getenvb", "getenv"}
ENV_OBJECTS = {"os.environ", "os.environb", "environ", "posix.environ", "nt.environ"}
ENV_KEY_METHODS = {"get", "setdefault", "pop"}
ENV_TEMPLATES = {"os.path.expandvars", "posixpath.expandvars", "ntpath.expandvars"}
# Code run from text, or a module looked up at run time, can read or call anything.
IMPORTERS = {"__import__", "importlib.import_module", "import_module", "builtins.__import__"}
DYNAMIC = IMPORTERS | {"exec", "eval", "compile", "builtins.exec", "builtins.eval", "builtins.compile",
                       "pkgutil.resolve_name", "pkgutil.get_loader", "pkgutil.find_loader", "importlib.reload",
                       "importlib.__import__", "importlib.find_loader",
                       # Unpickling calls whatever the data names (os.system).
                       "pickle.loads", "pickle.load", "pickle.Unpickler", "_pickle.loads", "_pickle.load",
                       "_pickle.Unpickler", "marshal.loads", "marshal.load", "shelve.open", "dill.loads",
                       "dill.load", "cloudpickle.loads", "cloudpickle.load", "jsonpickle.decode", "yaml.unsafe_load",
                       "yaml.unsafe_load_all"}
DYNAMIC_PREFIXES = ("runpy.", "importlib.util.", "importlib.machinery.", "importlib._bootstrap", "zipimport.")
def dynamic(name):
    return name is not None and (name in DYNAMIC or name.startswith(DYNAMIC_PREFIXES))
# A module's namespace read as a dictionary: any module, or any of its members, under any key.
NAMESPACES = {"globals", "locals", "builtins.globals", "builtins.locals"}
# Modules that read the environment, run programs or load code. One reached
# as an attribute of another module (shutil.os, path.os, from .main import os)
# is that module under a name Kibi does not follow, so it fails the read.
REACHED = {"os", "posix", "nt", "sys", "subprocess", "builtins", "importlib", "runpy", "pkgutil", "shutil", "pty", "socket", "ctypes"}
ENV_ATTRS = {"environ", "environb", "getenv", "getenvb"}
ENV_MODULES = {"os", "posix", "nt"}
# The modules a claim names: their own private members (os._exit) are read as written.
NAMED_MODULES = {"os", "posix", "nt", "sys", "subprocess"}
# Foreign function interfaces: a library they load (libc's getenv or system)
# runs native code Kibi cannot read.
FFI_MODULES = {"ctypes", "_ctypes", "cffi", "_cffi_backend"}
def private(name):
    return name.startswith("_") and not (name.startswith("__") and name.endswith("__"))
def hidden(parts, i):
    # A private name of a module: tempfile._os and threading._os are os, and
    # what another standard module keeps under a private name is not known here.
    part = parts[i]
    if not private(part):
        return False
    return part.lstrip("_") in REACHED or (parts[0] in STDLIB and ".".join(parts[:i]) not in NAMED_MODULES)
NAMESPACE_ATTRS = {"__dict__", "__getattribute__", "__getattr__", "__loader__", "__spec__", "__builtins__", "__import__", "__globals__"}
STDLIB = getattr(sys, "stdlib_module_names", frozenset())
def _system_names():
    import os as _os, subprocess as _subprocess
    found = set()
    for module in (_os, _subprocess, sys):
        for name in dir(module):
            value = getattr(module, name, None)
            if not name.startswith("_") and callable(value) and not (isinstance(value, type) and issubclass(value, BaseException)):
                found.add(name)
    return found | ENV_ATTRS
# What a name a project module re-exports may stand for when it is os,
# subprocess or sys, or one of their functions.
SYSTEM_NAMES = _system_names()
# os re-exports posix (nt on Windows): posix.system is os.system, so a name
# through posix or nt is listed as the os name too.
def as_os(name):
    head, dot, rest = name.partition(".")
    return "os" + dot + rest if head in ("posix", "nt") else None
def with_os(names):
    return list(dict.fromkeys(list(names) + [n for n in map(as_os, names) if n is not None]))
# Whether a standard-library dotted name is a module object (os.path,
# importlib.resources, shutil.fnmatch), found by importing the standard
# module it starts with. None when that is not known: a name outside the
# standard library, or one whose module does not import here.
MODULE_CACHE = {}
# Standard modules that act when imported (print, open a browser): not imported here.
NOISY = {"this", "antigravity", "__hello__", "__phello__", "idlelib", "turtledemo"}
def is_module(dotted):
    parts = dotted.split(".")
    if not parts[0] or parts[0] not in STDLIB:
        return None
    if len(parts) == 1:
        return True
    if parts[0] in NOISY:
        return None
    if dotted not in MODULE_CACHE:
        import contextlib, importlib, io, types
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                value = importlib.import_module(parts[0])
                for i in range(1, len(parts)):
                    if hasattr(value, parts[i]):
                        value = getattr(value, parts[i])
                    elif isinstance(value, types.ModuleType) and hasattr(value, "__path__"):
                        try:
                            value = importlib.import_module(".".join(parts[:i + 1]))
                        except ModuleNotFoundError:
                            value = None
                            break
                    else:
                        value = None
                        break
            MODULE_CACHE[dotted] = isinstance(value, types.ModuleType)
        except Exception:
            # A module that does not import here (winreg on Linux) is not known,
            # as a project module is not.
            MODULE_CACHE[dotted] = None
    return MODULE_CACHE[dotted]
def prefixes(dots, dotted):
    parts = dotted.split(".") if dotted else []
    return [dots + ".".join(parts[:i]) for i in range(1, len(parts) + 1)] or [dots]
def joined(base, name):
    return base + name if base.endswith(".") else base + "." + name
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
    parent = {}
    # What each name the file imports stands for: import subprocess as sp makes
    # sp stand for subprocess, from os import getenv as g makes g os.getenv.
    names, modules = {}, set()
    # Names bound by an import from a module outside the standard library
    # (a project or third-party module): what they are is not known here.
    foreign, imported_as = set(), {}
    for node in ast.walk(tree):
        for child in ast.iter_child_nodes(node):
            parent[child] = node
        if isinstance(node, ast.ExceptHandler) and node.name:
            caught.add(node.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                local = alias.asname or alias.name.split(".")[0]
                names[local] = alias.name if alias.asname else local
                modules.add(local)
                if alias.name.split(".")[0] not in STDLIB:
                    foreign.add(local)
        elif isinstance(node, ast.ImportFrom):
            base = "." * node.level + (node.module or "")
            outside = node.level > 0 or (node.module or "").split(".")[0] not in STDLIB
            for alias in node.names:
                if alias.name != "*":
                    local = alias.asname or alias.name
                    names[local] = joined(base, alias.name)
                    imported_as[local] = alias.name
                    if outside:
                        foreign.add(local)
    def canonical(name):
        head, dot, rest = name.partition(".")
        return names[head] + dot + rest if head in names else name
    def spelled(node):
        name = chain(node)
        return None if name is None else (name, canonical(name))
    def called(node):
        up = parent.get(node)
        return isinstance(up, ast.Call) and up.func is node
    def maximal(node):
        up = parent.get(node)
        return not (isinstance(up, ast.Attribute) and up.value is node)
    def reaches(node):
        # A chain through an imported name that reaches a module Kibi does not
        # follow under that spelling, or a module's namespace.
        written = chain(node)
        if written is None:
            return False
        head = written.split(".")[0]
        parts = canonical(written).split(".")
        if head == "__builtins__" or "__globals__" in parts or "__builtins__" in parts:
            return True
        if head not in names:
            return False
        for i in range(1, len(parts)):
            part = parts[i]
            if hidden(parts, i):
                return True
            if part in REACHED and not (part == "subprocess" and parts[:i] == ["asyncio"]):
                return True
            if part in NAMESPACE_ATTRS:
                return True
            if extract == "env" and part in ENV_ATTRS and ".".join(parts[:i]) not in ENV_MODULES:
                return True
        if extract == "calls" and head in foreign:
            # A project module's name may be os, subprocess or sys, or one of
            # their functions, re-exported: from .main import os as o; o.system().
            after = written.split(".")[1:]
            if head in imported_as:
                after = [imported_as[head]] + after
            return any(part in SYSTEM_NAMES for part in after)
        return False
    def flows(node):
        # An imported module used as a value (assigned, passed, returned or put
        # in a container), not as the head of a chain or a call. A name from a
        # project or third-party module may be a module too, so assigning one
        # to another name fails the read as well.
        if not isinstance(node.ctx, ast.Load) or not maximal(node) or called(node):
            return False
        written = chain(node)
        if written is None or written.split(".")[0] not in names:
            return False
        if isinstance(node, ast.Name) and node.id in modules:
            return True
        known = is_module(canonical(written))
        if known is not None:
            return known
        up = parent.get(node)
        return isinstance(up, (ast.Assign, ast.AnnAssign, ast.NamedExpr, ast.AugAssign)) and up.value is node
    def ffi(node):
        written = chain(node)
        return written is not None and written.split(".")[0] in names and canonical(written).split(".")[0] in FFI_MODULES
    def hides(node):
        # from tempfile import _os: a module under a private name of another one.
        if not isinstance(node, ast.ImportFrom):
            return False
        base = "." * node.level + (node.module or "")
        parts = base.split(".") if node.level == 0 else [base]
        return any(alias.name != "*" and hidden(parts + [alias.name], len(parts)) for alias in node.names)
    def env_use(node, name):
        up = parent.get(node)
        if name in ENV_GETTERS:
            if called(node):
                value = literal(up.args[0]) if up.args else None
                return members.append(value) if value is not None else miss(node)
            return miss(node)
        if isinstance(up, ast.Subscript) and up.value is node:
            value = literal(up.slice)
            return members.append(value) if value is not None else miss(node)
        if isinstance(up, ast.Attribute) and up.attr in ENV_KEY_METHODS and called(up):
            call = parent[up]
            value = literal(call.args[0]) if call.args else None
            return members.append(value) if value is not None else miss(node)
        if (isinstance(up, ast.Compare) and len(up.ops) == 1 and isinstance(up.ops[0], (ast.In, ast.NotIn))
                and up.comparators[0] is node and literal(up.left) is not None):
            return members.append(literal(up.left))
        # The whole environment handed on, copied, iterated or assigned.
        miss(node)
    for node in ast.walk(tree):
        if extract in ("env", "calls", "imports") and isinstance(node, ast.Call):
            target = spelled(node.func)
            name = None if target is None else target[1]
            if dynamic(name) and not (extract == "imports" and name in IMPORTERS):
                miss(node)
                continue
            if name in NAMESPACES or (name in ("vars", "builtins.vars") and (
                    not node.args or (chain(node.args[0]) or "").split(".")[0] in names)):
                # globals()['os'], vars(), vars(module): a namespace read by key,
                # which holds modules (vars(tempfile)["_os"] is os).
                miss(node)
                continue
            if name in ("getattr", "builtins.getattr") and node.args:
                inner = chain(node.args[0])
                if inner is not None and inner.split(".")[0] in names:
                    # A member of an imported module looked up by name.
                    miss(node)
                    continue
        if extract in ("env", "calls", "imports") and isinstance(node, ast.Attribute) and canonical(chain(node) or "") == "sys.modules":
            miss(node)
            continue
        if extract in ("env", "calls", "imports") and hides(node):
            miss(node)
            continue
        if (extract in ("env", "calls") and isinstance(node, ast.ImportFrom) and node.level == 0
                and (node.module or "").split(".")[0] in FFI_MODULES and any(alias.name == "*" for alias in node.names)):
            miss(node)
            continue
        if extract in ("env", "calls") and isinstance(node, (ast.Name, ast.Attribute)) and maximal(node) and ffi(node):
            # ctypes.CDLL(None).getenv(b"X"): a foreign call can read or run anything.
            miss(node)
            continue
        if extract in ("env", "calls", "imports") and isinstance(node, (ast.Name, ast.Attribute)) and maximal(node) and reaches(node):
            miss(node)
            continue
        if extract in ("env", "calls", "imports") and isinstance(node, (ast.Name, ast.Attribute)) and flows(node):
            # _t = tempfile; _t._os: a module handed on is used under a name Kibi does not follow.
            miss(node)
            continue
        if extract == "env":
            if isinstance(node, ast.ImportFrom) and node.module == "os" and any(alias.name == "*" for alias in node.names):
                miss(node)
            elif isinstance(node, (ast.Name, ast.Attribute)):
                target = spelled(node)
                if target is None:
                    continue
                name = target[1]
                if name in ENV_GETTERS or name in ENV_OBJECTS:
                    env_use(node, name)
                elif name in ENV_TEMPLATES:
                    miss(node)
                elif isinstance(node, ast.Name) and (name in ENV_MODULES or node.id in modules) and maximal(node):
                    # An imported module itself handed on: its later reads could use any name.
                    miss(node)
        elif extract == "imports":
            if isinstance(node, ast.Import):
                for alias in node.names:
                    members.extend(with_os(prefixes("", alias.name)))
            elif isinstance(node, ast.ImportFrom):
                if any(alias.name in REACHED for alias in node.names) and not (node.level == 0 and node.module == "asyncio"):
                    # from .main import os: a module reached through another one,
                    # under a spelling a claim about the module would not match.
                    miss(node)
                dots = "." * node.level
                members.extend(with_os(prefixes(dots, node.module or "")))
                base = dots + (node.module or "")
                members.extend(with_os([joined(base, alias.name) for alias in node.names if alias.name != "*"]))
            elif isinstance(node, ast.Call) and canonical(chain(node.func) or "") in IMPORTERS:
                value = literal(node.args[0]) if node.args else None
                (members.append(value) if value is not None else miss(node))
        elif extract == "calls":
            if isinstance(node, ast.ImportFrom) and any(alias.name == "*" for alias in node.names):
                # A star import could bring any name into scope under a bare spelling.
                miss(node)
            elif isinstance(node, ast.Call):
                target = spelled(node.func)
                if target is not None:
                    # A call through an alias is listed under what it names, too.
                    members.extend(with_os(target))
                elif isinstance(node.func, ast.Subscript):
                    miss(node)
            elif isinstance(node, (ast.Name, ast.Attribute)) and isinstance(node.ctx, ast.Load) and maximal(node) and not called(node):
                target = spelled(node)
                if target is not None and target[0].split(".")[0] in names:
                    if isinstance(node, ast.Name) and node.id in modules:
                        # An imported module handed on: its later calls could use any name.
                        miss(node)
                    else:
                        # An imported function used as a value is listed as called.
                        members.extend(with_os(target))
        elif extract == "string_args":
            if isinstance(node, ast.Call):
                target = spelled(node.func)
                target = None if target is None else with_os(target)
                if target is not None and any(name == callee or ("." not in callee and name.endswith("." + callee)) for name in target):
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
unique = list({(row["file"], row["line"], row["text"]): row for row in unresolved}.values())
print(json.dumps({"ok": True, "members": members, "unresolved": unique}))
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
  const other = files.filter((file) => {
    const language = codeLanguage(file);
    return language !== "js" && language !== "python" && language !== "prolog";
  });
  const unknown = other.filter((file) => pluginReferenceLanguage(file) === null);
  if (unknown.length > 0)
    return {
      ok: false,
      reason: `${unsupportedLanguageReason("the references reader", ["js", "python", "prolog"], unknown).replace(/ files, not /, ` files (and ${PLUGIN_REFERENCE_LANGUAGE_NAMES} through ${REFERENCE_PLUGIN_PACKAGE}), not `)}; Kibi cannot decide a references claim for those files, so the claim stays unproved (do not drop them from files: a claim about them would then be checked on other code)`,
    };
  const members: string[] = [];
  const unresolved: UnresolvedReference[] = [];
  if (other.length > 0) {
    const read = await readPluginReferences(workspaceRoot, other, spec);
    if (!read.ok) return read;
    members.push(...read.members);
    unresolved.push(...read.unresolved);
  }
  const scripts = files.filter((file) => codeLanguage(file) === "js");
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
  const python = files.filter((file) => codeLanguage(file) === "python");
  if (python.length > 0) {
    const run = runCodeEvaluator(
      workspaceRoot,
      python[0] as string,
      { python: PYTHON_REFERENCES },
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
  const prolog = files.filter((file) => codeLanguage(file) === "prolog");
  if (prolog.length > 0) {
    if (spec.extract === "property")
      return {
        ok: false,
        reason: `SWI-Prolog has no property values to extract (${prolog[0]}); read fact arguments with the prolog reader`,
      };
    const read = runPrologReader(workspaceRoot, prolog[0] as string, {
      mode: "references",
      extract: spec.extract,
      ...(typeof spec.callee === "string" ? { callee: spec.callee } : {}),
      files: prolog,
    });
    if (!read.ok) return read;
    members.push(...(read.value.members ?? []));
    unresolved.push(...(read.value.unresolved ?? []));
  }
  if (unresolved.length > 0)
    return { ok: false, reason: unresolvedReason(EXTRACT_WHAT[String(spec.extract)] ?? "references", unresolved) };
  return { ok: true, members };
}

const PLUGIN_READ_TIMEOUT_MS = 10_000;

/**
 * Read references of the plugin's languages through a qualified
 * kibi.reference-extractor.v1 provider. Without one the read is refused with
 * what to install, never answered as empty.
 */
// implements REQ-kibi-tree-sitter-references
async function readPluginReferences(
  workspaceRoot: string,
  files: readonly string[],
  spec: SourceSpec,
): Promise<{ ok: true; members: string[]; unresolved: UnresolvedReference[] } | { ok: false; reason: string }> {
  const { extractors, problems } = await proofReferenceExtractorLoader.load(workspaceRoot);
  // Callers pass only files a reference reader covers (unknown ones are refused first).
  const languages = [...new Set(files.flatMap((file) => pluginReferenceLanguage(file) ?? []))];
  const unread = files.filter((file) => !extractors.some((extractor) => extractor.supports({ path: file })));
  if (unread.length > 0) {
    const shown = `${unread.slice(0, 3).join(", ")}${unread.length > 3 ? ` and ${unread.length - 3} more` : ""}`;
    const why = problems.length > 0 ? ` (${problems.join("; ")})` : "";
    return {
      ok: false,
      reason: `the references reader reads ${languages.join(", ")} files through ${REFERENCE_PLUGIN_PACKAGE}, which is not active for proofs here${why}; add it to devDependencies and activate kibi.reference-extractor.v1 in package.json#kibi.plugins (kibi doctor lists what this project needs): ${shown}`,
    };
  }
  const members: string[] = [];
  const unresolved: UnresolvedReference[] = [];
  const shadowRows = createShadowRowFilter(workspaceRoot);
  for (const file of files) {
    const extractor = extractors.find((candidate) => candidate.supports({ path: file }));
    if (extractor === undefined) continue;
    let result;
    try {
      result = validateReferenceExtractionResult(
        await extractor.extract({
          path: file,
          content: readFileSync(path.join(workspaceRoot, file), "utf8"),
          extract: spec.extract as import("kibi-plugin-sdk").ReferenceExtract,
          ...(typeof spec.callee === "string" ? { callee: spec.callee } : {}),
          ...(typeof spec.key === "string" ? { key: spec.key } : {}),
          timeoutMs: PLUGIN_READ_TIMEOUT_MS,
        }),
      );
    } catch (error) {
      return {
        ok: false,
        reason: `Kibi could not read ${file}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    if (result.status !== "ok") return { ok: false, reason: `Kibi could not read ${file}: ${result.message}` };
    members.push(...result.members);
    // A row about a name another file may bind stays only if one does.
    for (const row of shadowRows(file, result.unresolved)) unresolved.push({ file, line: row.line, text: row.text });
  }
  // Terraform merges `override.tf` and `*_override.tf` files of a folder
  // into the blocks of its other files, so their values replace what a file
  // read shows, whether or not the read includes them: Kibi does not merge.
  // OpenTofu also reads `.tofu` files, which replace a `.tf` file of the same
  // name and may hold overrides of their own.
  for (const file of files.filter((candidate) => /\.tf$/i.test(candidate))) {
    const folder = path.posix.dirname(file);
    let names: string[];
    try {
      names = readdirSync(path.join(workspaceRoot, folder));
    } catch {
      names = [];
    }
    for (const name of names) {
      const override = folder === "." ? name : `${folder}/${name}`;
      if (/(?:^|_)override\.tf(?:\.json)?$/i.test(name))
        unresolved.push({ file, line: 1, text: `${override} may override values of this folder's blocks` });
      else if (/\.tofu(?:\.json)?$/i.test(name))
        unresolved.push({ file, line: 1, text: `${override} may replace or override this folder's .tf files under OpenTofu` });
    }
  }
  // A C# file also imports what the project's global and implicit usings
  // bring in, which no single file shows.
  if (spec.extract === "imports" && files.some((file) => /\.cs$/i.test(file)))
    members.push(...csharpProjectUsings(workspaceRoot));
  return { ok: true, members, unresolved };
}

/** The namespaces `<ImplicitUsings>enable</ImplicitUsings>` adds, by SDK. */
const CSHARP_IMPLICIT_USINGS = [
  "System",
  "System.Collections.Generic",
  "System.IO",
  "System.Linq",
  "System.Net.Http",
  "System.Threading",
  "System.Threading.Tasks",
];
const CSHARP_WEB_IMPLICIT_USINGS = [
  "System.Net.Http.Json",
  "Microsoft.AspNetCore.Builder",
  "Microsoft.AspNetCore.Hosting",
  "Microsoft.AspNetCore.Http",
  "Microsoft.AspNetCore.Routing",
  "Microsoft.Extensions.Configuration",
  "Microsoft.Extensions.DependencyInjection",
  "Microsoft.Extensions.Hosting",
  "Microsoft.Extensions.Logging",
];

/**
 * Namespaces every C# file of the project imports: `global using`
 * directives in any tracked .cs file, `<Using Include>` items and the SDK's
 * implicit usings in any tracked .csproj.
 */
// implements REQ-kibi-tree-sitter-references
export function csharpProjectUsings(workspaceRoot: string): string[] {
  let tracked: string[];
  try {
    tracked = execFileSync("git", ["ls-files", "-z", "--", "*.cs", "*.csproj", "*.props"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\0")
      .filter((file) => file.length > 0);
  } catch {
    tracked = [];
  }
  const usings = new Set<string>();
  for (const file of tracked) {
    let text: string;
    try {
      text = readFileSync(path.join(workspaceRoot, file), "utf8");
    } catch {
      continue;
    }
    if (/\.cs$/i.test(file)) {
      for (const match of text.matchAll(/^\s*global\s+using\s+(?:static\s+)?(?:(\w+)\s*=\s*)?([\w.:]+)\s*;/gm))
        usings.add((match[2] ?? "").replace(/^global::/, ""));
      continue;
    }
    for (const match of text.matchAll(/<Using\s+Include="([^"]+)"/g)) usings.add(match[1] ?? "");
    if (/<ImplicitUsings>\s*(?:enable|true)\s*<\/ImplicitUsings>/i.test(text)) {
      for (const name of CSHARP_IMPLICIT_USINGS) usings.add(name);
      if (/Sdk="Microsoft\.NET\.Sdk\.Web"/.test(text)) for (const name of CSHARP_WEB_IMPLICIT_USINGS) usings.add(name);
    }
  }
  usings.delete("");
  return [...usings].sort();
}

type PrologRead = {
  ok: boolean;
  members?: string[];
  sequence?: string[];
  unresolved?: UnresolvedReference[];
  error?: string;
};

/** Run the SWI-Prolog source reader, which reads terms without running them. */
// implements REQ-kibi-prolog-source-readers
function runPrologReader(
  workspaceRoot: string,
  file: string,
  plan: Readonly<Record<string, unknown>>,
): { ok: true; value: PrologRead } | { ok: false; reason: string } {
  const run = runCodeEvaluator(
    workspaceRoot,
    file,
    { prolog: PROLOG_SOURCE_READER },
    [JSON.stringify(plan)],
    (parsed) => parsed !== null && typeof parsed === "object" && "ok" in (parsed as object),
  );
  if (!run.ok)
    return { ok: false, reason: `Kibi could not run SWI-Prolog to read ${file}${run.failure ? `: ${run.failure}` : ""}` };
  const value = run.value as PrologRead;
  if (!value.ok) return { ok: false, reason: value.error ?? `Kibi could not read ${file}` };
  return { ok: true, value };
}

/** The prolog reader: one argument of every fact with a functor, in file order. */
// implements REQ-kibi-prolog-source-readers
function readPrologTerms(workspaceRoot: string, spec: SourceSpec): SourceCodeEvaluation {
  const file = String(spec.file);
  const read = runPrologReader(workspaceRoot, file, {
    mode: "terms",
    file,
    functor: spec.functor,
    ...(spec.arg !== undefined ? { arg: spec.arg } : {}),
  });
  if (!read.ok) return read;
  return { ok: true, members: read.value.members ?? [], sequence: read.value.sequence ?? [] };
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
  if (spec.reader === "prolog") return readPrologTerms(workspaceRoot, spec);
  if (spec.reader === "schema" && spec.format !== "drizzle")
    return { ok: false, reason: `format ${String(spec.format)} is read without code` };
  return evaluateModule(workspaceRoot, spec);
};
