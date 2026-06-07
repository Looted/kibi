import { describe, expect, test } from "bun:test";
import { handleKbSemanticAdvisor } from "../../src/tools/semantic-advisor.js";

describe("kb_semantic_advisor", () => {
  test("returns rich suggestions without requiring a kb_upsert payload", async () => {
    const result = await handleKbSemanticAdvisor({
      type: "req",
      id: "REQ-SESSIONS",
      text: "Users may have at most two active sessions.",
      source: "docs/requirements/sessions.md",
      title: "Limit active sessions",
    });

    expect(result.structuredContent.receipt).toMatchObject({
      logic_readiness: "needs_modeling",
      candidate_lane: "strict_property",
      suggestions: [
        expect.objectContaining({
          kind: "strict_property",
          claim: expect.objectContaining({
            subject_key: "user.session",
            property_key: "active_count",
            operator: "lte",
            value_int: 2,
          }),
        }),
      ],
    });
    expect(result.structuredContent.warnings.join("\n")).toContain(
      "kb_model_requirement",
    );
    expect(result.content[0]?.text).toContain("strict_property");
  });

  test("rejects blank text before analysis", async () => {
    await expect(handleKbSemanticAdvisor({ text: "   " })).rejects.toThrow(
      /text must be a non-empty string/,
    );
  });
});
