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
 * Builders for the kibi.code-certificate.v1 a certificate-kind proof contract
 * leaves for `kibi prove`. A test builds its certificate and writes it with
 * writeCodeCertificate; outside `kibi prove` the write is a no-op, so the same
 * test runs unchanged in an ordinary test run. Kibi re-checks every
 * certificate at ingest and again whenever it reports evidence, so a
 * certificate only records what the test did; it never vouches for itself.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CODE_CERTIFICATE_VERSION } from "./proof-protocol.js";

/** Where `kibi prove` asks a run to leave its certificates. */
// implements REQ-kibi-code-proof-kinds
export const PROOF_CERTIFICATES_ENV = "KIBI_PROOF_CERTIFICATES";

// implements REQ-kibi-code-proof-kinds
export type CodeCertificate = Readonly<Record<string, unknown>> &
  Readonly<{
    version: typeof CODE_CERTIFICATE_VERSION;
    kind:
      | "exhaustive"
      | "typecheck"
      | "arithmetic"
      | "smt"
      | "rule"
      | "state_machine"
      | "regex";
    test_id: string;
  }>;

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left, (char) => char.codePointAt(0) ?? 0);
  const b = Array.from(right, (char) => char.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

const JSON_ESCAPES: Readonly<Record<string, string>> = {
  '"': '\\"',
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

function canonicalString(value: string): string {
  let out = '"';
  for (let index = 0; index < value.length; index++) {
    const char = value[index] as string;
    const unit = value.charCodeAt(index);
    const escaped = JSON_ESCAPES[char];
    if (escaped !== undefined) out += escaped;
    else if (unit >= 0x20 && unit <= 0x7e) out += char;
    else out += `\\u${unit.toString(16).padStart(4, "0")}`;
  }
  return `${out}"`;
}

/**
 * The canonical JSON of a certificate, byte for byte what
 * code_certificates.pl hashes: keys sorted by code point, no whitespace,
 * non-ASCII and control characters as \u escapes of UTF-16 code units.
 */
// implements REQ-kibi-code-proof-kinds
export function canonicalCertificateJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value))
    return `[${value.map(canonicalCertificateJson).join(",")}]`;
  if (typeof value === "object")
    return `{${Object.keys(value)
      .sort(compareCodePoints)
      .map(
        (key) =>
          `${canonicalString(key)}:${canonicalCertificateJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  if (typeof value === "string") return canonicalString(value);
  return JSON.stringify(value);
}

/** The sha256 a receipt records for its certificate. */
// implements REQ-kibi-code-proof-kinds
export function certificateDigest(certificate: unknown): string {
  return createHash("sha256")
    .update(canonicalCertificateJson(certificate), "utf8")
    .digest("hex");
}

// implements REQ-kibi-code-proof-kinds
export type ExhaustiveResult = Readonly<{
  member: string;
  outcome: "passed" | "failed";
  message?: string;
}>;

/**
 * Run `check` on every member of a finite domain and record each outcome.
 * `members` must be the domain as the code defines it (import it from its
 * source, never restate it): Kibi rejects the certificate unless the proof
 * file imports the contract's domain_source symbol.
 */
// implements REQ-kibi-code-proof-kinds
export async function exhaustiveCertificate<T>(input: {
  testId: string;
  domain: Readonly<{ symbolId: string; members: Iterable<T> }>;
  key?: (member: T) => string;
  check: (member: T) => void | Promise<void>;
}): Promise<CodeCertificate> {
  const key = input.key ?? ((member: T) => String(member));
  const members = [...input.domain.members];
  const results: ExhaustiveResult[] = [];
  for (const member of members) {
    try {
      await input.check(member);
      results.push({ member: key(member), outcome: "passed" });
    } catch (error) {
      results.push({
        member: key(member),
        outcome: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    version: CODE_CERTIFICATE_VERSION,
    kind: "exhaustive",
    test_id: input.testId,
    domain: {
      symbol_id: input.domain.symbolId,
      members: members.map(key),
    },
    results,
  };
}

/** The members an exhaustive certificate records as failed. */
// implements REQ-kibi-code-proof-kinds
export function failedMembers(certificate: CodeCertificate): string[] {
  const results = Array.isArray(certificate.results)
    ? (certificate.results as ExhaustiveResult[])
    : [];
  return results
    .filter((result) => result.outcome !== "passed")
    .map((result) =>
      result.message ? `${result.member}: ${result.message}` : result.member,
    );
}

/**
 * A type checker accepted `witnessPath`, a file that fails to compile when a
 * member of the domain goes unhandled (an exhaustive switch ending in a
 * `never` assignment, or a mapped type over the domain).
 */
// implements REQ-kibi-code-proof-kinds
export function typecheckCertificate(input: {
  testId: string;
  domainSymbolId: string;
  witnessPath: string;
  workspaceRoot?: string;
  compiler: Readonly<{ name: string; version: string }>;
  accepted: boolean;
}): CodeCertificate {
  const absolute = path.resolve(
    input.workspaceRoot ?? process.cwd(),
    input.witnessPath,
  );
  return {
    version: CODE_CERTIFICATE_VERSION,
    kind: "typecheck",
    test_id: input.testId,
    domain: { symbol_id: input.domainSymbolId },
    witness: {
      path: input.witnessPath,
      sha256: createHash("sha256")
        .update(readFileSync(absolute, "utf8"))
        .digest("hex"),
    },
    compiler: { ...input.compiler },
    outcome: input.accepted ? "passed" : "failed",
  };
}

// implements REQ-kibi-code-proof-kinds
export type ArithmeticConstraint = Readonly<{
  operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  value: number;
}>;

/**
 * A claim about one numeric variable that Kibi decides exactly: the
 * assumptions must be satisfiable and must entail the claim for every value
 * of the variable, not only the values a test happened to try.
 */
// implements REQ-kibi-code-proof-kinds
export function arithmeticCertificate(input: {
  testId: string;
  variable: string;
  valueType: "int" | "real";
  assumptions: readonly ArithmeticConstraint[];
  claim: ArithmeticConstraint;
}): CodeCertificate {
  return {
    version: CODE_CERTIFICATE_VERSION,
    kind: "arithmetic",
    test_id: input.testId,
    variable: input.variable,
    value_type: input.valueType,
    assumptions: input.assumptions.map((row) => ({ ...row })),
    claim: { ...input.claim },
  };
}

/**
 * An SMT-LIB query whose unsat answer proves the claim (the query asserts
 * the claim's negation). Kibi re-runs the named solver on the query.
 */
// implements REQ-kibi-code-proof-kinds
export function smtCertificate(input: {
  testId: string;
  solver: Readonly<{ name: "z3" | "cvc5"; version: string }>;
  query: string;
  result: string;
}): CodeCertificate {
  return {
    version: CODE_CERTIFICATE_VERSION,
    kind: "smt",
    test_id: input.testId,
    solver: { ...input.solver },
    query: input.query,
    result: input.result,
  };
}

const certificateText = (value: unknown) =>
  typeof value === "string" ? value : String(value);

/** A finite domain a rule certificate ranges over. */
// implements REQ-kibi-non-numeric-proof-kinds
export type RuleDomain = Readonly<{
  symbolId: string;
  members: Iterable<unknown>;
}>;

/** A predicate the code decides, and the argument types it takes. */
// implements REQ-kibi-non-numeric-proof-kinds
export type RulePredicate = Readonly<{
  symbolId: string;
  argTypes: readonly string[];
  decide: (...args: never[]) => boolean | Promise<boolean>;
}>;

/**
 * Call every predicate on every combination of its argument domains and
 * record what the code decides. Import the domains and functions from their
 * source (never restate them): Kibi evaluates the same exports at ingest and
 * rejects a certificate whose tables differ, then model checks each claim's
 * rule, predicate or set fact against the tables.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export async function ruleCertificate(input: {
  testId: string;
  domains: Readonly<Record<string, RuleDomain>>;
  predicates: Readonly<Record<string, RulePredicate>>;
}): Promise<CodeCertificate> {
  const values: Record<string, unknown[]> = {};
  const domains: Record<string, { symbol_id: string; members: string[] }> = {};
  for (const [type, domain] of Object.entries(input.domains)) {
    values[type] = [...domain.members];
    domains[type] = {
      symbol_id: domain.symbolId,
      members: values[type].map(certificateText),
    };
  }
  const predicates: Record<
    string,
    {
      symbol_id: string;
      arg_types: string[];
      rows: { args: string[]; value?: boolean; error?: string }[];
    }
  > = {};
  for (const [name, predicate] of Object.entries(input.predicates)) {
    const lists = predicate.argTypes.map((type) => {
      const list = values[type];
      if (list === undefined)
        throw new Error(`no domain for argument type ${type} of ${name}`);
      return list;
    });
    const rows: { args: string[]; value?: boolean; error?: string }[] = [];
    const count = lists.reduce((product, list) => product * list.length, 1);
    for (let index = 0; index < count; index++) {
      let rest = index;
      const tuple: unknown[] = [];
      for (let position = lists.length - 1; position >= 0; position--) {
        const list = lists[position] as unknown[];
        tuple[position] = list[rest % list.length];
        rest = Math.floor(rest / list.length);
      }
      const args = tuple.map(certificateText);
      try {
        const value = await (
          predicate.decide as (...args: unknown[]) => unknown
        )(...tuple);
        rows.push(
          typeof value === "boolean"
            ? { args, value }
            : { args, error: `returned ${typeof value}, not a boolean` },
        );
      } catch (error) {
        rows.push({
          args,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    predicates[name] = {
      symbol_id: predicate.symbolId,
      arg_types: [...predicate.argTypes],
      rows,
    };
  }
  return {
    version: CODE_CERTIFICATE_VERSION,
    kind: "rule",
    test_id: input.testId,
    domains,
    predicates,
  };
}

/** The calls of a rule certificate that threw or returned a non-boolean. */
// implements REQ-kibi-non-numeric-proof-kinds
export function failedCalls(certificate: CodeCertificate): string[] {
  const predicates = (certificate.predicates ?? {}) as Record<
    string,
    { rows?: { args: string[]; error?: string }[] }
  >;
  return Object.entries(predicates).flatMap(([name, table]) =>
    (table.rows ?? [])
      .filter((row) => row.error !== undefined)
      .map((row) => `${name}(${row.args.join(", ")}): ${row.error}`),
  );
}

type Transitions =
  | ReadonlyMap<unknown, unknown>
  | Readonly<Record<string, unknown>>
  | readonly unknown[]
  | ((state: never, event: never) => unknown);

function nextStates(next: unknown): unknown[] {
  if (next === null || next === undefined || next === false) return [];
  if (Array.isArray(next)) return next;
  if (next instanceof Set) return [...next];
  if (next instanceof Map) return [...next.values()];
  if (typeof next === "object") return Object.values(next);
  return [next];
}

/**
 * Record a state machine as the code defines it: a transition table (an
 * object or Map from each state to its next state, states, or event map; or
 * a list of [from, to] pairs) or a next-state function called on every state
 * and event (a throw, null or undefined means no transition). Kibi reads the
 * same exports at ingest and checks each claim's transitions, reachability,
 * initial and terminal states against the machine.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export async function stateMachineCertificate(input: {
  testId: string;
  symbolId: string;
  transitions: Transitions;
  /** For a next-state function: the states and events it is called on. */
  states?: Iterable<unknown>;
  events?: Iterable<unknown>;
  initial?: unknown;
}): Promise<CodeCertificate> {
  const states = new Set<string>();
  const edges = new Map<string, [string, string]>();
  const edge = (from: unknown, to: unknown) => {
    const pair: [string, string] = [certificateText(from), certificateText(to)];
    states.add(pair[0]);
    states.add(pair[1]);
    edges.set(pair.join("\u0000"), pair);
  };
  const table = input.transitions;
  if (typeof table === "function") {
    const events = [...(input.events ?? [])];
    for (const state of input.states ?? []) {
      states.add(certificateText(state));
      for (const event of events) {
        let next: unknown;
        try {
          next = await (table as (state: unknown, event: unknown) => unknown)(
            state,
            event,
          );
        } catch {
          continue;
        }
        for (const target of nextStates(next)) edge(state, target);
      }
    }
  } else if (Array.isArray(table)) {
    for (const entry of table as unknown[]) {
      if (Array.isArray(entry) && entry.length === 2) edge(entry[0], entry[1]);
      else if (entry !== null && typeof entry === "object")
        edge(
          (entry as { from: unknown }).from,
          (entry as { to: unknown }).to,
        );
    }
  } else {
    const entries =
      table instanceof Map
        ? [...table.entries()]
        : Object.entries(table as Record<string, unknown>);
    for (const [from, next] of entries) {
      states.add(certificateText(from));
      for (const target of nextStates(next)) edge(from, target);
    }
  }
  const initial =
    input.initial === undefined
      ? undefined
      : (typeof input.initial === "object" && input.initial !== null
          ? [...(input.initial as Iterable<unknown>)]
          : [input.initial]
        )
          .map(certificateText)
          .sort();
  return {
    version: CODE_CERTIFICATE_VERSION,
    kind: "state_machine",
    test_id: input.testId,
    machine: {
      symbol_id: input.symbolId,
      states: [...states].sort(),
      transitions: [...edges.values()].sort((a, b) =>
        a.join("\u0000") < b.join("\u0000") ? -1 : 1,
      ),
      ...(initial !== undefined ? { initial } : {}),
    },
  };
}

/**
 * Record the pattern (a RegExp) or string constant a string claim is about.
 * Kibi reads the same export at ingest and decides the claim exactly: a
 * pattern's language against the fact's, or the string against the fact.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export function regexCertificate(input: {
  testId: string;
  symbolId: string;
  value: RegExp | string;
}): CodeCertificate {
  return {
    version: CODE_CERTIFICATE_VERSION,
    kind: "regex",
    test_id: input.testId,
    pattern:
      typeof input.value === "string"
        ? { symbol_id: input.symbolId, type: "string", value: input.value }
        : {
            symbol_id: input.symbolId,
            type: "regexp",
            source: input.value.source,
            flags: input.value.flags,
            flavor: "js",
          },
  };
}

/**
 * Leave the certificate where `kibi prove` reads it. Returns the file written,
 * or null outside a `kibi prove` run.
 */
// implements REQ-kibi-code-proof-kinds
export function writeCodeCertificate(
  certificate: CodeCertificate,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const directory = env[PROOF_CERTIFICATES_ENV];
  if (directory === undefined || directory.trim() === "") return null;
  mkdirSync(directory, { recursive: true });
  const file = path.join(
    directory,
    `${certificate.test_id.replace(/[^A-Za-z0-9._-]/g, "_")}.json`,
  );
  writeFileSync(file, `${JSON.stringify(certificate, null, 2)}\n`, "utf8");
  return file;
}
