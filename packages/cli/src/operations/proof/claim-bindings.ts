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

import { randomBytes } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { normalizeEntityId, parseTriples } from "../../prolog/codec.js";
import {
  runOperationJsonQuery,
  toPrologAtom,
} from "../../public/operations/prolog-json.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import { matchWorkspaceFiles } from "../../public/proof-sources.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { ProofContract } from "../../public/proof-protocol.js";
import type { ClaimBinding } from "../../public/proof-receipt.js";
import {
  type CertificateVerdict,
  compileWitness,
  loadSymbol,
  smtAssertion,
} from "./code-certificates.js";
import { stringConstraintProblem } from "./code-models.js";

type ObligationRow = Readonly<{
  claim_key: string;
  requirement_id?: string;
  fact_id?: string;
  result: "obligation" | "attested" | "incompatible" | "unresolved";
  obligation?: Readonly<Record<string, unknown>>;
  reason?: string;
}>;

type SetObligation = Readonly<{ kind: "set_equals"; members: string[] }>;
type NumericObligation = Readonly<{
  kind: "numeric_constraint";
  variable: string;
  value_type: "int" | "real";
  operator: string;
  value: number;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function setDifference(code: readonly string[], fact: readonly string[]) {
  const factSet = new Set(fact);
  const codeSet = new Set(code);
  const missing = fact.filter((member) => !codeSet.has(member));
  const extra = code.filter((member) => !factSet.has(member));
  return [
    missing.length > 0 ? `missing ${missing.slice(0, 5).join(", ")}` : "",
    extra.length > 0 ? `not in the set ${extra.slice(0, 5).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/**
 * The type-level witness Kibi writes for a typecheck claim binding: it
 * compiles only when the domain type has exactly the fact's members.
 */
// implements REQ-kibi-claim-bound-proofs
export function setEqualityWitness(
  importPath: string,
  members: readonly string[],
  membersType: string,
): string {
  const union = members.map((member) => JSON.stringify(member)).join(" | ");
  return [
    `import type * as domain from ${JSON.stringify(importPath)};`,
    "type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;",
    `type Members = ${membersType};`,
    `const exact: Equals<Members, ${union}> = true;`,
    "void exact;",
    "export {};",
    "",
  ].join("\n");
}

/**
 * How a domain export may spell its members as a type: a type alias or
 * enum, a const array, the values of a string enum, or a const object's keys.
 */
function membersTypeCandidates(exportName: string): string[] {
  const name = `domain.${exportName}`;
  return [
    name,
    `(typeof ${name})[number]`,
    `\`\${${name}}\``,
    `keyof typeof ${name}`,
  ];
}

async function typecheckSetProblem(
  context: OperationContext,
  contract: ProofContract,
  obligation: SetObligation,
): Promise<string | null> {
  const domainId = contract.domain_source?.symbol_id ?? "";
  const domain = await loadSymbol(context, domainId);
  if (!domain || domain.sourceFile === "")
    return `the domain_source symbol ${domainId} has no source file`;
  const exportName = contract.domain_source?.export ?? domain.title;
  const directory = path.dirname(domain.sourceFile);
  const base = path.basename(domain.sourceFile).replace(/\.[cm]?[jt]sx?$/, "");
  const witnessPath = path.join(
    directory,
    `.kibi-claim-witness-${randomBytes(6).toString("hex")}.ts`,
  );
  const absolute = path.resolve(context.workspaceRoot, witnessPath);
  let lastReason = "";
  try {
    for (const membersType of membersTypeCandidates(exportName)) {
      writeFileSync(
        absolute,
        setEqualityWitness(`./${base}.js`, obligation.members, membersType),
        "utf8",
      );
      const compiled = compileWitness(context.workspaceRoot, witnessPath);
      if (compiled.ok) return null;
      lastReason = compiled.reason;
    }
  } finally {
    rmSync(absolute, { force: true });
  }
  return `${exportName} as a type is not exactly the fact's set {${obligation.members.join(", ")}}${lastReason ? ` (${lastReason.replace(/ the witness \S+/, " the set-equality witness")})` : ""}`;
}

function smtNegation(obligation: NumericObligation): string {
  const assertion = smtAssertion(obligation.variable, obligation.value_type, {
    operator: obligation.operator,
    value: obligation.value,
  });
  // (assert X) -> (assert (not X))
  return `(assert (not ${assertion.slice("(assert ".length, -1)}))`;
}

function constraintText(obligation: NumericObligation): string {
  return `${obligation.variable} ${obligation.operator} ${obligation.value}`;
}

/**
 * The type-level witness Kibi writes for a required_fields claim binding: it
 * compiles only when every field is a required key of the type whose value
 * can be neither undefined nor null. Each field has its own two lines (`key<i>`
 * that the field exists, `required<i>` that it is required and non-null), so
 * a failed compile says which fields break the claim.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export function requiredFieldsWitness(
  importPath: string,
  typeExpression: string,
  fields: readonly string[],
): string {
  return [
    `import type * as domain from ${JSON.stringify(importPath)};`,
    `type Shape = ${typeExpression};`,
    "type HasKey<K extends PropertyKey> = K extends keyof Shape ? true : false;",
    "type IsRequired<K extends PropertyKey> = K extends keyof Shape",
    "  ? {} extends Pick<Shape, K> ? false : undefined extends Shape[K] ? false : null extends Shape[K] ? false : true",
    "  : false;",
    ...fields.flatMap((field, index) => [
      `const key${index}: HasKey<${JSON.stringify(field)}> = true;`,
      `const required${index}: IsRequired<${JSON.stringify(field)}> = true;`,
    ]),
    `void [${fields.map((_, index) => `key${index}, required${index}`).join(", ")}];`,
    "export {};",
    "",
  ].join("\n");
}

/** Which fields a failed required-fields witness rejected, and how. */
export function requiredFieldsFailures(
  witness: string,
  fields: readonly string[],
  errorLines: readonly number[],
): string[] {
  const lines = witness.split("\n");
  const failing = new Set(errorLines);
  const lineOf = (prefix: string) =>
    lines.findIndex((line) => line.startsWith(prefix));
  const failures: string[] = [];
  fields.forEach((field, index) => {
    if (failing.has(lineOf(`const key${index}:`)))
      failures.push(`${field} is not a field`);
    else if (failing.has(lineOf(`const required${index}:`)))
      failures.push(`${field} is optional or nullable`);
  });
  return failures;
}

async function requiredFieldsProblem(
  context: OperationContext,
  contract: ProofContract,
  fields: readonly string[],
): Promise<string | null> {
  const domainId = contract.domain_source?.symbol_id ?? "";
  const domain = await loadSymbol(context, domainId);
  if (!domain || domain.sourceFile === "")
    return `the domain_source symbol ${domainId} has no source file`;
  const exportName = contract.domain_source?.export ?? domain.title;
  const directory = path.dirname(domain.sourceFile);
  const base = path.basename(domain.sourceFile).replace(/\.[cm]?[jt]sx?$/, "");
  const witnessPath = path.join(
    directory,
    `.kibi-claim-witness-${randomBytes(6).toString("hex")}.ts`,
  );
  const absolute = path.resolve(context.workspaceRoot, witnessPath);
  let lastReason = "";
  let failures: string[] = [];
  try {
    for (const typeExpression of [
      `domain.${exportName}`,
      `InstanceType<typeof domain.${exportName}>`,
    ]) {
      const witness = requiredFieldsWitness(`./${base}.js`, typeExpression, fields);
      writeFileSync(absolute, witness, "utf8");
      const compiled = compileWitness(context.workspaceRoot, witnessPath);
      if (compiled.ok) return null;
      lastReason = compiled.reason;
      // The first type expression that names a real type decides which
      // fields fail; the InstanceType form is only for classes.
      const errorLines = compiled.errorLines ?? [];
      const shapeLine = witness.split("\n").findIndex((line) => line.startsWith("type Shape"));
      if (failures.length === 0 && !errorLines.includes(shapeLine))
        failures = requiredFieldsFailures(witness, fields, errorLines);
    }
  } finally {
    rmSync(absolute, { force: true });
  }
  if (failures.length > 0)
    return `${exportName} does not have every field of {${fields.join(", ")}} as a required, non-nullable field: ${failures.join("; ")}`;
  return `${exportName} does not have every field of {${fields.join(", ")}} as a required, non-nullable field${lastReason ? ` (${lastReason.replace(/ the witness \S+/, " the required-fields witness")})` : ""}`;
}

/** The symbols a non-numeric certificate read, which must be in code scope. */
function modelSymbols(contract: ProofContract): string[] {
  return [
    contract.domain_source?.symbol_id,
    contract.initial_source?.symbol_id,
    contract.pattern_source?.symbol_id,
    ...Object.values(contract.domains ?? {}).map((row) =>
      "symbol_id" in row ? row.symbol_id : undefined,
    ),
    ...Object.values(contract.predicate_source ?? {}).flatMap((row) => [
      row.symbol_id,
      ...(row.harness_for ?? []),
    ]),
  ].filter((id): id is string => typeof id === "string" && id !== "");
}

async function nonNumericProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
  obligation: Record<string, unknown>,
  factId: string,
  coveredBy: ReadonlySet<string>,
): Promise<string | null> {
  const outside = modelSymbols(contract).find((id) => !coveredBy.has(id));
  if (outside !== undefined)
    return `the symbol ${outside} the certificate read is not in the receipt's code scope: link it covered_by the test so a change to it stales the proof`;
  const obligationKind = text(obligation.kind);
  if (obligationKind === "required_fields" && contract.kind === "typecheck")
    return requiredFieldsProblem(
      context,
      contract,
      Array.isArray(obligation.members) ? obligation.members.map(String) : [],
    );
  if (obligationKind === "string_constraint")
    return stringConstraintProblem(certificate, obligation, factId);
  if (context.prolog === undefined)
    return "no Prolog runtime is attached to model check the claim";
  const checked = await runOperationJsonQuery<{ ok?: boolean; reason?: string }>(
    context.prolog,
    "claim_obligations.pl",
    `claim_obligations:claim_model_check_json(${toPrologAtom(contract.kind ?? "")}, ${toPrologAtom(JSON.stringify(obligation))}, ${toPrologAtom(JSON.stringify(certificate))}, JsonString)`,
    "Claim model check",
  );
  return checked.ok === true ? null : (checked.reason ?? "the model check failed");
}

const NON_NUMERIC_OBLIGATIONS = new Set([
  "required_fields",
  "string_constraint",
  "rule_holds",
  "predicate_holds",
  "every_member",
  "machine_set",
  "machine_relation",
  "set_relation",
  "nullable_fields",
  "route_middleware",
  "sequence_precedes",
]);

async function derivedProblem(
  context: OperationContext,
  contract: ProofContract,
  certificate: Record<string, unknown>,
  row: ObligationRow,
  coveredBy: ReadonlySet<string>,
): Promise<string | null> {
  const obligation = record(row.obligation) ?? {};
  const kind = contract.kind;
  const factId = row.fact_id ?? "the grounding fact";
  if (NON_NUMERIC_OBLIGATIONS.has(text(obligation.kind)))
    return nonNumericProblem(context, contract, certificate, obligation, factId, coveredBy);
  if (kind === "exhaustive" || kind === "typecheck") {
    const set = obligation as unknown as SetObligation;
    const domainId = contract.domain_source?.symbol_id ?? "";
    if (!coveredBy.has(domainId))
      return `the domain_source symbol ${domainId} is not in the receipt's code scope: link it covered_by the test so a change to the domain stales the proof`;
    if (kind === "exhaustive") {
      const members = record(certificate.domain)?.members;
      const code = sorted(
        Array.isArray(members) ? members.map((member) => String(member)) : [],
      );
      const fact = sorted(set.members ?? []);
      if (code.join("\u0000") !== fact.join("\u0000"))
        return `the domain members Kibi read are not ${factId}'s set (${setDifference(code, fact)})`;
      return null;
    }
    return typecheckSetProblem(context, contract, set);
  }
  const numeric = obligation as unknown as NumericObligation;
  if (kind === "arithmetic") {
    const claim = record(certificate.claim) ?? {};
    if (
      text(certificate.variable) !== numeric.variable ||
      text(certificate.value_type) !== numeric.value_type ||
      text(claim.operator) !== numeric.operator ||
      Number(claim.value) !== numeric.value
    )
      return `the certificate's claim is not ${factId}'s constraint (${constraintText(numeric)})`;
    return null;
  }
  const query = text(certificate.query).replace(/\s+/g, " ");
  const negation = smtNegation(numeric);
  if (!query.includes(negation))
    return `the query does not assert the negation of ${factId}'s constraint ${negation}`;
  return null;
}

/**
 * Callees that read one environment variable. A string_args read of one of
 * them sees only that getter's first arguments, never the other ways the
 * code reads the environment, so it cannot decide an eq, subset_of or
 * excludes claim about what the code reads; the env extract reads them all.
 */
const ENVIRONMENT_GETTER =
  /(?:^|[.:/])(?:getenv|Getenv|LookupEnv|getenvb|GetEnvironmentVariable)$|(?:^|[.:/])env::var(?:_os)?$|^(?:os\.environ\.get|ENV\.fetch|process\.env)$/;

export function environmentGetterCallee(callee: string): boolean {
  return ENVIRONMENT_GETTER.test(callee.replace(/\s+/g, "").replace(/\/\d+$/, ""));
}

const CLOSED_OPERATORS = new Set(["eq", "subset_of", "excludes"]);

const FILE_NAME_TOKEN = /[A-Za-z0-9_][A-Za-z0-9_./-]*\.[A-Za-z0-9]{1,10}\b/g;

/**
 * The project files a claim names in its subject key or claim text (for
 * example `src/match.c` or `utils.sh`): a token resolves to the file at that
 * path, else to every project file with that name. Tokens that name no
 * file (dotted subject keys such as `kibi.cli`) resolve to nothing.
 */
// implements REQ-kibi-source-proof-kinds
export function namedClaimFiles(
  workspaceRoot: string,
  texts: readonly string[],
): Map<string, string[]> {
  const named = new Map<string, string[]>();
  for (const value of texts) {
    for (const match of value.matchAll(FILE_NAME_TOKEN)) {
      const token = match[0].replace(/^\.\//, "").replace(/[./-]+$/, "");
      if (named.has(token) || !/\.[A-Za-z0-9]{1,10}$/.test(token)) continue;
      if (token.includes("*") || token.startsWith("/")) continue;
      const exact = matchWorkspaceFiles(workspaceRoot, [token]);
      const files =
        exact.length > 0
          ? exact
          : matchWorkspaceFiles(workspaceRoot, [`**/${token}`]);
      if (files.length > 0) named.set(token, files);
    }
  }
  return named;
}


type SourceScopeCheck = (row: ObligationRow) => Promise<string | null>;

/**
 * What a references read must cover for the claims it proves. The read
 * decides a claim only for the files it reads, so every symbol the test
 * covers (covered_by) and every symbol that implements the claim's
 * requirement must lie in one of those files: otherwise the claim, which is
 * about that symbol's code, would be decided on other files. A string_args
 * read of an environment getter cannot decide a closed claim (eq, subset_of,
 * excludes) about what the code reads, since the other getters are unread.
 */
// implements REQ-kibi-source-proof-kinds
async function sourceScopeCheck(
  context: OperationContext,
  contract: ProofContract,
  coveredBy: ReadonlySet<string>,
): Promise<SourceScopeCheck | null> {
  const spec = contract.source as Record<string, unknown> | undefined;
  if (contract.kind !== "source" || spec?.reader !== "references") return null;
  const list = (value: unknown): string[] =>
    typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
  const read = new Set(
    matchWorkspaceFiles(context.workspaceRoot, list(spec.files), list(spec.ignore)),
  );
  const implementers = new Map<string, string[]>();
  if (context.prolog !== undefined) {
    const result = await context.prolog.query(
      "findall([From,To,'implements'], kb_relationship(implements, From, To), Rels)",
    );
    if (!result.success)
      throw new Error(
        `implements relationship query failed: ${result.error ?? "Unknown error"}`,
      );
    for (const [from, to] of parseTriples(result.bindings.Rels ?? "[]")) {
      const requirement = normalizeEntityId(to);
      implementers.set(requirement, [
        ...(implementers.get(requirement) ?? []),
        normalizeEntityId(from),
      ]);
    }
  }
  const files = new Map<string, string>();
  const fileOf = async (symbolId: string): Promise<string> => {
    if (!files.has(symbolId))
      files.set(symbolId, (await loadSymbol(context, symbolId))?.sourceFile ?? "");
    return files.get(symbolId) ?? "";
  };
  const callee = typeof spec.callee === "string" ? spec.callee : "";
  const getter = spec.extract === "string_args" && environmentGetterCallee(callee);
  return async (row) => {
    const operator = text(record(row.obligation)?.operator);
    if (getter && CLOSED_OPERATORS.has(operator))
      return `a string_args read of ${callee} sees only that getter's arguments, not the other ways the code reads the environment, so it cannot decide a ${operator} claim; read the files with extract env`;
    const linked = [
      ...[...coveredBy].map((id) => ({ id, how: "is covered by the test" })),
      ...(implementers.get(row.requirement_id ?? "") ?? []).map((id) => ({
        id,
        how: `implements ${row.requirement_id}`,
      })),
    ];
    if (row.fact_id && context.prolog !== undefined) {
      const [fact] = await loadEntities(context.prolog, { id: row.fact_id, type: "fact" });
      const named = namedClaimFiles(context.workspaceRoot, [
        text(fact?.subject_key),
        text(fact?.claim_text),
      ]);
      const unread = [...named].filter(([, paths]) => !paths.some((file) => read.has(file)));
      if (unread.length > 0) {
        const [token, paths] = unread[0] as [string, string[]];
        return `the claim is about ${token}${paths[0] !== token ? ` (${paths.slice(0, 3).join(", ")})` : ""}, which the read does not include. Kibi decides the claim only on the files it reads, so add that file to files; if Kibi cannot read it, the claim cannot be decided`;
      }
    }
    const outside: string[] = [];
    for (const { id, how } of linked) {
      const file = await fileOf(id);
      if (file !== "" && !read.has(file) && !outside.some((text) => text.startsWith(`${id} `)))
        outside.push(`${id} (${file}) ${how}`);
    }
    if (outside.length === 0) return null;
    return `the read does not cover the code the claim is about: ${outside.slice(0, 3).join("; ")}${outside.length > 3 ? ` and ${outside.length - 3} more` : ""}. Kibi decides the claim only on the files it reads, so add those files to files; if Kibi cannot read them, the claim cannot be decided for them`;
  };
}

/**
 * The evidence level a receipt records. A certificate that re-checks but
 * derives none of the claims it names from the code proves nothing about
 * the code, so the receipt supports tested, the level coverage reports. An
 * intent-scope derivation rests on the knowledge base's own facts alone
 * (the test read no value from the code), so it does not count either.
 */
// implements REQ-kibi-claim-bound-proofs
export function receiptEvidenceLevel(
  level: "proved" | "tested",
  bindings: readonly ClaimBinding[] | undefined,
): "proved" | "tested" {
  if (level !== "proved" || bindings === undefined || bindings.length === 0)
    return level;
  return bindings.some(
    (binding) => binding.binding === "derived" && binding.scope !== "intent",
  )
    ? "proved"
    : "tested";
}

/**
 * How a certificate binds to each claim its contract names in proves. Kibi
 * derives what the certificate must establish from each claim's grounding
 * fact (claim_obligations.pl) and checks the certificate against it; a claim
 * whose fact has no derivation is only attested by the author. Returns
 * undefined for a contract that names no claims.
 */
// implements REQ-kibi-claim-bound-proofs, REQ-kibi-non-numeric-proof-kinds
export async function judgeClaimBindings(
  context: OperationContext,
  input: Readonly<{
    testId: string;
    contract: ProofContract;
    verdict: CertificateVerdict;
    coveredBySymbols: readonly string[];
  }>,
): Promise<ClaimBinding[] | undefined> {
  const keys = input.contract.proves ?? [];
  if (keys.length === 0 || input.contract.kind === undefined) return undefined;
  if (context.prolog === undefined)
    return keys.map((key) => ({
      claim_key: key,
      binding: "rejected",
      reason: "no Prolog runtime is attached to resolve the claim",
    }));
  const rows = await runOperationJsonQuery<ObligationRow[]>(
    context.prolog,
    "claim_obligations.pl",
    `claim_obligations:test_claim_obligations_json(${toPrologAtom(input.testId)}, ${toPrologAtom(JSON.stringify(keys))}, ${toPrologAtom(input.contract.kind)}, JsonString)`,
    "Claim obligations",
  );
  const coveredBy = new Set(input.coveredBySymbols);
  const valueSourced =
    (input.contract.value_source ?? []).length > 0 &&
    (input.contract.value_source ?? []).every(
      (source) => "source" in source || coveredBy.has(source.symbol_id),
    );
  // A rule decided by a test harness that drives the code is about the code
  // through that harness, so its claims are bound with scope harness.
  const harnessed =
    input.contract.kind === "rule" &&
    Object.values(input.contract.predicate_source ?? {}).some(
      (row) => (row.harness_for ?? []).length > 0,
    );
  const certificate = record(input.verdict.certificate) ?? {};
  const scopeCheck = await sourceScopeCheck(context, input.contract, coveredBy);
  const bindings: ClaimBinding[] = [];
  for (const row of rows) {
    const base = {
      claim_key: row.claim_key,
      ...(row.requirement_id ? { requirement_id: row.requirement_id } : {}),
      ...(row.fact_id ? { fact_id: row.fact_id } : {}),
    };
    if (row.result === "unresolved" || row.result === "incompatible") {
      bindings.push({
        ...base,
        binding: "rejected",
        reason: row.reason ?? "the claim cannot be proved by this certificate",
      });
      continue;
    }
    if (row.result === "attested") {
      bindings.push({ ...base, binding: "attested", scope: "code" });
      continue;
    }
    const obligation = record(row.obligation) ?? {};
    if (input.verdict.evidence_level !== "proved") {
      const recheck = `the certificate did not re-check${input.verdict.certificate_rejection ? `: ${input.verdict.certificate_rejection}` : ""}`;
      // A typecheck claim is decided from the code alone, so when the
      // author's witness fails, lead with what the code breaks (the field
      // that is nullable, the member that is missing) rather than only
      // "the type checker did not accept the witness".
      const codeProblem =
        input.contract.kind === "typecheck" &&
        input.verdict.certificate !== undefined
          ? await derivedProblem(context, input.contract, certificate, row, coveredBy)
          : null;
      bindings.push({
        ...base,
        binding: "rejected",
        obligation,
        reason: codeProblem === null ? recheck : `${codeProblem} (${recheck})`,
      });
      continue;
    }
    const problem =
      (await scopeCheck?.(row)) ??
      (await derivedProblem(context, input.contract, certificate, row, coveredBy));
    const numeric = text(obligation.kind) === "numeric_constraint";
    bindings.push(
      problem === null
        ? {
            ...base,
            binding: "derived",
            scope:
              numeric && !valueSourced
                ? "intent"
                : harnessed
                  ? "harness"
                  : input.contract.kind === "source"
                    ? "source"
                    : "code",
            obligation,
          }
        : { ...base, binding: "rejected", obligation, reason: problem },
    );
  }
  return bindings;
}
