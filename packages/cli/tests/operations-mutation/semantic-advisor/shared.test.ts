import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { previewCases } from "../../../src/operations/semantic-advisor/case-preview.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import {
  SEMANTIC_INVENTORY_VERSION,
  canonicalize,
  isRecord,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  payloadHash,
  predicateSuggestion,
  propertiesOf,
  relationship,
  semanticClausesOf,
  semanticSourceHash,
  semanticSourceOf,
  shortHash,
  singularize,
  singularizeToken,
  sourceOf,
  statementOf,
  strictSuggestion,
  stringValue,
} from "../../../src/operations/semantic-advisor/shared.js";
import type { SemanticStrictPropertyClaim } from "../../../src/operations/semantic-advisor/types.js";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("value helpers", () => {
  test("isRecord accepts plain objects only", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });

  test("stringValue trims strings and blanks anything else", () => {
    expect(stringValue("  a b  ")).toBe("a b");
    expect(stringValue(3)).toBe("");
    expect(stringValue(undefined)).toBe("");
  });

  test("canonicalize sorts object keys at every depth", () => {
    expect(canonicalize({ b: 1, a: [{ d: "x", c: null }, 2] })).toBe(
      '{"a":[{"c":null,"d":"x"},2],"b":1}',
    );
    expect(canonicalize([])).toBe("[]");
    expect(canonicalize({})).toBe("{}");
    expect(canonicalize("s")).toBe('"s"');
    expect(canonicalize({ 'a"': 1 })).toBe('{"a\\"":1}');
  });

  test("payloadHash ignores underscore keys and key order", () => {
    expect(payloadHash({ b: 1, a: 2, _c: 3 })).toBe(sha('{"a":2,"b":1}'));
    expect(payloadHash({ a_: 1 })).toBe(sha('{"a_":1}'));
  });

  test("hash helpers", () => {
    expect(semanticSourceHash("abc")).toBe(sha("abc"));
    expect(shortHash("abc")).toBe(sha("abc").slice(0, 12));
    expect(SEMANTIC_INVENTORY_VERSION).toBe("kibi.semantic-inventory.v1");
  });

  test("relationship builds a typed edge", () => {
    expect(relationship("A", "B", "relates_to")).toStrictEqual({
      type: "relates_to",
      from: "A",
      to: "B",
    });
  });
});

describe("payload readers", () => {
  test("propertiesOf reads a record or nothing", () => {
    expect(propertiesOf({ properties: { a: 1 } })).toStrictEqual({ a: 1 });
    expect(propertiesOf({ properties: [1] })).toStrictEqual({});
    expect(propertiesOf({})).toStrictEqual({});
  });

  test("semanticSourceOf honors a declared source field", () => {
    for (const field of ["semantic_text", "text_ref", "title"] as const)
      expect(
        semanticSourceOf({
          properties: {
            semantic_source_field: ` ${field} `,
            semantic_text: "s",
            text_ref: "r",
            title: "t",
            [field]: ` chosen ${field} `,
          },
        }),
      ).toStrictEqual({ field, text: `chosen ${field}` });
  });

  test("semanticSourceOf falls back from semantic text to text ref to title", () => {
    const props = { semantic_text: " s ", text_ref: " r ", title: " t " };
    expect(semanticSourceOf({ properties: props })).toStrictEqual({
      field: "semantic_text",
      text: "s",
    });
    expect(
      semanticSourceOf({ properties: { ...props, semantic_text: "  " } }),
    ).toStrictEqual({ field: "text_ref", text: "r" });
    expect(
      semanticSourceOf({
        properties: { ...props, semantic_text: "", text_ref: " " },
      }),
    ).toStrictEqual({ field: "title", text: "t" });
    expect(
      semanticSourceOf({
        properties: { ...props, semantic_source_field: "other" },
      }),
    ).toStrictEqual({ field: "semantic_text", text: "s" });
    expect(semanticSourceOf({})).toStrictEqual({ field: "title", text: "" });
    expect(
      semanticSourceOf({
        properties: {
          ...props,
          semantic_source_field: "semantic_text",
          semantic_text: "",
        },
      }),
    ).toStrictEqual({ field: "semantic_text", text: "" });
  });

  test("semanticClausesOf keeps non-blank string clauses", () => {
    expect(
      semanticClausesOf({
        properties: { semantic_clauses: ["a", " ", "", 3, " b "] },
      }),
    ).toStrictEqual(["a", " b "]);
    expect(semanticClausesOf({ properties: { semantic_clauses: "a" } })).toBe(
      undefined,
    );
    expect(semanticClausesOf({})).toBe(undefined);
  });

  test("statementOf and sourceOf", () => {
    expect(statementOf({ properties: { text_ref: " r " } })).toBe("r");
    expect(sourceOf({ properties: { source: " src " } })).toBe("src");
    expect(sourceOf({ properties: { source: " " } })).toBe(
      "mcp://kibi/semantic-advisor",
    );
    expect(sourceOf({})).toBe("mcp://kibi/semantic-advisor");
  });
});

describe("key normalization", () => {
  test("normalizeKey", () => {
    expect(normalizeKey("  The User's  Cart-Items! ")).toBe(
      "the_users_cart_items",
    );
    expect(normalizeKey("Owner’s")).toBe("owners");
    expect(normalizeKey("__a__b__")).toBe("a_b");
    expect(normalizeKey("a9")).toBe("a9");
    expect(normalizeKey("  a  ")).toBe("a");
    expect(normalizeKey("!!")).toBe("");
  });

  test("normalizePredicateToken", () => {
    expect(normalizePredicateToken("  the user’s An cart  ")).toBe(
      "users_cart",
    );
    expect(normalizePredicateToken("A-b c.d")).toBe("-b_c_d");
    expect(normalizePredicateToken("theme and another")).toBe(
      "theme_and_another",
    );
    expect(normalizePredicateToken("a  b")).toBe("b");
    expect(normalizePredicateToken("x  y")).toBe("x_y");
    expect(normalizePredicateToken("x's")).toBe("xs");
    expect(normalizePredicateToken("_x_")).toBe("x");
    expect(normalizePredicateToken("__x__")).toBe("x");
    expect(normalizePredicateToken("  x  ")).toBe("x");
    expect(normalizePredicateToken("..x..y..")).toBe("x_y");
  });

  test("singularizeToken", () => {
    const cases: [string, string][] = [
      ["cats", "cat"],
      ["bus", "bus"],
      ["ies", "ies"],
      ["pies", "pie"],
      ["flies", "fly"],
      ["churches", "church"],
      ["dishes", "dish"],
      ["classes", "class"],
      ["boxes", "box"],
      ["access", "access"],
      ["status", "status"],
      ["analysis", "analysis"],
      ["item", "item"],
      ["sss", "sss"],
      ["dogs", "dog"],
      ["xes", "xes"],
    ];
    for (const [input, output] of cases)
      expect([input, singularizeToken(input, [])]).toStrictEqual([
        input,
        output,
      ]);
    expect(singularizeToken("status", ["status"])).toBe("status");
  });

  test("singularize keeps status and results", () => {
    expect(singularize("status")).toBe("status");
    expect(singularize("results")).toBe("results");
    expect(singularize("users")).toBe("user");
  });

  test("normalizeSubjectKey joins singular tokens with dots", () => {
    expect(normalizeSubjectKey("Order Items status")).toBe("order.item.status");
  });
});

const CLAIM: SemanticStrictPropertyClaim = {
  subject_key: "cart",
  property_key: "items",
  operator: "lte",
  value_type: "int",
  value_int: 2,
};

describe("strictSuggestion", () => {
  test("builds the subject, property and requirement plan", () => {
    const payload = {
      id: " REQ-1 ",
      properties: {
        semantic_text: " Cart holds at most 2 items ",
        title: " Cart limit ",
        source: "src://x",
      },
    };
    const subjectId = `FACT-SUBJECT-${shortHash("cart")}`;
    const propertyId = `FACT-PROP-${shortHash(`cart.items.lte.${canonicalize(CLAIM)}`)}`;
    expect(strictSuggestion(payload, "ev", CLAIM, "why")).toStrictEqual({
      kind: "strict_property",
      claim_key: semanticClaimKey("Cart holds at most 2 items"),
      claim_text: "Cart holds at most 2 items",
      confidence: 0.9,
      evidence: "ev",
      rationale: "why",
      suggested_next_tool: "kb_model_requirement",
      claim: CLAIM,
      casesPreview: previewCases(CLAIM),
      rejected_alternatives: ["predicate", "observation_review"],
      applyPlan: [
        {
          type: "fact",
          id: subjectId,
          properties: {
            title: "cart subject",
            status: "active",
            source: "src://x",
            fact_kind: "subject",
            subject_key: "cart",
            canonical_key: "cart",
            tags: ["lane:strict", "semantic-advisor-suggestion"],
          },
          relationships: [],
          document: {
            body: 'Definition not stated: the subject cart is named by requirement REQ-1 ("Cart holds at most 2 items"). The people who own that source can say what it is in the product and what it is not.\n',
          },
        },
        {
          type: "fact",
          id: propertyId,
          properties: {
            title: "cart items",
            status: "active",
            source: "src://x",
            fact_kind: "property_value",
            subject_key: "cart",
            property_key: "items",
            operator: "lte",
            value_type: "int",
            value_int: 2,
            canonical_key: "cart.items.lte.2",
            tags: ["lane:strict", "semantic-advisor-suggestion"],
          },
          relationships: [],
        },
        {
          type: "req",
          id: "REQ-1",
          properties: {
            title: "Cart limit",
            status: "open",
            source: "src://x",
            semantic_text: "Cart holds at most 2 items",
            tags: ["semantic-advisor-suggestion"],
          },
          relationships: [
            { type: "constrains", from: "REQ-1", to: subjectId },
            { type: "requires_property", from: "REQ-1", to: propertyId },
          ],
        },
      ],
    });
  });

  test("a claim with no cases carries no preview and defaults the requirement", () => {
    const claim: SemanticStrictPropertyClaim = {
      subject_key: "app",
      property_key: "mode",
      operator: "eq",
      value_type: "string",
      value_string: "dark",
      unit: "",
    };
    const suggestion = strictSuggestion(
      { properties: { text_ref: "r" } },
      "ev",
      claim,
      "why",
      0.5,
    );
    expect(suggestion.confidence).toBe(0.5);
    expect("casesPreview" in suggestion).toBe(false);
    const [, property, req] = suggestion.applyPlan as {
      id: string;
      properties: Record<string, unknown>;
    }[];
    expect(property?.properties).toStrictEqual({
      title: "app mode",
      status: "active",
      source: "mcp://kibi/semantic-advisor",
      fact_kind: "property_value",
      subject_key: "app",
      property_key: "mode",
      operator: "eq",
      value_type: "string",
      value_string: "dark",
      canonical_key: "app.mode.eq.dark",
      tags: ["lane:strict", "semantic-advisor-suggestion"],
    });
    expect(req?.id).toBe(`REQ-SEMANTIC-${shortHash("app")}`);
    expect(req?.properties).toStrictEqual({
      title: "Semantic advisor requirement suggestion",
      status: "open",
      source: "mcp://kibi/semantic-advisor",
      text_ref: "r",
      tags: ["semantic-advisor-suggestion"],
    });
  });

  test("a title source adds no text field to the requirement", () => {
    const suggestion = strictSuggestion(
      { properties: { title: "T" } },
      "ev",
      CLAIM,
      "why",
    );
    const req = (
      suggestion.applyPlan as { properties: Record<string, unknown> }[]
    )[2];
    expect(req?.properties).toStrictEqual({
      title: "T",
      status: "open",
      source: "mcp://kibi/semantic-advisor",
      tags: ["semantic-advisor-suggestion"],
    });
  });

  test("a requirement without a statement names only its id in the subject note", () => {
    const suggestion = strictSuggestion({ id: "REQ-1" }, "ev", CLAIM, "");
    const subject = (
      suggestion.applyPlan as { document?: { body: string } }[]
    )[0];
    expect(subject?.document?.body).toBe(
      "Definition not stated: the subject cart is named by requirement REQ-1. The people who own that source can say what it is in the product and what it is not.\n",
    );
  });

  test("copies each value field present and keys on the first", () => {
    const fields = (claim: Partial<SemanticStrictPropertyClaim>) => {
      const suggestion = strictSuggestion({}, "ev", { ...CLAIM, ...claim }, "");
      const props = (
        suggestion.applyPlan as { properties: Record<string, unknown> }[]
      )[1]?.properties as Record<string, unknown>;
      const {
        title,
        status,
        source,
        fact_kind,
        subject_key,
        property_key,
        operator,
        value_type,
        tags,
        ...rest
      } = props;
      return rest;
    };
    expect(
      fields({
        value_string: "s",
        value_set: ["a", "b"],
        value_int: 1,
        value_number: 1.5,
        value_bool: false,
        unit: "ms",
      }),
    ).toStrictEqual({
      value_string: "s",
      value_set: ["a", "b"],
      value_int: 1,
      value_number: 1.5,
      value_bool: false,
      unit: "ms",
      canonical_key: "cart.items.lte.s",
    });
    expect(
      fields({ value_int: undefined, value_set: ["a", "b"], value_bool: true }),
    ).toStrictEqual({
      value_set: ["a", "b"],
      value_bool: true,
      canonical_key: "cart.items.lte.a|b",
    });
    expect(fields({ value_int: 0, value_number: 4 })).toStrictEqual({
      value_int: 0,
      value_number: 4,
      canonical_key: "cart.items.lte.0",
    });
    expect(fields({ value_int: undefined, value_number: 4 })).toStrictEqual({
      value_number: 4,
      canonical_key: "cart.items.lte.4",
    });
    expect(fields({ value_int: undefined, value_bool: false })).toStrictEqual({
      value_bool: false,
      canonical_key: "cart.items.lte.false",
    });
    expect(fields({ value_int: undefined })).toStrictEqual({
      canonical_key: "cart.items.lte.undefined",
    });
  });

  test("the copied set is not the claim's own array", () => {
    const members = ["a"];
    const suggestion = strictSuggestion(
      {},
      "ev",
      { ...CLAIM, value_type: "set", operator: "eq", value_set: members },
      "",
    );
    const props = (
      suggestion.applyPlan as { properties: Record<string, unknown> }[]
    )[1]?.properties;
    expect(props?.value_set).toStrictEqual(["a"]);
    expect(props?.value_set).not.toBe(members);
  });
});

describe("predicateSuggestion", () => {
  test("links to an existing requirement when the payload has an id", () => {
    const payload = {
      id: " REQ-2 ",
      properties: { semantic_text: "Admins approve refunds", source: "s" },
    };
    const factId = `FACT-PRED-${shortHash("approves(admin,refund)")}`;
    expect(
      predicateSuggestion(payload, "ev", "approves", ["admin", "refund"], "r"),
    ).toStrictEqual({
      kind: "predicate",
      claim_key: semanticClaimKey("Admins approve refunds"),
      claim_text: "Admins approve refunds",
      confidence: 0.84,
      evidence: "ev",
      rationale: "r",
      suggested_next_tool: "kb_suggest_predicates",
      predicate: {
        predicate_name: "approves",
        predicate_args: ["admin", "refund"],
        canonical_key: "approves(admin,refund)",
        polarity: "assert",
      },
      rejected_alternatives: ["strict_property"],
      applyPlan: [
        {
          type: "fact",
          id: factId,
          properties: {
            title: "approves suggestion",
            status: "active",
            source: "s",
            fact_kind: "predicate",
            predicate_name: "approves",
            predicate_args: ["admin", "refund"],
            canonical_key: "approves(admin,refund)",
            polarity: "assert",
            tags: ["lane:ontology", "semantic-advisor-suggestion"],
          },
          relationships: [],
        },
      ],
      relationshipPlan: {
        applyAfter: factId,
        requiresExistingReq: "REQ-2",
        relationship: {
          type: "requires_predicate",
          from: "REQ-2",
          to: factId,
        },
      },
    });
  });

  test("a denial without a requirement id has no relationship plan", () => {
    const suggestion = predicateSuggestion({}, "ev", "p", [], "r", "deny");
    if (suggestion.kind !== "predicate") throw new Error("not a predicate");
    expect(suggestion.relationshipPlan).toBe(null);
    expect(suggestion.predicate.polarity).toBe("deny");
    expect(suggestion.predicate.canonical_key).toBe("p()");
    expect(
      (suggestion.applyPlan as { properties: Record<string, unknown> }[])[0]
        ?.properties.polarity,
    ).toBe("deny");
  });
});
