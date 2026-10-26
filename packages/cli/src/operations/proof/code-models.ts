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
 * The finite models behind the rule, state_machine and regex proof kinds,
 * read from the code by Kibi itself. A certificate from the test run records
 * what the test saw; at ingest Kibi imports the same exports, recomputes the
 * model, and accepts the certificate only when the two agree, so a test
 * cannot hand Kibi a table, a machine or a pattern the code does not have.
 */

import path from "node:path";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { ProofContract } from "../../public/proof-protocol.js";
import {
  type LanguageSpec,
  languageAccepts,
  languagesDisjoint,
  languagesEqual,
  UnsupportedPattern,
} from "./regular-language.js";
import {
  loadSymbol,
  runCodeEvaluator,
  TS_RESOLVE_HOOKS,
} from "./code-certificates.js";

/** The most predicate calls one rule certificate may need. */
export const MAX_TABLE_ROWS = 100_000;

type Reference = Readonly<{ symbol_id: string; export?: string }>;
export type Resolved = { file: string; export: string };

export type TableRow = Readonly<{
  args: readonly string[];
  value?: boolean;
  error?: string;
}>;

/** What Kibi read for a rule certificate: domains and predicate tables. */
export type RuleModel = Readonly<{
  domains: Readonly<Record<string, readonly string[]>>;
  predicates: Readonly<Record<string, readonly TableRow[]>>;
}>;

/** What Kibi read for a state_machine certificate. */
export type MachineModel = Readonly<{
  states: readonly string[];
  transitions: readonly (readonly [string, string])[];
  initial?: readonly string[];
}>;

/** What Kibi read for a regex certificate. */
export type PatternModel =
  | Readonly<{ type: "regexp"; source: string; flags: string; flavor: "js" | "python" }>
  | Readonly<{ type: "string"; value: string }>;

// Built on first use: code-certificates.ts imports this module, so its
// TS_RESOLVE_HOOKS is not initialized yet while this module loads.
const jsModelEvaluator = () => `
const plan = JSON.parse(process.argv.at(-1));
const { pathToFileURL } = await import("node:url");
if (typeof globalThis.Bun === "undefined") {
  const { register } = await import("node:module");
  register?.("data:text/javascript," + encodeURIComponent(${JSON.stringify(TS_RESOLVE_HOOKS)}));
}
const modules = new Map();
async function load(ref) {
  if (!modules.has(ref.file)) modules.set(ref.file, await import(pathToFileURL(ref.file).href));
  const value = modules.get(ref.file)[ref.export];
  if (value === undefined) throw new Error(ref.export + " is not exported from " + ref.file);
  return value;
}
function items(value, name) {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  if (value instanceof Map) return [...value.keys()];
  if (value !== null && typeof value === "object") return Object.keys(value);
  throw new Error(name + " is not an array, set, map or object");
}
const text = (value) => (typeof value === "string" ? value : String(value));
const message = (error) => (error instanceof Error ? error.message : String(error));
async function main() {
  if (plan.mode === "table") {
    const values = {};
    const domains = {};
    for (const [type, ref] of Object.entries(plan.domains)) {
      values[type] = items(await load(ref), ref.export);
      domains[type] = values[type].map(text);
    }
    const predicates = {};
    let total = 0;
    for (const [name, ref] of Object.entries(plan.predicates)) {
      const decide = await load(ref);
      if (typeof decide !== "function") throw new Error(ref.export + " is not a function");
      for (const type of ref.arg_types)
        if (!(type in values)) throw new Error("no domain for argument type " + type + " of " + name);
      const lists = ref.arg_types.map((type) => values[type]);
      const count = lists.reduce((product, list) => product * list.length, 1);
      total += count;
      if (total > plan.limit) throw new Error("the predicate tables need more than " + plan.limit + " calls");
      const rows = [];
      for (let index = 0; index < count; index++) {
        let rest = index;
        const tuple = [];
        for (let position = lists.length - 1; position >= 0; position--) {
          const list = lists[position];
          tuple[position] = list[rest % list.length];
          rest = Math.floor(rest / list.length);
        }
        const args = tuple.map(text);
        try {
          const value = await decide(...tuple);
          rows.push(typeof value === "boolean" ? { args, value } : { args, error: "returned " + typeof value + ", not a boolean" });
        } catch (error) {
          rows.push({ args, error: message(error) });
        }
      }
      predicates[name] = rows;
    }
    return { domains, predicates };
  }
  if (plan.mode === "machine") {
    const table = await load(plan.transitions);
    const edges = new Map();
    const states = new Set();
    const edge = (from, to) => {
      const pair = [text(from), text(to)];
      states.add(pair[0]);
      states.add(pair[1]);
      edges.set(pair.join("\\u0000"), pair);
    };
    const targets = (next) => {
      if (next === null || next === undefined || next === false) return [];
      if (Array.isArray(next)) return next;
      if (next instanceof Set) return [...next];
      if (next instanceof Map) return [...next.values()];
      if (typeof next === "object") return Object.values(next);
      return [next];
    };
    if (typeof table === "function") {
      const stateList = items(await load(plan.domains.state), plan.domains.state.export);
      const eventList = items(await load(plan.domains.event), plan.domains.event.export);
      for (const state of stateList) {
        states.add(text(state));
        for (const event of eventList) {
          let next;
          try {
            next = await table(state, event);
          } catch {
            continue;
          }
          for (const target of targets(next)) edge(state, target);
        }
      }
    } else if (Array.isArray(table)) {
      for (const entry of table) {
        if (Array.isArray(entry) && entry.length === 2) edge(entry[0], entry[1]);
        else if (entry !== null && typeof entry === "object" && "from" in entry && "to" in entry) edge(entry.from, entry.to);
        else throw new Error(plan.transitions.export + " lists an entry that is not a [from, to] pair or {from, to}");
      }
    } else if (table instanceof Map || (table !== null && typeof table === "object")) {
      const entries = table instanceof Map ? [...table.entries()] : Object.entries(table);
      for (const [from, next] of entries) {
        states.add(text(from));
        for (const target of targets(next)) edge(from, target);
      }
    } else throw new Error(plan.transitions.export + " is not a transition table or a next-state function");
    const out = { states: [...states].sort(), transitions: [...edges.values()].sort((a, b) => (a.join("\\u0000") < b.join("\\u0000") ? -1 : 1)) };
    if (plan.initial) {
      const initial = await load(plan.initial);
      out.initial = (typeof initial === "object" && initial !== null ? items(initial, plan.initial.export) : [initial]).map(text).sort();
    }
    return out;
  }
  if (plan.mode === "pattern") {
    const value = await load(plan.pattern);
    if (value instanceof RegExp) return { type: "regexp", source: value.source, flags: value.flags, flavor: "js" };
    if (typeof value === "string") return { type: "string", value };
    throw new Error(plan.pattern.export + " is not a RegExp or a string");
  }
  throw new Error("unknown plan mode " + plan.mode);
}
try {
  console.log(JSON.stringify({ ok: true, model: await main() }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: message(error) }));
}
`;

const PYTHON_MODEL_EVALUATOR = `
import enum, importlib, inspect, itertools, json, os, re, sys
plan = json.loads(sys.argv[-1])
modules = {}
def module_for(file):
    if file not in modules:
        directory, module_name = os.path.split(os.path.splitext(file)[0])
        parts = [] if module_name == "__init__" else [module_name]
        while os.path.exists(os.path.join(directory, "__init__.py")):
            directory, package = os.path.split(directory)
            parts.insert(0, package)
        if directory not in sys.path:
            sys.path.insert(0, directory)
        modules[file] = importlib.import_module(".".join(parts))
    return modules[file]
def load(ref):
    module = module_for(ref["file"])
    if not hasattr(module, ref["export"]):
        raise ValueError(ref["export"] + " is not defined in " + ref["file"])
    return getattr(module, ref["export"])
def text(item):
    if isinstance(item, enum.Enum):
        return text(item.value)
    if isinstance(item, bool):
        return "true" if item else "false"
    return str(item)
def items(value, name):
    if isinstance(value, type) and issubclass(value, enum.Enum):
        return list(value)
    if isinstance(value, dict):
        return list(value.keys())
    if isinstance(value, (list, tuple)):
        return list(value)
    if isinstance(value, (set, frozenset)):
        return sorted(value, key=text)
    raise ValueError(name + " is not a list, tuple, set, dict or Enum")
def targets(nxt):
    if nxt is None or nxt is False:
        return []
    if isinstance(nxt, dict):
        return list(nxt.values())
    if isinstance(nxt, (list, tuple, set, frozenset)):
        return list(nxt)
    return [nxt]
FLAG_LETTERS = [(re.IGNORECASE, "i"), (re.DOTALL, "s"), (re.ASCII, "a"), (re.MULTILINE, "m"), (re.VERBOSE, "x"), (re.LOCALE, "L")]
def main():
    mode = plan["mode"]
    if mode == "table":
        values, domains = {}, {}
        for kind, ref in plan["domains"].items():
            values[kind] = items(load(ref), ref["export"])
            domains[kind] = [text(v) for v in values[kind]]
        predicates, total = {}, 0
        for name, ref in plan["predicates"].items():
            decide = load(ref)
            if not callable(decide):
                raise ValueError(ref["export"] + " is not callable")
            for kind in ref["arg_types"]:
                if kind not in values:
                    raise ValueError("no domain for argument type " + kind + " of " + name)
            lists = [values[kind] for kind in ref["arg_types"]]
            count = 1
            for lst in lists:
                count *= len(lst)
            total += count
            if total > plan["limit"]:
                raise ValueError("the predicate tables need more than " + str(plan["limit"]) + " calls")
            rows = []
            for combo in itertools.product(*lists):
                args = [text(v) for v in combo]
                try:
                    result = decide(*combo)
                    if inspect.isawaitable(result):
                        import asyncio
                        result = asyncio.run(result)
                    if isinstance(result, bool):
                        rows.append({"args": args, "value": result})
                    else:
                        rows.append({"args": args, "error": "returned " + type(result).__name__ + ", not a bool"})
                except Exception as error:
                    rows.append({"args": args, "error": str(error) or type(error).__name__})
            predicates[name] = rows
        return {"domains": domains, "predicates": predicates}
    if mode == "machine":
        table = load(plan["transitions"])
        edges, states = {}, set()
        def edge(source, target):
            pair = [text(source), text(target)]
            states.update(pair)
            edges["\\0".join(pair)] = pair
        if callable(table) and not isinstance(table, type):
            state_list = items(load(plan["domains"]["state"]), plan["domains"]["state"]["export"])
            event_list = items(load(plan["domains"]["event"]), plan["domains"]["event"]["export"])
            for state in state_list:
                states.add(text(state))
                for event in event_list:
                    try:
                        nxt = table(state, event)
                    except Exception:
                        continue
                    for target in targets(nxt):
                        edge(state, target)
        elif isinstance(table, dict):
            for source, nxt in table.items():
                states.add(text(source))
                for target in targets(nxt):
                    edge(source, target)
        elif isinstance(table, (list, tuple, set, frozenset)):
            for entry in table:
                if isinstance(entry, (list, tuple)) and len(entry) == 2:
                    edge(entry[0], entry[1])
                else:
                    raise ValueError(plan["transitions"]["export"] + " lists an entry that is not a (from, to) pair")
        else:
            raise ValueError(plan["transitions"]["export"] + " is not a transition table or a next-state function")
        out = {"states": sorted(states), "transitions": [edges[key] for key in sorted(edges)]}
        if plan.get("initial"):
            initial = load(plan["initial"])
            listed = items(initial, plan["initial"]["export"]) if isinstance(initial, (list, tuple, set, frozenset, dict)) else [initial]
            out["initial"] = sorted(text(v) for v in listed)
        return out
    if mode == "pattern":
        value = load(plan["pattern"])
        if isinstance(value, re.Pattern):
            if isinstance(value.pattern, bytes):
                raise ValueError(plan["pattern"]["export"] + " is a bytes pattern")
            flags = "".join(letter for flag, letter in FLAG_LETTERS if value.flags & flag)
            return {"type": "regexp", "source": value.pattern, "flags": flags, "flavor": "python"}
        if isinstance(value, str):
            return {"type": "string", "value": value}
        raise ValueError(plan["pattern"]["export"] + " is not a compiled pattern or a str")
    raise ValueError("unknown plan mode " + mode)
try:
    print(json.dumps({"ok": True, "model": main()}))
except Exception as error:
    print(json.dumps({"ok": False, "error": str(error) or type(error).__name__}))
`;

async function resolveReference(
  context: OperationContext,
  reference: Reference,
  label: string,
): Promise<Resolved | string> {
  const symbol = await loadSymbol(context, reference.symbol_id);
  if (!symbol || symbol.sourceFile === "")
    return `the ${label} symbol ${reference.symbol_id} has no source file`;
  return {
    file: path.resolve(context.workspaceRoot, symbol.sourceFile),
    export: reference.export ?? symbol.title,
  };
}

/**
 * Run one evaluation plan (table, machine or pattern mode) against the code
 * files it names, in the language of those files.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export function evaluateCodeModel<T>(
  workspaceRoot: string,
  files: readonly Resolved[],
  plan: Record<string, unknown>,
): { ok: true; model: T } | { ok: false; reason: string } {
  const python = files.map((file) => /\.py$/i.test(file.file));
  if (python.some((value) => value !== python[0]))
    return {
      ok: false,
      reason: "the contract's sources mix Python and JavaScript files; one certificate reads one language",
    };
  const first = files[0];
  if (first === undefined) return { ok: false, reason: "the contract names no source" };
  const run = runCodeEvaluator(
    workspaceRoot,
    path.relative(workspaceRoot, first.file),
    { js: jsModelEvaluator(), python: PYTHON_MODEL_EVALUATOR },
    [JSON.stringify(plan)],
    (parsed) =>
      parsed !== null && typeof parsed === "object" && "ok" in (parsed as object),
  );
  if (!run.ok)
    return {
      ok: false,
      reason: `Kibi could not evaluate the code${run.failure ? `: ${run.failure}` : ""}`,
    };
  const value = run.value as { ok: boolean; model?: T; error?: string };
  return value.ok
    ? { ok: true, model: value.model as T }
    : { ok: false, reason: `Kibi could not evaluate the code: ${value.error ?? "unknown error"}` };
}

/**
 * Evaluate every predicate a rule contract names over every combination of
 * its argument domains, with the argument types the certificate declares.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export async function evaluateRuleModel(
  context: OperationContext,
  contract: ProofContract,
  argTypes: Readonly<Record<string, readonly string[]>>,
): Promise<{ ok: true; model: RuleModel } | { ok: false; reason: string }> {
  const domains: Record<string, Resolved> = {};
  const predicates: Record<string, Resolved & { arg_types: readonly string[] }> = {};
  for (const [type, reference] of Object.entries(contract.domains ?? {})) {
    const resolved = await resolveReference(context, reference, `domains.${type}`);
    if (typeof resolved === "string") return { ok: false, reason: resolved };
    domains[type] = resolved;
  }
  for (const [name, reference] of Object.entries(contract.predicate_source ?? {})) {
    const resolved = await resolveReference(context, reference, `predicate_source.${name}`);
    if (typeof resolved === "string") return { ok: false, reason: resolved };
    const types = argTypes[name];
    if (types === undefined)
      return { ok: false, reason: `the certificate has no table for the predicate ${name}` };
    predicates[name] = { ...resolved, arg_types: types };
  }
  return evaluateCodeModel<RuleModel>(
    context.workspaceRoot,
    [...Object.values(domains), ...Object.values(predicates)],
    { mode: "table", domains, predicates, limit: MAX_TABLE_ROWS },
  );
}

/** Read a state machine's states, transitions and initial states. */
// implements REQ-kibi-non-numeric-proof-kinds
export async function evaluateMachine(
  context: OperationContext,
  contract: ProofContract,
): Promise<{ ok: true; model: MachineModel } | { ok: false; reason: string }> {
  if (contract.domain_source === undefined)
    return { ok: false, reason: "the contract names no domain_source transition table" };
  const transitions = await resolveReference(context, contract.domain_source, "domain_source");
  if (typeof transitions === "string") return { ok: false, reason: transitions };
  const files: Resolved[] = [transitions];
  const plan: Record<string, unknown> = { mode: "machine", transitions };
  if (contract.initial_source !== undefined) {
    const initial = await resolveReference(context, contract.initial_source, "initial_source");
    if (typeof initial === "string") return { ok: false, reason: initial };
    plan.initial = initial;
    files.push(initial);
  }
  if (contract.domains !== undefined) {
    const domains: Record<string, Resolved> = {};
    for (const [type, reference] of Object.entries(contract.domains)) {
      const resolved = await resolveReference(context, reference, `domains.${type}`);
      if (typeof resolved === "string") return { ok: false, reason: resolved };
      domains[type] = resolved;
      files.push(resolved);
    }
    plan.domains = domains;
  }
  return evaluateCodeModel<MachineModel>(context.workspaceRoot, files, plan);
}

/** Read the pattern or string a regex contract's pattern_source exports. */
// implements REQ-kibi-non-numeric-proof-kinds
export async function evaluatePattern(
  context: OperationContext,
  contract: ProofContract,
): Promise<{ ok: true; model: PatternModel } | { ok: false; reason: string }> {
  if (contract.pattern_source === undefined)
    return { ok: false, reason: "the contract names no pattern_source" };
  const pattern = await resolveReference(context, contract.pattern_source, "pattern_source");
  if (typeof pattern === "string") return { ok: false, reason: pattern };
  return evaluateCodeModel<PatternModel>(context.workspaceRoot, [pattern], {
    mode: "pattern",
    pattern,
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function sameSorted(left: readonly string[], right: readonly string[]): boolean {
  const a = [...left].sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function sameKeys(
  certificate: Record<string, unknown> | null,
  contract: Readonly<Record<string, Reference>> | undefined,
  field: string,
): string | null {
  const certified = Object.keys(certificate ?? {}).sort();
  const declared = Object.keys(contract ?? {}).sort();
  if (!sameSorted(certified, declared))
    return `the certificate's ${field} (${certified.join(", ") || "none"}) are not the contract's (${declared.join(", ") || "none"})`;
  for (const key of declared) {
    const named = text(record(certificate?.[key])?.symbol_id);
    const expected = contract?.[key]?.symbol_id ?? "";
    if (named !== expected)
      return `the certificate's ${field}.${key} is ${named || "(none)"}, not the contract's ${expected}`;
  }
  return null;
}

const rowKey = (args: readonly string[]) => JSON.stringify(args);

/**
 * A rule certificate re-checks only when its domains and every predicate
 * table are what Kibi reads from the code: the same values, and the same
 * decision for every combination of arguments.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export async function ruleCertificateProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
): Promise<string | null> {
  const domains = record(certificate.domains);
  const predicates = record(certificate.predicates);
  const keys =
    sameKeys(domains, contract.domains, "domains") ??
    sameKeys(predicates, contract.predicate_source, "predicates");
  if (keys !== null) return keys;
  const argTypes: Record<string, string[]> = {};
  for (const [name, entry] of Object.entries(predicates ?? {}))
    argTypes[name] = strings(record(entry)?.arg_types);
  const evaluated = await evaluateRuleModel(context, contract, argTypes);
  if (!evaluated.ok) return evaluated.reason;
  for (const [type, members] of Object.entries(evaluated.model.domains)) {
    const certified = strings(record(domains?.[type])?.members);
    if (!sameSorted(certified, members))
      return `the certificate's domain ${type} is not the values Kibi read from the code (${members.slice(0, 8).join(", ")})`;
  }
  for (const [name, rows] of Object.entries(evaluated.model.predicates)) {
    const failed = rows.find((row) => row.error !== undefined);
    if (failed !== undefined)
      return `${name}(${failed.args.join(", ")}) failed when Kibi evaluated it: ${failed.error}`;
    const certified = new Map<string, unknown>();
    for (const row of Array.isArray(record(predicates?.[name])?.rows)
      ? (record(predicates?.[name])?.rows as unknown[])
      : []) {
      const entry = record(row);
      certified.set(rowKey(strings(entry?.args)), entry?.value);
    }
    if (certified.size !== rows.length)
      return `the certificate's table for ${name} has ${certified.size} rows, but the code's domains give ${rows.length}`;
    for (const row of rows) {
      const value = certified.get(rowKey(row.args));
      if (value !== row.value)
        return `the certificate says ${name}(${row.args.join(", ")}) is ${String(value)}, but the code decides ${String(row.value)}`;
    }
  }
  return null;
}

/** A state_machine certificate re-checks only when it is the code's machine. */
// implements REQ-kibi-non-numeric-proof-kinds
export async function machineCertificateProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
): Promise<string | null> {
  const machine = record(certificate.machine);
  const expected = contract.domain_source?.symbol_id ?? "";
  if (text(machine?.symbol_id) !== expected)
    return `the certificate's machine is ${text(machine?.symbol_id) || "(none)"}, not the contract's domain_source ${expected}`;
  const evaluated = await evaluateMachine(context, contract);
  if (!evaluated.ok) return evaluated.reason;
  const { model } = evaluated;
  if (!sameSorted(strings(machine?.states), model.states))
    return `the certificate's states are not the machine Kibi read from the code (${model.states.join(", ")})`;
  const edges = (rows: unknown) =>
    (Array.isArray(rows) ? rows : []).map((row) => strings(row).join("->"));
  if (!sameSorted(edges(machine?.transitions), edges(model.transitions)))
    return `the certificate's transitions are not the machine Kibi read from the code (${edges(model.transitions).slice(0, 8).join(", ")})`;
  if (!sameSorted(strings(machine?.initial), [...(model.initial ?? [])]))
    return `the certificate's initial states are not the ones Kibi read from the code (${(model.initial ?? []).join(", ") || "none"})`;
  return null;
}

/** A regex certificate re-checks only when it holds the code's own pattern. */
// implements REQ-kibi-non-numeric-proof-kinds
export async function patternCertificateProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
): Promise<string | null> {
  const pattern = record(certificate.pattern);
  const expected = contract.pattern_source?.symbol_id ?? "";
  if (text(pattern?.symbol_id) !== expected)
    return `the certificate's pattern is ${text(pattern?.symbol_id) || "(none)"}, not the contract's pattern_source ${expected}`;
  const evaluated = await evaluatePattern(context, contract);
  if (!evaluated.ok) return evaluated.reason;
  const model = evaluated.model;
  const same =
    model.type === "string"
      ? text(pattern?.type) === "string" && pattern?.value === model.value
      : text(pattern?.type) === "regexp" &&
        pattern?.source === model.source &&
        pattern?.flags === model.flags &&
        pattern?.flavor === model.flavor;
  if (!same)
    return model.type === "string"
      ? `the certificate's value is not the string Kibi read from the code (${JSON.stringify(model.value)})`
      : `the certificate's pattern is not the one Kibi read from the code (/${model.source}/${model.flags})`;
  return null;
}

/** The fact's pattern: a JavaScript pattern with the u flag, matched whole. */
export function factPattern(source: string): LanguageSpec {
  return { type: "pattern", source, flags: "u", flavor: "js", mode: "full" };
}

/**
 * Whether the code's string or pattern meets a string fact's constraint,
 * decided exactly. For a string constant: eq and neq compare it, matches
 * tests it against the fact's pattern. For a pattern (the strings a
 * validator accepts): eq means it accepts exactly that string, neq that it
 * rejects it, matches that it accepts exactly the strings the fact's pattern
 * describes. Polarity forbid negates the constraint; for a pattern, a
 * forbidden match means no string matches both.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export function stringConstraintProblem(
  certificate: Record<string, unknown>,
  obligation: Readonly<Record<string, unknown>>,
  factId: string,
): string | null {
  const pattern = record(certificate.pattern);
  const operator = text(obligation.operator);
  const value = text(obligation.value);
  const forbid = text(obligation.polarity) === "forbid";
  try {
    if (text(pattern?.type) === "string") {
      const actual = text(pattern?.value);
      const holds =
        operator === "eq"
          ? actual === value
          : operator === "neq"
            ? actual !== value
            : languageAccepts(factPattern(value), actual);
      if (holds !== forbid) return null;
      return `the code's string ${JSON.stringify(actual)} ${forbid ? "meets" : "does not meet"} ${factId}'s constraint ${operator} ${JSON.stringify(value)}${forbid ? ", which the fact forbids" : ""}`;
    }
    const code: LanguageSpec = {
      type: "pattern",
      source: text(pattern?.source),
      flags: text(pattern?.flags),
      flavor: text(pattern?.flavor) === "python" ? "python" : "js",
      mode: "search",
    };
    const describe = `/${text(pattern?.source)}/${text(pattern?.flags)}`;
    if (operator === "eq" || operator === "neq") {
      const mustAccept = (operator === "eq") !== forbid;
      if (operator === "eq" && !forbid) {
        const decision = languagesEqual(code, { type: "literal", value });
        return decision.holds
          ? null
          : `the code's pattern ${describe} does not accept exactly ${JSON.stringify(value)}: ${decision.reason}`;
      }
      const accepts = languageAccepts(code, value);
      if (accepts === mustAccept) return null;
      return `the code's pattern ${describe} ${accepts ? "accepts" : "rejects"} ${JSON.stringify(value)}, but ${factId} requires it to ${mustAccept ? "accept" : "reject"} it`;
    }
    const fact = factPattern(value);
    const decision = forbid ? languagesDisjoint(code, fact) : languagesEqual(code, fact);
    if (decision.holds) return null;
    return forbid
      ? `the code's pattern ${describe} accepts ${JSON.stringify(decision.witness)}, which ${factId} forbids (it matches /${value}/)`
      : `the code's pattern ${describe} does not accept exactly the strings matching /${value}/: ${decision.reason.replace("the first language", "the code's pattern").replace("the second language", "the fact's pattern")}`;
  } catch (error) {
    if (error instanceof UnsupportedPattern)
      return `Kibi cannot decide the pattern exactly: ${error.message}`;
    throw error;
  }
}
