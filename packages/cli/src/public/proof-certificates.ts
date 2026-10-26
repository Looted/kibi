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
    kind: "exhaustive" | "typecheck" | "arithmetic" | "smt";
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
