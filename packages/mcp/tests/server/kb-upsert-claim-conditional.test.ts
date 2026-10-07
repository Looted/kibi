// implements REQ-mcp-conditional-input-validation
import { describe, expect, test } from "bun:test";
import {
  jsonSchemaToZod,
  matchesJsonSchemaCondition,
} from "../../src/server/json-schema-to-zod.js";
import { TOOLS } from "../../src/tools-config.js";

// The MCP server validates kb_upsert arguments with the zod schema converted
// from the tool's published inputSchema. Its conditional claim_key rule must
// agree with the CLI's ajv validation of the same JSON Schema.
function kbUpsertInput() {
  const tool = TOOLS.find((candidate) => candidate.name === "kb_upsert");
  if (!tool) throw new Error("kb_upsert is not registered");
  return jsonSchemaToZod(tool.inputSchema);
}

function fact(properties: Record<string, unknown>) {
  return {
    type: "fact",
    id: "FACT-review-claim-conditional",
    properties: { title: "Review note", status: "active", ...properties },
  };
}

function claimKeyIssue(result: { success: boolean; error?: unknown }) {
  return (
    !result.success &&
    String(JSON.stringify(result.error)).includes(
      "Required by conditional JSON Schema rule: claim_key",
    )
  );
}

describe("kb_upsert claim provenance conditional over MCP", () => {
  for (const factKind of ["observation", "meta"]) {
    test(`accepts a ${factKind} fact quoting claim_text without claim_key`, () => {
      const result = kbUpsertInput().safeParse(
        fact({
          fact_kind: factKind,
          claim_text: "The operator must approve the export.",
          tags: ["review:ontology-gap"],
        }),
      );
      expect(result.success).toBe(true);
    });
  }

  for (const factKind of ["subject", "property_value", "predicate"]) {
    test(`still requires claim_key for a ${factKind} fact with claim_text`, () => {
      const result = kbUpsertInput().safeParse(
        fact({
          fact_kind: factKind,
          claim_text: "The operator must approve the export.",
        }),
      );
      expect(claimKeyIssue(result)).toBe(true);
    });
  }

  test("still requires claim_key when claim_text has no fact_kind", () => {
    const result = kbUpsertInput().safeParse(
      fact({ claim_text: "The operator must approve the export." }),
    );
    expect(claimKeyIssue(result)).toBe(true);
  });

  test("still requires claim_text when claim_key is present, whatever the kind", () => {
    for (const factKind of ["observation", "subject"]) {
      const result = kbUpsertInput().safeParse(
        fact({ fact_kind: factKind, claim_key: "CLAIM-0000000000000000" }),
      );
      expect(result.success).toBe(false);
    }
    expect(
      kbUpsertInput().safeParse(
        fact({
          fact_kind: "observation",
          claim_key: "CLAIM-0000000000000000",
          claim_text: "Quoted",
        }),
      ).success,
    ).toBe(true);
  });
});

describe("matchesJsonSchemaCondition", () => {
  test("evaluates not, properties, enum, const, type and combinators", () => {
    const observation = {
      not: {
        properties: { kind: { enum: ["observation", "meta"] } },
        required: ["kind"],
      },
    };
    expect(
      matchesJsonSchemaCondition({ kind: "observation" }, observation),
    ).toBe(false);
    expect(matchesJsonSchemaCondition({ kind: "subject" }, observation)).toBe(
      true,
    );
    expect(matchesJsonSchemaCondition({}, observation)).toBe(true);
    expect(
      matchesJsonSchemaCondition(
        { kind: "x" },
        { properties: { kind: { const: "x" } } },
      ),
    ).toBe(true);
    expect(
      matchesJsonSchemaCondition(
        { n: "1" },
        { properties: { n: { type: "integer" } } },
      ),
    ).toBe(false);
    expect(
      matchesJsonSchemaCondition(
        { n: 2 },
        { properties: { n: { type: ["integer", "null"] } } },
      ),
    ).toBe(true);
    expect(
      matchesJsonSchemaCondition(
        { a: 1 },
        { oneOf: [{ required: ["a"] }, { required: ["b"] }] },
      ),
    ).toBe(true);
    expect(
      matchesJsonSchemaCondition(
        { a: 1, b: 2 },
        { oneOf: [{ required: ["a"] }, { required: ["b"] }] },
      ),
    ).toBe(false);
    expect(matchesJsonSchemaCondition({}, false)).toBe(false);
    expect(matchesJsonSchemaCondition({}, true)).toBe(true);
    expect(
      matchesJsonSchemaCondition(
        { a: 1 },
        { allOf: [{ required: ["a"] }, { not: { required: ["b"] } }] },
      ),
    ).toBe(true);
  });
});
