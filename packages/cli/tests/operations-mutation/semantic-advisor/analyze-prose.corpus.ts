import { spyOn } from "bun:test";
import { utf8Span } from "../../../src/logic/ir.js";
import * as receipt from "../../../src/operations/semantic-advisor/analysis-receipt.js";
import { analyzeSemanticAdvisorInput } from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import { detectConditionalRule } from "../../../src/operations/semantic-advisor/conditional-rules.js";
import type { SemanticAdvisorInput } from "../../../src/operations/semantic-advisor/types.js";

/**
 * Advisor inputs whose analysis is pinned in analyze-prose.golden.json: one
 * or more per suggestion lane, modeling check, interpretation check and span
 * rule of analyze-prose.ts.
 */

type Interpretation = NonNullable<
  SemanticAdvisorInput["interpretations"]
>[number];

const req = (
  text: string,
  extra: Record<string, unknown> = {},
  rest: Record<string, unknown> = {},
): SemanticAdvisorInput => ({
  payload: {
    type: "req",
    id: "REQ-X",
    properties: { title: "T", status: "open", semantic_text: text, ...extra },
    ...rest,
  },
});

const RULE_TEXT = "Checkout may happen only when the cart total is positive.";
const ruleIr = (text: string) => {
  const match = detectConditionalRule(text);
  if (match?.kind !== "rule") throw new Error(`no rule for ${text}`);
  return match.ir;
};
const IR = ruleIr(RULE_TEXT);
const OTHER_IR = ruleIr(
  "Refunds may happen only when the order total is positive.",
);

const LOGS = "The system must retain audit logs.";
const LOGS_CLAIM = "The system must retain audit logs";
const LOGS_KEY = semanticClaimKey(LOGS);
const span = (prose: string, claim: string) => {
  const start = prose.indexOf(claim);
  return utf8Span(prose, start, start + claim.length);
};
const interpretation = (extra: Partial<Interpretation> = {}): Interpretation =>
  ({
    claim_key: LOGS_KEY,
    claim_text: LOGS_CLAIM,
    ir: IR,
    confidence: 0.9,
    ...extra,
  }) as Interpretation;
const interpreted = (...interpretations: Interpretation[]) => ({
  ...req(LOGS),
  interpretations,
});

const TWO = "Admins must log out. Users must log in.";
const TWO_KEYS = TWO.split(". ").map(semanticClaimKey);
const modeled = (
  relationships: unknown,
  inventory: unknown,
  logicClaims: unknown = TWO_KEYS,
) =>
  req(
    TWO,
    { logic_claims: logicClaims, semantic_inventory: inventory },
    { relationships },
  );
const grounding = (type: string) => ({ type, from: "REQ-X", to: "FACT-1" });
const modeledEntry = (claimKey: string, status = "modeled") => ({
  claim_key: claimKey,
  status,
});
const BOTH_MODELED = TWO_KEYS.map((key) => modeledEntry(key));
const PREDICATES = [
  grounding("requires_predicate"),
  grounding("requires_rule"),
];

export const CASES: Record<string, SemanticAdvisorInput> = {
  "ambiguous cardinality": req(
    "Users must keep 12 active sessions. Admins must keep one session. Guests must keep two sessions. Bots must keep 1 active session.",
  ),
  "cardinality with an operator": req(
    "Users must keep at least 3 sessions. Admins must keep at most 2 sessions. Guests must keep exactly 1 session. Bots must keep no more than 4 sessions. Testers must keep up to 5 sessions.",
  ),
  "rate limit": req(
    "Logins are rate limited to 15 login attempts per minute. Exports are rate limited to 5 exports per day.",
  ),
  "catalog predicate": req("Users cannot delete posts unless they own them."),
  "catalog predicate without an id": {
    payload: {
      type: "req",
      properties: {
        title: "T",
        status: "open",
        semantic_text: "Users cannot delete posts unless they own them.",
      },
    },
  },
  "only-when rule": req(RULE_TEXT),
  "must-not-unless rule": req(
    "Checkout must not happen unless the cart total is positive.",
  ),
  "scoped rule": req(
    "In the EU, checkout may happen only when the cart total is positive.",
  ),
  "rule without an id": {
    payload: {
      type: "req",
      properties: { title: "T", semantic_text: RULE_TEXT },
    },
  },
  "untranslatable conditional": req(
    "Checkout may happen only when the cart total is positive and the user is verified.",
  ),
  "ungrounded normative clause": req(LOGS),
  "strict property": req("Users must keep at most 3 active sessions."),
  "strict property beside context": req(
    "Users must keep at most 3 active sessions. Because operators need auditability, exports are logged. For example, a demo tenant may skip review. Reviewers feel comfortable when the page looks complete.",
  ),
  "polarity, order and time cues": req("Exports are prohibited before noon."),
  "description only": {
    payload: {
      type: "req",
      id: "REQ-X",
      properties: { description: "Users must keep at most 3 active sessions." },
    },
  },
  "context and description": req(
    "Because operators need auditability, exports are logged. For example, a demo tenant may skip review. Reviewers feel comfortable when the page looks complete. The editor lists every note that refers to the clip.",
  ),
  "several clauses with declared claims": req(
    "Users must keep 12 active sessions. Logins are rate limited to 15 login attempts per minute. The system must retain audit logs. Because operators need auditability, exports are logged.",
    { logic_claims: ["CLAIM-OLD", 5, LOGS_KEY] },
  ),
  "title read on its own line": req("At most 3 sessions are allowed.", {
    title: "Limit",
  }),
  "text_ref prose": {
    payload: {
      type: "req",
      id: "REQ-X",
      properties: {
        title: "T",
        status: "open",
        text_ref: "Every export must include 3 audit fields.",
        description: "Exports are logged.",
      },
    },
  },
  "text_ref beside semantic_text": req(LOGS, {
    text_ref: "docs/logs.md#retain-4",
    description: "Kept 9 years.",
  }),
  "not a requirement": {
    payload: {
      type: "test",
      id: "TEST-1",
      properties: { title: "Users must keep 12 active sessions." },
    },
  },
  "no prose": { payload: { type: "req", id: "REQ-X", properties: {} } },
  "supplied clauses out of prose order": {
    ...req(
      "Admins must log out. Guests must sign up. Users must log in. Guests must sign up.",
    ),
    clauses: [
      "Users must log in",
      "Admins must log out",
      "Guests must sign up",
    ],
  },
  "supplied clause with regex characters": {
    ...req("Fees must stay below 5.00 (USD) per order."),
    clauses: ["Fees must stay below 5.00 (USD) per order"],
  },
  "valid interpretation": interpreted(
    interpretation({ span: span(LOGS, LOGS_CLAIM) }),
  ),
  "interpretation with its own rule schema": interpreted(
    interpretation({ ir: { ...IR, ruleSchemaId: "FACT-RULE-SCHEMA-CUSTOM" } }),
  ),
  "the same interpretation twice": interpreted(
    interpretation(),
    interpretation({ confidence: undefined }),
  ),
  "conflicting interpretations": interpreted(
    interpretation({ confidence: -1 }),
    interpretation({ ir: OTHER_IR, confidence: 2 }),
  ),
  "more than three interpretations": interpreted(
    interpretation(),
    interpretation(),
    interpretation(),
    interpretation({ ir: OTHER_IR }),
  ),
  "interpretations that do not fit the prose": interpreted(
    interpretation({ claim_key: "CLAIM-UNKNOWN" }),
    interpretation({ claim_text: "The system must delete audit logs" }),
    interpretation({ claim_text: "The system must retain audit logs!" }),
  ),
  "interpretation spans": interpreted(
    interpretation({ span: { start: -1, end: 4 } }),
    interpretation({ span: { start: 4, end: 2 } }),
    interpretation({ span: { start: 0, end: 4 } }),
  ),
  "interpretation span checks": interpreted(
    interpretation({ span: { start: 1, end: 34 } }),
    interpretation({ span: { start: 0, end: 33 } }),
    interpretation({
      claim_text: "The  system must retain\naudit logs",
      span: span(LOGS, LOGS_CLAIM),
    }),
  ),
  "more interpretation spans": interpreted(
    interpretation({ span: { start: 5, end: 5 } }),
    interpretation({ span: { start: 1, end: 33 } }),
    interpretation({
      claim_text: " The system must retain audit logs ",
      span: span(LOGS, LOGS_CLAIM),
    }),
  ),
  "interpretation of a later clause": {
    ...req(TWO),
    interpretations: [
      interpretation({
        claim_key: TWO_KEYS[1] as string,
        claim_text: "Users must log in",
        span: span(TWO, "Users must log in"),
      }),
    ],
  },
  "interpretation of other text with a span": interpreted(
    interpretation({
      claim_text: "The system must delete audit logs",
      span: { start: 0, end: 33 },
    }),
  ),
  "invalid interpretation": interpreted(
    interpretation({ ir: {} as Interpretation["ir"] }),
  ),
};

/** Inputs whose only pinned outcome is whether they count as modeled. */
export const MODELING_CASES: Record<string, SemanticAdvisorInput> = {
  "modeled by predicate and rule": modeled(PREDICATES, BOTH_MODELED),
  "modeled by predicates": modeled(
    [grounding("requires_predicate"), grounding("requires_predicate")],
    BOTH_MODELED,
  ),
  "modeled by rules": modeled(
    [grounding("requires_rule"), grounding("requires_rule")],
    BOTH_MODELED,
  ),
  "modeled by strict properties": modeled(
    [
      grounding("constrains"),
      grounding("requires_property"),
      grounding("requires_property"),
    ],
    BOTH_MODELED,
  ),
  "property grounding without its subject": modeled(
    [grounding("requires_property"), grounding("requires_property")],
    BOTH_MODELED,
  ),
  "one grounding too many": modeled(
    [...PREDICATES, grounding("requires_predicate")],
    BOTH_MODELED,
  ),
  "one grounding too few": modeled(
    [grounding("constrains"), grounding("requires_predicate")],
    BOTH_MODELED,
  ),
  "a claim not modeled": modeled(PREDICATES, [
    modeledEntry(TWO_KEYS[0] as string),
    modeledEntry(TWO_KEYS[1] as string, "missing"),
  ]),
  "an extra modeled claim": modeled(PREDICATES, [
    ...BOTH_MODELED,
    modeledEntry("CLAIM-OTHER"),
  ]),
  "a modeled claim of other prose": modeled(PREDICATES, [
    modeledEntry(TWO_KEYS[0] as string),
    modeledEntry("CLAIM-OTHER"),
  ]),
  "a claim not declared": modeled(PREDICATES, BOTH_MODELED, [TWO_KEYS[0]]),
  "malformed groundings and inventory": modeled(
    [null, "requires_rule", ...PREDICATES],
    [null, 7, ...BOTH_MODELED],
  ),
  "groundings and inventory that are not lists": modeled(
    "requires_rule",
    "modeled",
  ),
  "context prose with a grounding": req(
    "Because operators need auditability, exports are logged.",
    {},
    { relationships: [grounding("requires_predicate")] },
  ),
};

/**
 * Analyze `input` and return, as plain JSON, everything analyze-prose.ts
 * hands to the receipt builder plus its own warnings.
 */
export function analyzeCapturing(input: SemanticAdvisorInput): unknown {
  let captured: Record<string, unknown> = {};
  const spy = spyOn(receipt, "buildAdvisorResult").mockImplementation(((
    _payload: unknown,
    signals: unknown,
    modeled: unknown,
    suggestions: unknown,
    _clauses: unknown,
    propositions: unknown,
    interpretations: unknown,
    shadow: unknown,
  ) => {
    captured = {
      signals,
      modeled,
      suggestions,
      propositions,
      interpretations,
      shadow,
    };
    return { receipt: {}, warnings: ["receipt warning"] };
  }) as never);
  try {
    const { warnings } = analyzeSemanticAdvisorInput(input);
    return JSON.parse(JSON.stringify({ ...captured, warnings }));
  } finally {
    spy.mockRestore();
  }
}
