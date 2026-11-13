import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { KbRejection } from "../../../src/cli-errors.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import {
  type SemanticRelationship,
  assertLogicalGroundingClaimKeys,
  assertSemanticInventoryBoundary,
  inventoryIssues,
  semanticInventoryContract,
  stagedLogicalGroundingError,
  validateSemanticInventoryBoundary,
} from "../../../src/operations/semantic-advisor/ingestion-boundary.js";
import type {
  SemanticAdvisorReceipt,
  SemanticProposition,
} from "../../../src/operations/semantic-advisor/types.js";
import type { PrologPort } from "../../../src/public/operations/runtime-types.js";

const VERSION = "kibi.semantic-inventory.v1";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

const TEXT = "A cart holds at most 5 items. Users like it.";
const NORMATIVE = "A cart holds at most 5 items";
const RATIONALE = "Users like it";
const K0 = semanticClaimKey(NORMATIVE);
const K1 = semanticClaimKey(RATIONALE);

const proposition = (
  claimText: string,
  start: number,
  role: SemanticProposition["role"],
  status: SemanticProposition["status"],
): SemanticProposition => ({
  claim_key: semanticClaimKey(claimText),
  claim_text: claimText,
  role,
  status,
  span: { start, end: start + Buffer.byteLength(claimText) },
});

const P0 = proposition(NORMATIVE, 0, "normative", "modeled");
const P1 = proposition(RATIONALE, 30, "rationale", "nonlogical");

const receipt = (
  propositions: readonly SemanticProposition[] = [P0, P1],
): SemanticAdvisorReceipt =>
  ({ propositions }) as unknown as SemanticAdvisorReceipt;

const entry = (p: SemanticProposition, status: string = p.status) => ({
  claim_key: p.claim_key,
  claim_text: p.claim_text,
  role: p.role,
  status,
  span: { start: p.span.start, end: p.span.end },
});

type Props = Record<string, unknown>;

function payload(properties: Props = {}, top: Props = {}) {
  return {
    id: "REQ-1",
    type: "req",
    ...top,
    properties: {
      status: "open",
      semantic_text: TEXT,
      semantic_source_field: "semantic_text",
      semantic_source_hash: sha(TEXT),
      semantic_inventory_version: VERSION,
      semantic_inventory: [entry(P0), entry(P1)],
      logic_claims: [K0],
      ...properties,
    },
  };
}

const GROUNDING: SemanticRelationship[] = [
  { type: "requires_property", from: "REQ-1", to: "FACT-1" },
];

const errorsOf = (
  properties: Props = {},
  relationships: readonly SemanticRelationship[] = GROUNDING,
  propositions: readonly SemanticProposition[] = [P0, P1],
) =>
  validateSemanticInventoryBoundary(
    payload(properties),
    relationships,
    receipt(propositions),
  ).errors;

describe("validateSemanticInventoryBoundary applicability", () => {
  test("a complete inventory passes", () => {
    expect(
      validateSemanticInventoryBoundary(payload(), GROUNDING, receipt()),
    ).toStrictEqual({ applicable: true, errors: [], sourceHash: sha(TEXT) });
  });

  test("applies to current requirements only", () => {
    for (const status of [
      "open",
      "in_progress",
      "closed",
      "active",
      "approved",
      " open ",
    ])
      expect(
        validateSemanticInventoryBoundary(
          payload({ status, semantic_inventory: [] }),
          [],
          receipt(),
        ).applicable,
      ).toBe(true);
    for (const status of ["superseded", "deprecated", undefined]) {
      const result = validateSemanticInventoryBoundary(
        payload({ status, semantic_inventory: [] }),
        [],
        receipt(),
      );
      expect(result).toStrictEqual({
        applicable: false,
        errors: [],
        sourceHash: sha(TEXT),
      });
    }
    expect(
      validateSemanticInventoryBoundary(
        payload({ semantic_inventory: [] }, { type: "fact" }),
        [],
        receipt(),
      ).applicable,
    ).toBe(false);
    expect(
      validateSemanticInventoryBoundary(
        payload({ semantic_inventory: [] }, { type: " req " }),
        [],
        receipt(),
      ).applicable,
    ).toBe(true);
  });

  test("needs prose, and a title only when it holds a normative claim", () => {
    const titleOnly = (title: string, roles: SemanticProposition["role"][]) =>
      validateSemanticInventoryBoundary(
        {
          id: "REQ-1",
          type: "req",
          properties: { status: "open", title },
        },
        [],
        receipt(roles.map((role) => ({ ...P0, role }))),
      );
    expect(titleOnly("", ["normative"])).toStrictEqual({
      applicable: false,
      errors: [],
      sourceHash: sha(""),
    });
    expect(titleOnly("T", ["definition"]).applicable).toBe(false);
    expect(titleOnly("T", ["definition", "normative"]).applicable).toBe(true);
    expect(
      validateSemanticInventoryBoundary(
        { id: "R", type: "req", properties: { status: "open", text_ref: "x" } },
        [],
        receipt([]),
      ).applicable,
    ).toBe(true);
  });
});

describe("validateSemanticInventoryBoundary errors", () => {
  test("version, source field and hash", () => {
    expect(
      errorsOf({
        semantic_inventory_version: "v0",
        semantic_source_field: undefined,
        semantic_source_hash: "x",
      }),
    ).toStrictEqual([
      `semantic_inventory_version must be '${VERSION}'`,
      "semantic_source_field must be 'semantic_text' for the current requirement prose (no semantic_source_field was sent; the prose comes from semantic_text (its front matter value, or the body statement a document without one states). Set semantic_source_field to 'semantic_text' and hash that field's text, or declare one of semantic_text, text_ref or title explicitly)",
      `semantic_source_hash must equal the SHA-256 hash of semantic_text (expected '${sha(TEXT)}')`,
    ]);
  });

  test("the source field derivation names the rule that chose it", () => {
    const fieldError = (properties: Props) =>
      validateSemanticInventoryBoundary(
        {
          id: "REQ-1",
          type: "req",
          properties: { status: "open", ...properties },
        },
        [],
        receipt([{ ...P0, role: "normative" }]),
      ).errors.find((error) => error.startsWith("semantic_source_field"));
    expect(fieldError({ semantic_source_field: "body", text_ref: "r" })).toBe(
      "semantic_source_field must be 'text_ref' for the current requirement prose ('body' is not a semantic source field; the prose comes from text_ref because semantic_text is unset. Set semantic_source_field to 'text_ref' and hash that field's text, or declare one of semantic_text, text_ref or title explicitly)",
    );
    expect(fieldError({ title: "T" })).toBe(
      "semantic_source_field must be 'title' for the current requirement prose (no semantic_source_field was sent; the prose comes from title because semantic_text and text_ref are unset. Set semantic_source_field to 'title' and hash that field's text, or declare one of semantic_text, text_ref or title explicitly)",
    );
  });

  test("a missing inventory and a wrong count", () => {
    expect(errorsOf({ semantic_inventory: undefined }, [])).toStrictEqual([
      "semantic_inventory must contain one entry for every advisor proposition",
      "semantic_inventory must contain exactly 2 proposition(s); received 0",
    ]);
    expect(
      errorsOf({ semantic_inventory: [entry(P0), "x", null, [1]] }, GROUNDING),
    ).toStrictEqual([
      "semantic_inventory must contain exactly 2 proposition(s); received 1",
    ]);
    expect(errorsOf({}, GROUNDING, [P0])).toStrictEqual([
      "semantic_inventory must contain exactly 1 proposition(s); received 2",
    ]);
  });

  test("duplicate keys and spans", () => {
    expect(
      errorsOf({
        semantic_inventory: [entry(P0), entry(P0, "nonlogical")],
      }),
    ).toStrictEqual([
      `semantic_inventory has duplicate claim_key '${K0}'`,
      `semantic_inventory has duplicate span '0:28'`,
      `semantic_inventory[1] does not match advisor proposition '${K1}'`,
      `semantic_inventory[1] assertive role 'normative' cannot use status 'nonlogical'`,
    ]);
  });

  test("a claim key must match its text and a span its exact text", () => {
    expect(
      errorsOf({
        semantic_inventory: [
          { ...entry(P0), claim_key: "CLAIM-X" },
          { ...entry(P1), span: { start: 31, end: 43 } },
        ],
      }),
    ).toStrictEqual([
      `semantic_inventory[0].claim_key must match claim_text (expected '${K0}')`,
      `semantic_inventory[0] does not match advisor proposition '${K0}'`,
      "semantic_inventory[1].span must select its exact claim_text from semantic_text",
      `semantic_inventory[1] does not match advisor proposition '${K1}'`,
    ]);
  });

  test("spans must be whole byte offsets inside the prose", () => {
    const spanError = (span: unknown) =>
      errorsOf({
        semantic_inventory: [{ ...entry(P0), span }, entry(P1)],
      }).filter((error) => error.includes("].span must"));
    const bad = [
      "semantic_inventory[0].span must select its exact claim_text from semantic_text",
    ];
    expect(spanError({ start: 0, end: 28 })).toStrictEqual([]);
    expect(spanError({ start: "0", end: 28 })).toStrictEqual(bad);
    expect(spanError({ start: 0, end: "28" })).toStrictEqual(bad);
    expect(spanError({ start: 0.5, end: 28 })).toStrictEqual(bad);
    expect(spanError({ start: 0, end: 28.5 })).toStrictEqual(bad);
    expect(spanError({ start: -1, end: 28 })).toStrictEqual(bad);
    expect(spanError({ start: 0, end: 0 })).toStrictEqual(bad);
    expect(spanError({ start: 0, end: 999 })).toStrictEqual(bad);
    expect(spanError(null)).toStrictEqual(bad);
    expect(spanError([0, 28])).toStrictEqual(bad);
  });

  test("a span past either end of the prose is refused, not clamped", () => {
    const spanError = (claim_text: string, span: unknown) =>
      errorsOf({
        semantic_inventory: [entry(P0), { ...entry(P1), claim_text, span }],
      }).filter((error) => error.includes("].span must"));
    expect(spanError("Users like it.", { start: 30, end: 44 })).toStrictEqual(
      [],
    );
    expect(spanError("Users like it.", { start: 30, end: 999 })).toStrictEqual([
      "semantic_inventory[1].span must select its exact claim_text from semantic_text",
    ]);
    expect(spanError("", { start: -1, end: 5 })).toStrictEqual([
      "semantic_inventory[1].span must select its exact claim_text from semantic_text",
    ]);
  });

  test("an empty claim at an empty span is still refused", () => {
    expect(
      errorsOf({
        semantic_inventory: [
          { ...entry(P0), claim_text: "", span: { start: 3, end: 3 } },
          entry(P1),
        ],
      }),
    ).toContain(
      "semantic_inventory[0].span must select its exact claim_text from semantic_text",
    );
  });

  test("a span may end at the last byte, multibyte text included", () => {
    const text = "Prices are in €. Users like it.";
    const claim = "Prices are in €";
    const p = proposition(claim, 0, "normative", "modeled");
    const end = Buffer.byteLength(text);
    const last = proposition(
      "Users like it.",
      end - 14,
      "rationale",
      "nonlogical",
    );
    expect(
      validateSemanticInventoryBoundary(
        payload({
          semantic_text: text,
          semantic_source_hash: sha(text),
          semantic_inventory: [entry(p), entry(last)],
          logic_claims: [p.claim_key],
        }),
        GROUNDING,
        receipt([p, last]),
      ).errors,
    ).toStrictEqual([]);
  });

  test("each entry must match the advisor proposition at its index", () => {
    const mismatch = (change: Props) =>
      errorsOf({
        semantic_inventory: [{ ...entry(P0), ...change }, entry(P1)],
      }).filter((error) => error.includes("does not match"));
    const message = [
      `semantic_inventory[0] does not match advisor proposition '${K0}'`,
    ];
    expect(mismatch({ role: "definition" })).toStrictEqual(message);
    expect(mismatch({ span: { start: 0, end: 28 } })).toStrictEqual([]);
    expect(
      errorsOf({ semantic_inventory: [entry(P0), entry(P1)] }, GROUNDING, [
        P0,
        { ...P1, span: { start: 30, end: 44 } },
      ]),
    ).toContain(
      `semantic_inventory[1] does not match advisor proposition '${K1}'`,
    );
    expect(
      errorsOf({ semantic_inventory: [entry(P0), entry(P1)] }, GROUNDING, [
        P0,
        { ...P1, span: { start: 29, end: 43 } },
      ]),
    ).toContain(
      `semantic_inventory[1] does not match advisor proposition '${K1}'`,
    );
    expect(
      errorsOf({ semantic_inventory: [entry(P0), entry(P1)] }, GROUNDING, [
        { ...P0, claim_key: "CLAIM-Y" },
        P1,
      ]),
    ).toContain(
      "semantic_inventory[0] does not match advisor proposition 'CLAIM-Y'",
    );
    expect(
      errorsOf({ semantic_inventory: [entry(P0), entry(P1)] }, GROUNDING, [
        { ...P0, claim_text: "other" },
        P1,
      ]),
    ).toContain(
      `semantic_inventory[0] does not match advisor proposition '${K0}'`,
    );
  });

  test("an earlier advisor's definition role still matches an assertive claim", () => {
    const text = "A cart means a basket.";
    const claim = "A cart means a basket";
    const p = proposition(claim, 0, "normative", "modeled");
    const run = (role: string, advisorRole: SemanticProposition["role"]) =>
      validateSemanticInventoryBoundary(
        payload({
          semantic_text: text,
          semantic_source_hash: sha(text),
          semantic_inventory: [{ ...entry(p), role }],
          logic_claims: advisorRole === "normative" ? [p.claim_key] : [],
        }),
        advisorRole === "normative" ? GROUNDING : [],
        receipt([{ ...p, role: advisorRole }]),
      ).errors;
    expect(run("definition", "normative")).toStrictEqual([]);
    expect(run("rationale", "normative")).toContain(
      `semantic_inventory[0] does not match advisor proposition '${p.claim_key}'`,
    );
    expect(run("definition", "example")).toContain(
      `semantic_inventory[0] does not match advisor proposition '${p.claim_key}'`,
    );
  });

  test("context roles must be nonlogical and assertive roles must not", () => {
    expect(
      errorsOf({
        semantic_inventory: [entry(P0), entry(P1, "modeled")],
      }),
    ).toStrictEqual([
      "semantic_inventory[1] role 'rationale' must use status 'nonlogical'",
      "modeled semantic_inventory entries (2) must equal logical grounding relationships (1) [requires_property->FACT-1]",
    ]);
    for (const role of ["example", "subjective"] as const) {
      const p = { ...P1, role };
      expect(
        errorsOf(
          { semantic_inventory: [entry(P0), entry(p, "proposed")] },
          GROUNDING,
          [P0, p],
        ),
      ).toStrictEqual([
        `semantic_inventory[1] role '${role}' must use status 'nonlogical'`,
      ]);
    }
  });

  test("logic claims must list exactly the assertive claim keys", () => {
    const message =
      "logic_claims must contain exactly every assertive semantic_inventory claim_key";
    expect(errorsOf({ logic_claims: [K0, 3] })).toStrictEqual([]);
    expect(errorsOf({ logic_claims: [] })).toStrictEqual([message]);
    expect(errorsOf({ logic_claims: "x" })).toStrictEqual([message]);
    expect(errorsOf({ logic_claims: [K1] })).toStrictEqual([message]);
    expect(errorsOf({ logic_claims: [K0, K1] })).toStrictEqual([message]);
    const second = { ...P0, claim_key: "CLAIM-2" };
    const logic = (
      logic_claims: unknown,
      propositions: SemanticProposition[],
    ) =>
      errorsOf({ logic_claims }, GROUNDING, propositions).filter((error) =>
        error.startsWith("logic_claims"),
      );
    expect(logic([K0, "CLAIM-3"], [P0, second])).toStrictEqual([message]);
    expect(logic([K0, "CLAIM-2"], [P0, second])).toStrictEqual([]);
    expect(logic(undefined, [P1])).toStrictEqual([]);
  });

  test("modeled entries must equal the logical grounding links", () => {
    const relationships: SemanticRelationship[] = [
      { type: "requires_property", from: "REQ-1", to: "FACT-1" },
      { type: "requires_predicate", from: "REQ-1", to: "FACT-2" },
      { type: "requires_rule", from: "REQ-1", to: "RULE-3" },
      { type: "relates_to", from: "REQ-1", to: "FACT-4" },
      { type: "requires_property", from: "REQ-2", to: "FACT-5" },
    ];
    expect(errorsOf({}, relationships)).toStrictEqual([
      "modeled semantic_inventory entries (1) must equal logical grounding relationships (3) [requires_property->FACT-1, requires_predicate->FACT-2, requires_rule->RULE-3]",
    ]);
    expect(errorsOf({}, [])).toStrictEqual([
      "modeled semantic_inventory entries (1) must equal logical grounding relationships (0)",
    ]);
  });
});

describe("semanticInventoryContract", () => {
  test("restates the advisor ledger, keeping statuses the payload sent", () => {
    expect(
      semanticInventoryContract(
        payload({
          semantic_inventory: [
            entry(P0, "proposed"),
            { ...entry(P1), claim_key: "CLAIM-OTHER", status: "modeled" },
            { claim_key: K1, status: "" },
          ],
        }),
        receipt(),
      ),
    ).toStrictEqual({
      semantic_inventory_version: VERSION,
      semantic_source_field: "semantic_text",
      semantic_source_hash: sha(TEXT),
      semantic_inventory: [{ ...entry(P0, "proposed") }, { ...entry(P1) }],
      logic_claims: [K0],
    });
  });
});

describe("assertSemanticInventoryBoundary", () => {
  test("passes silently when the inventory is complete", () => {
    expect(
      assertSemanticInventoryBoundary(payload(), GROUNDING, receipt()),
    ).toBe(undefined);
  });

  test("rejects with every error, the contract and the issues", () => {
    const bad = payload({ semantic_source_hash: "x" });
    let error: unknown;
    try {
      assertSemanticInventoryBoundary(bad, GROUNDING, receipt());
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(KbRejection);
    const rejection = error as KbRejection;
    expect(rejection.code).toBe("INCOMPLETE_PROPOSITIONS");
    expect(rejection.message).toBe(
      `Proposition-complete ingestion failed: semantic_source_hash must equal the SHA-256 hash of semantic_text (expected '${sha(TEXT)}'). The contract kb_model mode analyze returns for this prose, to merge into properties and resend (a claim marked modeled needs one requires_property, requires_predicate or requires_rule link to a fact with its claim_key; otherwise keep the advisor's status): ${JSON.stringify(semanticInventoryContract(bad, receipt()))}`,
    );
    expect(rejection.issues).toStrictEqual([
      { rule: "source_hash", field: "semantic_source_hash" },
    ]);
  });

  test("joins several errors with semicolons", () => {
    let error: unknown;
    try {
      assertSemanticInventoryBoundary(
        payload({ semantic_source_hash: "x", logic_claims: [] }),
        GROUNDING,
        receipt(),
      );
    } catch (caught) {
      error = caught;
    }
    expect((error as Error).message).toStartWith(
      `Proposition-complete ingestion failed: semantic_source_hash must equal the SHA-256 hash of semantic_text (expected '${sha(TEXT)}'); logic_claims must contain exactly`,
    );
  });
});

describe("inventoryIssues", () => {
  test("a missing inventory is one issue", () => {
    expect(
      inventoryIssues(payload({ semantic_inventory: undefined }), ["a", "b"]),
    ).toStrictEqual([
      { rule: "inventory_missing", field: "semantic_inventory" },
    ]);
  });

  test("each error maps to its fixed rule", () => {
    const errors = [
      "semantic_inventory_version must be x",
      "semantic_source_field must be x",
      "semantic_source_hash must equal x",
      "semantic_inventory must contain exactly 2",
      "semantic_inventory has duplicate claim_key 'x'",
      "semantic_inventory has duplicate span '1:2'",
      "semantic_inventory[12].claim_key must match",
      "semantic_inventory[3].span must select",
      "semantic_inventory[4] does not match advisor",
      "semantic_inventory[5] role 'rationale' must",
      "semantic_inventory[6] assertive role 'x' cannot",
      "logic_claims must contain",
      "modeled semantic_inventory entries (1)",
      "semantic_inventory must contain one entry",
      "x semantic_inventory_version must",
      "x semantic_source_field must",
      "x semantic_source_hash must",
      "x semantic_inventory must contain exactly",
      "x semantic_inventory has duplicate claim_key",
      "x semantic_inventory has duplicate span",
      "x semantic_inventory[1].claim_key must",
      "x semantic_inventory[1].span must",
      "x semantic_inventory[1] does not match",
      "x semantic_inventory[1] role",
      "x logic_claims must",
      "x modeled semantic_inventory entries",
      "semantic_inventory[12].span must",
      "semantic_inventory[12] does not match",
      "semantic_inventory[12] role 'x'",
      "semantic_inventory[x].claim_key must",
      "semantic_inventory[].span must",
      "semantic_inventory[1] other role",
    ];
    expect(inventoryIssues(payload(), errors)).toStrictEqual([
      { rule: "inventory_version", field: "semantic_inventory_version" },
      { rule: "source_field", field: "semantic_source_field" },
      { rule: "source_hash", field: "semantic_source_hash" },
      { rule: "inventory_count", field: "semantic_inventory" },
      {
        rule: "duplicate_claim_key",
        field: "semantic_inventory.*.claim_key",
      },
      { rule: "duplicate_span", field: "semantic_inventory.*.span" },
      { rule: "claim_key_mismatch", field: "semantic_inventory.*.claim_key" },
      { rule: "span_mismatch", field: "semantic_inventory.*.span" },
      { rule: "proposition_mismatch", field: "semantic_inventory" },
      { rule: "context_role_status", field: "semantic_inventory.*.status" },
      { rule: "context_role_status", field: "semantic_inventory.*.status" },
      { rule: "logic_claims_mismatch", field: "logic_claims" },
      { rule: "grounding_count", field: "relationships" },
      { rule: "inventory_other" },
      { rule: "inventory_other" },
      ...Array.from({ length: 11 }, () => ({ rule: "inventory_other" })),
      { rule: "span_mismatch", field: "semantic_inventory.*.span" },
      { rule: "proposition_mismatch", field: "semantic_inventory" },
      { rule: "context_role_status", field: "semantic_inventory.*.status" },
      { rule: "inventory_other" },
      { rule: "inventory_other" },
      { rule: "inventory_other" },
    ]);
  });
});

const modeledPayload = (
  keys: readonly string[],
  properties: Props = {},
  top: Props = {},
) =>
  payload(
    {
      semantic_inventory: [
        ...keys.map((claim_key) => ({ claim_key, status: "modeled" })),
        { claim_key: "CLAIM-OPEN", status: "proposed" },
      ],
      ...properties,
    },
    top,
  );

const links = (...targets: string[]): SemanticRelationship[] => [
  ...targets.map((to) => ({ type: "requires_property", from: "REQ-1", to })),
  { type: "relates_to", from: "REQ-1", to: "IGNORED" },
  { type: "requires_rule", from: "REQ-9", to: "IGNORED" },
];

const fact = (claimKey?: unknown) =>
  claimKey === undefined
    ? { type: "fact" }
    : { type: "fact", claim_key: claimKey };

const MISMATCH_TAIL =
  "A claim_key is derived from the clause text, so reworded prose (or prose analyzed from a field other than the stored semantic_text) yields new keys. Keep the stored semantic_text wording, or kb_upsert each grounding fact with the new claim_key and claim_text (same fact id) before this write; for a change of meaning, supersede the requirement instead.";

describe("stagedLogicalGroundingError", () => {
  test("is silent for non-requirements and older inventories", () => {
    const planned = new Map([["F1", fact("X")]]);
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A"], {}, { type: "fact" }),
        links("F1"),
        planned,
      ),
    ).toBe(null);
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A"], { semantic_inventory_version: "v0" }),
        links("F1"),
        planned,
      ),
    ).toBe(null);
  });

  test("defers to the write-time check for a target outside the plan", () => {
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A", "B"]),
        links("F1", "F2"),
        new Map([["F1", fact("X")]]),
      ),
    ).toBe(null);
  });

  test("passes when every modeled key is grounded once", () => {
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A", "B"]),
        links("F1", "F2"),
        new Map([
          ["F1", fact(" B ")],
          ["F2", fact("A")],
        ]),
      ),
    ).toBe(null);
    expect(
      stagedLogicalGroundingError(
        payload({ semantic_inventory: "x" }),
        [],
        new Map(),
      ),
    ).toBe(null);
  });

  test("a grounding target must declare a claim key", () => {
    const missing =
      "Proposition-complete ingestion failed: logical grounding target 'F2' must declare a claim_key: it is a fact without the claim_key of the claim it grounds. Set the claim_key the kb_compile_intent plan's fact step gives it.";
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A", "B"]),
        links("F1", "F2"),
        new Map([
          ["F1", fact("A")],
          ["F2", fact()],
        ]),
      ),
    ).toBe(missing);
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A", "B"]),
        links("F1", "F2"),
        new Map<string, Record<string, unknown>>([
          ["F1", fact("A")],
          ["F2", { type: "req", claim_key: "B" }],
        ]),
      ),
    ).toBe(missing);
  });

  test("a claim grounded twice is refused", () => {
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A"]),
        links("F1", "F2", "F3"),
        new Map([
          ["F1", fact("B")],
          ["F2", fact("A")],
          ["F3", fact("A")],
        ]),
      ),
    ).toBe(
      "Proposition-complete ingestion failed: claim 'A' has more than one logical grounding relationship.",
    );
  });

  test("a key mismatch names both sides", () => {
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A", "B"]),
        links("F1", "F2"),
        new Map([
          ["F1", fact("A")],
          ["F2", fact("C")],
        ]),
      ),
    ).toBe(
      `Proposition-complete ingestion failed: modeled proposition claim_keys must match logical grounding target claim_keys exactly. Modeled claims with no grounding fact declaring their claim_key: 'B'. Grounding facts whose claim_key the inventory no longer models: F2 ('C'). ${MISMATCH_TAIL}`,
    );
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A", "B"]),
        links("F1"),
        new Map([["F1", fact("A")]]),
      ),
    ).toBe(
      `Proposition-complete ingestion failed: modeled proposition claim_keys must match logical grounding target claim_keys exactly. Modeled claims with no grounding fact declaring their claim_key: 'B'. ${MISMATCH_TAIL}`,
    );
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A"]),
        links("F1", "F2"),
        new Map([
          ["F1", fact("A")],
          ["F2", fact("C")],
        ]),
      ),
    ).toBe(
      `Proposition-complete ingestion failed: modeled proposition claim_keys must match logical grounding target claim_keys exactly. Grounding facts whose claim_key the inventory no longer models: F2 ('C'). ${MISMATCH_TAIL}`,
    );
    expect(
      stagedLogicalGroundingError(
        modeledPayload(["A", "B", "D"]),
        links("F1", "F2", "F3"),
        new Map([
          ["F1", fact("A")],
          ["F2", fact("C")],
          ["F3", fact("E")],
        ]),
      ),
    ).toBe(
      `Proposition-complete ingestion failed: modeled proposition claim_keys must match logical grounding target claim_keys exactly. Modeled claims with no grounding fact declaring their claim_key: 'B', 'D'. Grounding facts whose claim_key the inventory no longer models: F2 ('C'), F3 ('E'). ${MISMATCH_TAIL}`,
    );
  });
});

type Query = (goal: string) => {
  success: boolean;
  bindings: Record<string, unknown>;
};

function prologOf(answer: Query) {
  const goals: string[] = [];
  return {
    goals,
    port: {
      query: async (goal: string) => {
        goals.push(goal);
        return answer(goal);
      },
    } as unknown as PrologPort,
  };
}

const rejection = async (promise: Promise<void>) => {
  try {
    await promise;
  } catch (error) {
    return error as KbRejection;
  }
  throw new Error("expected a rejection");
};

describe("assertLogicalGroundingClaimKeys", () => {
  test("does nothing for payloads without a current inventory", async () => {
    const { goals, port } = prologOf(() => ({ success: false, bindings: {} }));
    await assertLogicalGroundingClaimKeys(
      port,
      modeledPayload(["A"], {}, { type: "fact" }),
      links("F1"),
    );
    expect(goals).toStrictEqual([]);
  });

  test("reads stored claim keys, quoted or not", async () => {
    const keys: Record<string, string> = {
      F1: "'A'",
      F2: '"B"',
      F3: "C",
      F4: "'D\"E'",
    };
    const { goals, port } = prologOf((goal) => {
      const target = Object.keys(keys).find((id) => goal.includes(`'${id}'`));
      return { success: true, bindings: { ClaimKey: keys[target as string] } };
    });
    await assertLogicalGroundingClaimKeys(
      port,
      modeledPayload(["A", "B", "C", 'D"E']),
      links("F1", "F2", "F3", "F4"),
    );
    expect(goals).toStrictEqual([
      "once((kb_entity('F1', fact, _SemanticGroundProps), memberchk(claim_key=_SemanticGroundRaw, _SemanticGroundProps), normalize_term_atom(_SemanticGroundRaw, ClaimKey)))",
      "once((kb_entity('F2', fact, _SemanticGroundProps), memberchk(claim_key=_SemanticGroundRaw, _SemanticGroundProps), normalize_term_atom(_SemanticGroundRaw, ClaimKey)))",
      "once((kb_entity('F3', fact, _SemanticGroundProps), memberchk(claim_key=_SemanticGroundRaw, _SemanticGroundProps), normalize_term_atom(_SemanticGroundRaw, ClaimKey)))",
      "once((kb_entity('F4', fact, _SemanticGroundProps), memberchk(claim_key=_SemanticGroundRaw, _SemanticGroundProps), normalize_term_atom(_SemanticGroundRaw, ClaimKey)))",
    ]);
  });

  test("escapes target atoms", async () => {
    const { goals, port } = prologOf(() => ({
      success: true,
      bindings: { ClaimKey: "A" },
    }));
    await assertLogicalGroundingClaimKeys(
      port,
      modeledPayload(["A"]),
      links("F'1"),
    );
    expect(goals[0]).toContain("kb_entity('F''1', fact,");
  });

  test("a planned fact is read from the staged write", async () => {
    const { goals, port } = prologOf(() => ({
      success: true,
      bindings: { ClaimKey: "B" },
    }));
    await assertLogicalGroundingClaimKeys(
      port,
      modeledPayload(["A", "B"]),
      links("F1", "F2"),
      { entities: new Map([["F1", fact("A")]]) },
    );
    expect(goals).toHaveLength(1);
    expect(goals[0]).toContain("'F2'");
  });

  test("a target that is not stored names the plan step to run", async () => {
    const { goals, port } = prologOf(() => ({ success: false, bindings: {} }));
    const error = await rejection(
      assertLogicalGroundingClaimKeys(port, modeledPayload(["A"]), links("F1")),
    );
    expect(error).toBeInstanceOf(KbRejection);
    expect(error.code).toBe("INCOMPLETE_PROPOSITIONS");
    expect(error.message).toBe(
      "Proposition-complete ingestion failed: logical grounding target 'F1' does not exist yet. Write the fact first: the kb_compile_intent plan has an earlier fact step for 'F1' that carries its claim_key; run that step before this one, or apply the whole plan with kb_apply_plan.",
    );
    expect(error.issues).toStrictEqual([
      { rule: "grounding_fact_missing", field: "relationships.*.to" },
    ]);
    expect(goals[1]).toBe("once(kb_entity('F1', _, _))");
  });

  test("a stored target without a key stops at the first one", async () => {
    const { goals, port } = prologOf((goal) =>
      goal.startsWith("once(kb_entity(")
        ? { success: true, bindings: {} }
        : { success: true, bindings: { ClaimKey: "''" } },
    );
    const error = await rejection(
      assertLogicalGroundingClaimKeys(
        port,
        modeledPayload(["A", "B"]),
        links("F1", "F2"),
      ),
    );
    expect(error.message).toBe(
      "Proposition-complete ingestion failed: logical grounding target 'F1' must declare a claim_key: it is a fact without the claim_key of the claim it grounds. Set the claim_key the kb_compile_intent plan's fact step gives it.",
    );
    expect(error.issues).toStrictEqual([
      { rule: "grounding_claim_key_missing", field: "claim_key" },
    ]);
    expect(goals).toHaveLength(2);
  });

  test("a failed key read of a stored fact is a missing key", async () => {
    const { port } = prologOf((goal) =>
      goal.startsWith("once(kb_entity(")
        ? { success: true, bindings: {} }
        : { success: false, bindings: { ClaimKey: "A" } },
    );
    const error = await rejection(
      assertLogicalGroundingClaimKeys(port, modeledPayload(["A"]), links("F1")),
    );
    expect(error.issues).toStrictEqual([
      { rule: "grounding_claim_key_missing", field: "claim_key" },
    ]);
  });

  test("a staged fact without a key is reported without asking the engine", async () => {
    const { goals, port } = prologOf(() => ({
      success: true,
      bindings: { ClaimKey: "B" },
    }));
    const error = await rejection(
      assertLogicalGroundingClaimKeys(
        port,
        modeledPayload(["A", "B"]),
        links("F1", "F2"),
        { entities: new Map([["F1", fact()]]) },
      ),
    );
    expect(error.issues).toStrictEqual([
      { rule: "grounding_claim_key_missing", field: "claim_key" },
    ]);
    expect(goals).toStrictEqual([]);
  });

  test("duplicate and mismatched groundings carry their issues", async () => {
    const answer = (key: Record<string, string>) => (goal: string) => {
      const target = Object.keys(key).find((id) => goal.includes(`'${id}'`));
      return { success: true, bindings: { ClaimKey: key[target as string] } };
    };
    const duplicate = prologOf(answer({ F1: "A", F2: "A" }));
    const dupError = await rejection(
      assertLogicalGroundingClaimKeys(
        duplicate.port,
        modeledPayload(["A"]),
        links("F1", "F2"),
      ),
    );
    expect(dupError.message).toBe(
      "Proposition-complete ingestion failed: claim 'A' has more than one logical grounding relationship.",
    );
    expect(dupError.issues).toStrictEqual([
      { rule: "duplicate_grounding", field: "relationships" },
    ]);
    const mismatch = prologOf(answer({ F1: "B" }));
    const misError = await rejection(
      assertLogicalGroundingClaimKeys(
        mismatch.port,
        modeledPayload(["A"]),
        links("F1"),
      ),
    );
    expect(misError.code).toBe("INCOMPLETE_PROPOSITIONS");
    expect(misError.issues).toStrictEqual([
      { rule: "grounding_claim_key_mismatch", field: "claim_key" },
    ]);
  });
});
