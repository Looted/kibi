/**
 * Evaluator-owned seed content for the scenario-specific fixture setups.
 *
 * The setups in fixture-kb-setup.ts write these documents into the target
 * workspace before the model starts; the evaluator's signal lane reads the
 * same IDs back from the independent final-state receipt. Domains are neutral
 * (fixture family names, client call quotas) so no case leaks a held-out
 * checkout analogue.
 */

/** Entity IDs seeded by `seeded_governed_area_kb`. */
// implements REQ-skillopt-codex-optimization
export const GOVERNED_AREA_IDS = {
  /** Current requirement: names must be non-empty after trimming. */
  current: "REQ-fixture-family-name-v2",
  /** Superseded v1 (closed): names are trimmed. The symbol still implements it. */
  superseded: "REQ-fixture-family-name",
  adr: "ADR-fixture-family-name-nonempty",
  /** Observation fact that contradicts the policy; never governing. */
  observation: "FACT-fixture-family-empty-name-observed",
  test: "TEST-fixture-family-name",
  symbol: "SYM-fixture-family",
} as const;

/** Entity IDs seeded by `seeded_precondition_kb`. */
// implements REQ-skillopt-codex-optimization
export const PRECONDITION_IDS = {
  /** Base requirement compiled to a forbid rule on `call_quota.remaining`. */
  base: "REQ-client-call-quota",
  zeroQuotaFact: "FACT-call-quota-remaining-zero",
  /** Seeded scenario that expects rejection; outside any exception's scope. */
  rejectedScenario: "SCEN-client-call-zero-quota-rejected",
} as const;

/** Entity IDs seeded by `seeded_consistency_kb`. */
// implements REQ-skillopt-codex-optimization
export const CONSISTENCY_IDS = {
  /** One modeled clause plus one ontology-gap clause: analysis incomplete. */
  incomplete: "REQ-call-quota-reset-review",
  /** Fully modeled `remaining >= 0`. */
  nonNegative: "REQ-call-quota-non-negative",
  /** Fully modeled `remaining <= 1000`; compatible with nonNegative. */
  cap: "REQ-call-quota-cap",
  subject: "FACT-call-quota-subject",
  positiveFact: "FACT-call-quota-positive",
  nonNegativeFact: "FACT-call-quota-non-negative",
  capFact: "FACT-call-quota-cap",
  e2eTest: "TEST-call-quota-e2e",
} as const;

/** Prose the precondition setup compiles through compile-intent. */
// implements REQ-skillopt-codex-optimization
export const PRECONDITION_INTENT =
  "A client call may happen only when the call quota remaining is positive.";

/** Prose of the consistency requirements (advisor ledgers are computed live). */
// implements REQ-skillopt-codex-optimization
export const CONSISTENCY_PROSE = {
  incomplete:
    "The remaining call quota must be greater than 0. Every quota reset must be reviewed by an operator.",
  nonNegative: "The remaining call quota must be at least 0.",
  cap: "The remaining call quota must be at most 1000.",
} as const;

/** Every entity a scenario setup seeds; anything else was written by the model. */
// implements REQ-skillopt-codex-optimization
export const SEEDED_ENTITY_IDS: ReadonlySet<string> = new Set([
  "REQ-SETUP-BASE",
  "TEST-SETUP-FIXTURE",
  "SYM-SETUP-FIXTURE",
  ...Object.values(GOVERNED_AREA_IDS),
  ...Object.values(PRECONDITION_IDS),
  ...Object.values(CONSISTENCY_IDS),
]);

// implements REQ-skillopt-codex-optimization
export const GOVERNED_FIXTURE_SOURCE = [
  "// Fixture family names are trimmed and must not be empty.",
  "export function fixtureFamily(name: string): string {",
  "  const trimmed = name.trim();",
  "  if (trimmed.length === 0) {",
  '    throw new Error("fixture family name must not be empty");',
  "  }",
  "  return trimmed;",
  "}",
  "",
].join("\n");

// implements REQ-skillopt-codex-optimization
export const GOVERNED_FIXTURE_TEST = [
  'import { expect, test } from "bun:test";',
  'import { fixtureFamily } from "../src/fixture";',
  "",
  'test("fixture family names are trimmed and must not be empty", () => {',
  '  expect(fixtureFamily("  alpha ")).toBe("alpha");',
  '  expect(() => fixtureFamily("   ")).toThrow();',
  "});",
  "",
].join("\n");

function doc(frontMatter: readonly string[], body = ""): string {
  return ["---", ...frontMatter, "---", body, ""].join("\n");
}

/** Authored `.kb` documents of the governed-area seed, by relative path. */
// implements REQ-skillopt-codex-optimization
export const GOVERNED_AREA_DOCUMENTS: Readonly<Record<string, string>> = {
  [`.kb/requirements/${GOVERNED_AREA_IDS.superseded}.md`]: doc(
    [
      `id: ${GOVERNED_AREA_IDS.superseded}`,
      "title: Fixture family names are trimmed before use",
      "type: req",
      "status: closed",
    ],
    "Fixture family names are trimmed before use.",
  ),
  [`.kb/requirements/${GOVERNED_AREA_IDS.current}.md`]: doc(
    [
      `id: ${GOVERNED_AREA_IDS.current}`,
      "title: Fixture family names must be non-empty after trimming",
      "type: req",
      "status: open",
      "links:",
      "  - type: supersedes",
      `    target: ${GOVERNED_AREA_IDS.superseded}`,
      "  - type: relates_to",
      `    target: ${GOVERNED_AREA_IDS.adr}`,
    ],
    "A fixture family name must be non-empty after trimming. An empty or blank family name is rejected.",
  ),
  [`.kb/adr/${GOVERNED_AREA_IDS.adr}.md`]: doc(
    [
      `id: ${GOVERNED_AREA_IDS.adr}`,
      "title: Reject empty fixture family names",
      "type: adr",
      "status: accepted",
    ],
    [
      "## Decision",
      "",
      "Reject empty fixture family names. An empty name collides with the default bucket and silently merges unrelated fixtures.",
    ].join("\n"),
  ),
  [`.kb/facts/${GOVERNED_AREA_IDS.observation}.md`]: doc(
    [
      `id: ${GOVERNED_AREA_IDS.observation}`,
      "title: An empty fixture family name was once accepted in a support log",
      "type: fact",
      "status: active",
      "fact_kind: observation",
      "tags: [observation]",
    ],
    "A support log shows fixtureFamily accepting an empty family name before the non-empty rule landed.",
  ),
  [`.kb/tests/${GOVERNED_AREA_IDS.test}.md`]: doc([
    `id: ${GOVERNED_AREA_IDS.test}`,
    "title: Fixture family names are trimmed and must not be empty",
    "status: passing",
    "text_ref: tests/fixture-family.test.ts",
    "links:",
    "  - type: validates",
    `    target: ${GOVERNED_AREA_IDS.current}`,
    "verification_scope: unit",
  ]),
  // The symbol still implements the superseded v1: discovery must not read
  // that edge as the current owner.
  ".kb/symbols.yaml": [
    "symbols:",
    `  - id: ${GOVERNED_AREA_IDS.symbol}`,
    "    title: fixtureFamily",
    "    status: active",
    "    sourceFile: src/fixture.ts",
    "    relationships:",
    "      - type: implements",
    `        target: ${GOVERNED_AREA_IDS.superseded}`,
    "      - type: covered_by",
    `        target: ${GOVERNED_AREA_IDS.test}`,
    "",
  ].join("\n"),
};

/** Documents the precondition seed adds after compiling the base rule. */
// implements REQ-skillopt-codex-optimization
export const PRECONDITION_DOCUMENTS: Readonly<Record<string, string>> = {
  [`.kb/facts/${PRECONDITION_IDS.zeroQuotaFact}.md`]: doc([
    `id: ${PRECONDITION_IDS.zeroQuotaFact}`,
    "title: The client's remaining call quota is zero",
    "type: fact",
    "status: active",
    "fact_kind: property_value",
    "subject_key: call_quota",
    "property_key: remaining",
    "operator: eq",
    "value_type: int",
    "value_int: 0",
  ]),
  [`.kb/scenarios/${PRECONDITION_IDS.rejectedScenario}.md`]: doc(
    [
      `id: ${PRECONDITION_IDS.rejectedScenario}`,
      "title: A client call with zero remaining quota is rejected",
      "type: scenario",
      "status: active",
      "expects: rejection",
      "links:",
      "  - type: assumes",
      `    target: ${PRECONDITION_IDS.zeroQuotaFact}`,
    ],
    "Given a client whose remaining call quota is zero, when it makes a call, the call is rejected.",
  ),
};

/** Human provenance stamped on the compiled base requirement. */
// implements REQ-skillopt-codex-optimization
export const PRECONDITION_ORIGIN = [
  "  kind: human",
  "  ref: documentation/requirements/fixture.md",
  "  approved_by: Rate limit owner",
].join("\n");

/** Approval granted to the post-approval exception case (public file). */
// implements REQ-skillopt-codex-optimization
export const PRECONDITION_APPROVED_EXCEPTION = {
  scenario: "A client with zero remaining call quota completes a promo call",
  baseRequirement: PRECONDITION_IDS.base,
  approvedBy: "Dana Lee",
  approvalRef: "DEC-42",
  scope: "the zero-quota promo call scenario only",
} as const;

/** Subject fact shared by the consistency requirements. */
// implements REQ-skillopt-codex-optimization
export const CONSISTENCY_SUBJECT_DOCUMENT = doc([
  `id: ${CONSISTENCY_IDS.subject}`,
  "title: Client call quota",
  "type: fact",
  "status: active",
  "fact_kind: subject",
  "subject_key: client.call_quota",
]);

/** A `client.call_quota.remaining` property fact grounding one claim. */
// implements REQ-skillopt-codex-optimization
export function consistencyValueFact(input: {
  readonly id: string;
  readonly title: string;
  readonly operator: string;
  readonly value: number;
  readonly claimKey: string;
  readonly claimText: string;
}): string {
  return doc([
    `id: ${input.id}`,
    `title: ${input.title}`,
    "type: fact",
    "status: active",
    "fact_kind: property_value",
    "subject_key: client.call_quota",
    "property_key: remaining",
    `operator: ${input.operator}`,
    "value_type: int",
    `value_int: ${input.value}`,
    `claim_key: ${input.claimKey}`,
    `claim_text: ${input.claimText}`,
  ]);
}

/** One semantic-advisor proposition as recorded in a requirement ledger. */
// implements REQ-skillopt-codex-optimization
export type LedgerProposition = Readonly<{
  claim_key: string;
  claim_text: string;
  role: string;
  status: string;
  span: Readonly<{ start: number; end: number }>;
}>;

/** A current requirement carrying the advisor's clause ledger. */
// implements REQ-skillopt-codex-optimization
export function ledgerRequirement(input: {
  readonly id: string;
  readonly title: string;
  readonly prose: string;
  readonly contract: Readonly<{
    version: string;
    source_field: string;
    source_hash: string;
  }>;
  readonly propositions: readonly LedgerProposition[];
  readonly links: readonly Readonly<{ type: string; target: string }>[];
}): string {
  return doc(
    [
      `id: ${input.id}`,
      `title: ${input.title}`,
      "type: req",
      "status: open",
      `semantic_text: ${input.prose}`,
      `semantic_inventory_version: ${input.contract.version}`,
      `semantic_source_field: ${input.contract.source_field}`,
      `semantic_source_hash: ${input.contract.source_hash}`,
      "semantic_inventory:",
      ...input.propositions.flatMap((proposition) => [
        `  - claim_key: ${proposition.claim_key}`,
        `    claim_text: ${proposition.claim_text}`,
        `    role: ${proposition.role}`,
        `    status: ${proposition.status}`,
        `    span: {start: ${proposition.span.start}, end: ${proposition.span.end}}`,
      ]),
      `logic_claims: [${input.propositions.map((p) => p.claim_key).join(", ")}]`,
      "links:",
      ...input.links.flatMap((link) => [
        `  - type: ${link.type}`,
        `    target: ${link.target}`,
      ]),
    ],
    input.prose,
  );
}

// implements REQ-skillopt-codex-optimization
export const CONSISTENCY_E2E_TEST_PATH = "tests/call-quota.e2e.test.ts";

// implements REQ-skillopt-codex-optimization
export const CONSISTENCY_E2E_TEST_SOURCE = [
  'import { expect, test } from "bun:test";',
  "",
  'test("a client with remaining quota may call", () => {',
  "  const remaining = 3;",
  "  expect(remaining > 0).toBe(true);",
  "});",
  "",
].join("\n");

// implements REQ-skillopt-codex-optimization
export const CONSISTENCY_E2E_TEST_DOCUMENT = doc([
  `id: ${CONSISTENCY_IDS.e2eTest}`,
  "title: A client with remaining quota may call",
  "status: passing",
  `text_ref: ${CONSISTENCY_E2E_TEST_PATH}`,
  "links:",
  "  - type: validates",
  `    target: ${CONSISTENCY_IDS.incomplete}`,
  "verification_scope: end_to_end",
]);
