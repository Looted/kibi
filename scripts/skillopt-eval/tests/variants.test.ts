import { describe, expect, test } from "bun:test";
import {
  createBaselineVariant,
  generateOneShotVariant,
  validateCandidateBody,
} from "../variants";

const BASELINE = "Use Kibi through MCP.\n";
const SURFACE = {
  frontmatterHash: "a".repeat(64),
  resourcesHash: "b".repeat(64),
};

describe("skill variant generation", () => {
  test("freezes the unchanged body with immutable surface hashes", () => {
    const variant = createBaselineVariant({
      skill: "kibi-usage",
      body: BASELINE,
      ...SURFACE,
    });

    expect(variant.variant).toBe("baseline");
    expect(variant.status).toBe("frozen");
    expect(variant.body).toBe(BASELINE);
    expect(variant.frontmatterHash).toBe(SURFACE.frontmatterHash);
    expect(variant.resourcesHash).toBe(SURFACE.resourcesHash);
  });

  test("accepts safe body-only candidates and rejects frontmatter or direct .kb access", () => {
    expect(() =>
      validateCandidateBody("Use MCP instead of editing `.kb`.\n"),
    ).not.toThrow();
    expect(() => validateCandidateBody("---\nid: changed\n---\nbody")).toThrow(
      "candidate_frontmatter_changed",
    );
    expect(() =>
      validateCandidateBody("Read `.kb` directly before acting."),
    ).toThrow("candidate_direct_kb_guidance");
  });

  test("makes exactly one one-shot request and freezes the first valid body", async () => {
    const requests: unknown[] = [];
    const result = await generateOneShotVariant(
      {
        skill: "kibi-usage",
        baselineBody: BASELINE,
        ...SURFACE,
        objectives: ["discover exact requirements"],
        familyNames: ["discovery-exact-lookup"],
        immutableConstraints: ["body-only", "no direct .kb access"],
      },
      {
        generate: async (request) => {
          requests.push(request);
          return "Use Kibi through the required MCP surface.\n";
        },
      },
    );

    expect(requests).toHaveLength(1);
    expect(result.status).toBe("frozen");
    if (result.status !== "frozen") throw new Error("expected frozen variant");
    expect(result.variant.variant).toBe("one-shot");
    expect(result.variant.body).toContain("required MCP");
    expect("score" in result.variant).toBe(false);
  });

  test("turns invalid one-shot output into a zero comparator without retry", async () => {
    let calls = 0;
    const result = await generateOneShotVariant(
      {
        skill: "kibi-usage",
        baselineBody: BASELINE,
        ...SURFACE,
        objectives: ["discover exact requirements"],
        familyNames: ["discovery-exact-lookup"],
        immutableConstraints: ["body-only"],
      },
      {
        generate: async () => {
          calls += 1;
          return "Read `.kb` directly.";
        },
      },
    );

    expect(calls).toBe(1);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid")
      throw new Error("expected invalid variant");
    expect(result.score).toBe(0);
    expect(result.failureCategory).toBe("invalid_variant");
  });
});
