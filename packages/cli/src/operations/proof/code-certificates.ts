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

type SymbolRow = Readonly<{ id: string; title: string; sourceFile: string }>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function loadSymbol(
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

function readWorkspaceFile(workspaceRoot: string, relative: string) {
  const absolute = path.resolve(workspaceRoot, relative);
  if (!absolute.startsWith(path.resolve(workspaceRoot) + path.sep)) return null;
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
}

const IMPORT_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;

/**
 * Whether `source` (at `sourcePath`) imports `targetPath` and names
 * `identifier`: the domain is read from the code, not hand-listed.
 */
// implements REQ-kibi-code-proof-kinds
export function importsDomain(
  source: string,
  sourcePath: string,
  targetPath: string,
  identifier: string,
): boolean {
  if (identifier === "" || !new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(source))
    return false;
  const target = stripExtension(path.normalize(targetPath));
  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1] ?? "";
    if (!specifier.startsWith(".")) continue;
    const resolved = stripExtension(
      path.normalize(path.join(path.dirname(sourcePath), specifier)),
    );
    if (resolved === target) return true;
  }
  return false;
}

function stripExtension(file: string): string {
  return file.replace(/\.(?:d\.ts|[cm]?[jt]sx?)$/, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DOMAIN_EVALUATOR = `
const [file, name] = process.argv.slice(1);
const { pathToFileURL } = await import("node:url");
const value = (await import(pathToFileURL(file).href))[name];
let items = null;
if (Array.isArray(value)) items = value;
else if (value instanceof Set) items = [...value];
else if (value instanceof Map) items = [...value.keys()];
else if (value !== null && typeof value === "object") items = Object.keys(value);
const primitive = (item) => ["string", "number", "boolean", "bigint"].includes(typeof item);
console.log(JSON.stringify(items === null
  ? { error: \`\${name} is not an array, set, map or object\` }
  : { count: items.length, members: items.every(primitive) ? items.map(String) : null }));
`;

/**
 * The domain as the code defines it: Kibi imports the domain_source file
 * itself (with bun when it is on PATH, else node with type stripping) and
 * reads the named export's members, so a certificate cannot cover a
 * hand-listed subset.
 */
// implements REQ-kibi-code-proof-kinds
export function evaluateDomain(
  workspaceRoot: string,
  sourceFile: string,
  exportName: string,
):
  | { ok: true; count: number; members: readonly string[] | null }
  | { ok: false; reason: string } {
  const absolute = path.resolve(workspaceRoot, sourceFile);
  const runners: [string, string[]][] = [
    ["bun", ["-e", DOMAIN_EVALUATOR]],
    [
      process.execPath,
      [
        "--experimental-strip-types",
        "--no-warnings",
        "--input-type=module",
        "-e",
        DOMAIN_EVALUATOR,
      ],
    ],
  ];
  let failure = "";
  for (const [command, argv] of runners) {
    const run = spawnSync(command, [...argv, absolute, exportName], {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 60_000,
    });
    if (run.error) continue;
    const line = (run.stdout ?? "").trim().split("\n").pop() ?? "";
    try {
      const parsed = JSON.parse(line) as {
        error?: string;
        count?: number;
        members?: string[] | null;
      };
      if (parsed.error !== undefined) return { ok: false, reason: parsed.error };
      if (typeof parsed.count === "number")
        return { ok: true, count: parsed.count, members: parsed.members ?? null };
    } catch {
      // Fall through to the next runner.
    }
    failure = (run.stderr ?? "").trim().split("\n")[0] ?? "";
  }
  return {
    ok: false,
    reason: `Kibi could not load ${exportName} from ${sourceFile}${failure ? `: ${failure}` : ""}`,
  };
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
 * Kibi compiles a typecheck witness itself, with the workspace's TypeScript
 * and fixed strict options (a lax project tsconfig could make the never
 * check vacuous), and accepts it only with no errors in the witness.
 */
// implements REQ-kibi-code-proof-kinds
export function compileWitness(
  workspaceRoot: string,
  witnessPath: string,
): { ok: true; version: string } | { ok: false; reason: string } {
  let ts: TypeScriptApi;
  try {
    ts = createRequire(path.join(workspaceRoot, "package.json"))(
      "typescript",
    ) as TypeScriptApi;
  } catch {
    return {
      ok: false,
      reason:
        "Kibi could not load TypeScript from the workspace to compile the witness (install typescript)",
    };
  }
  const absolute = path.resolve(workspaceRoot, witnessPath);
  const program = ts.createProgram([absolute], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    allowJs: true,
    checkJs: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
  });
  const witness = program.getSourceFile(absolute);
  if (witness === undefined)
    return { ok: false, reason: `Kibi could not read the witness ${witnessPath}` };
  const errors = [
    ...program.getSyntacticDiagnostics(witness),
    ...program.getSemanticDiagnostics(witness),
  ].filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0)
    return {
      ok: false,
      reason: `TypeScript ${ts.version} rejects the witness ${witnessPath}: ${ts.flattenDiagnosticMessageText(errors[0]?.messageText ?? "", " ")}`,
    };
  return { ok: true, version: ts.version };
}

type FactConstraint = Readonly<{ operator: string; value: number }>;

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
function smtAssertion(
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
 * arithmetic and smt certificates must rest on the knowledge base: the
 * arithmetic assumptions are exactly the facts' constraints on a variable
 * named after the fact property, and an smt query declares that constant
 * and asserts each fact constraint.
 */
async function constraintSourceProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
): Promise<string | null> {
  const factIds = contract.constraint_source?.fact_ids ?? [];
  if (factIds.length === 0)
    return `the contract names no constraint_source facts, so the ${contract.kind} certificate proves numbers the test chose`;
  const facts = await factConstraints(context, factIds);
  if (!facts.ok) return facts.reason;
  if (contract.kind === "arithmetic") {
    if (text(certificate.variable) !== facts.property)
      return `the certificate's variable ${text(certificate.variable) || "(none)"} is not the facts' property ${facts.property}`;
    if (text(certificate.value_type) !== facts.valueType)
      return `the certificate's value_type ${text(certificate.value_type)} is not the facts' ${facts.valueType}`;
    const assumptions = Array.isArray(certificate.assumptions)
      ? certificate.assumptions.map((row) => constraintKey(record(row) ?? {}))
      : [];
    const expected = facts.constraints.map(constraintKey);
    const same =
      assumptions.length === expected.length &&
      [...assumptions].sort().join("|") === [...expected].sort().join("|");
    if (!same)
      return `the certificate's assumptions are not exactly the constraint_source facts' constraints (${expected.join(", ")})`;
    return null;
  }
  const query = text(certificate.query).replace(/\s+/g, " ");
  const sort = facts.valueType === "int" ? "Int" : "Real";
  if (!query.includes(`(declare-const ${facts.property} ${sort})`))
    return `the query does not declare (declare-const ${facts.property} ${sort}) for the facts' property`;
  for (const row of facts.constraints) {
    const assertion = smtAssertion(facts.property, facts.valueType, row);
    if (!query.includes(assertion))
      return `the query does not assert the constraint_source fact constraint ${assertion}`;
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
    const importing = readers.some((reader) => {
      if (reader === "") return false;
      const source = readWorkspaceFile(context.workspaceRoot, reader);
      return (
        source !== null &&
        importsDomain(source, reader, domain.sourceFile, domain.title)
      );
    });
    if (!importing)
      return `the proof does not import ${domain.title || domainId} from ${domain.sourceFile}, so its domain may be hand-listed`;
    if (kind === "exhaustive") {
      const evaluated = evaluateDomain(
        context.workspaceRoot,
        domain.sourceFile,
        domain.title,
      );
      if (!evaluated.ok) return evaluated.reason;
      const members = record(certificate.domain)?.members;
      const problem = domainCoverageProblem(
        domain.title,
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
      if (!/\bnever\b/.test(content))
        return `the witness ${witnessPath} has no never check, so a new domain member would still compile`;
      const compiled = compileWitness(context.workspaceRoot, witnessPath);
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
  return null;
}

/**
 * Re-check the certificate a certificate-kind run left for one test. A
 * runner kind (e2e, example, property) supports tested evidence and needs
 * no certificate; a certificate kind supports proved evidence only when the
 * certificate re-checks: its structure and arithmetic in code_certificates.pl,
 * and here that the proof read its domain from the code, that the witness is
 * the workspace file, and that the solver still answers unsat.
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
