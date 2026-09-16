import { describe, expect, test } from "bun:test";
import {
  CandidateValidationError,
  MAX_CANDIDATE_BODY_BYTES,
  createBaselineVariant,
  freezeCandidateVariant,
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

  test("rejects empty, oversized, null-byte, and host-claim candidate bodies", () => {
    expect(() => validateCandidateBody("")).toThrow(CandidateValidationError);
    expect(() => validateCandidateBody("   \n")).toThrow("candidate_empty");
    expect(() => validateCandidateBody("ok\u0000body")).toThrow(
      "candidate_invalid_utf8",
    );
    expect(() =>
      validateCandidateBody(`${"x".repeat(MAX_CANDIDATE_BODY_BYTES + 1)}`),
    ).toThrow("candidate_too_large");
    expect(() =>
      validateCandidateBody("Use OpenCode to call the provider SDK.\n"),
    ).toThrow("candidate_prohibited_host_or_provider_claim");
    expect(() =>
      validateCandidateBody("Set OPENAI_API_KEY before running.\n"),
    ).toThrow("candidate_prohibited_host_or_provider_claim");
    expect(() =>
      validateCandidateBody("Export CODEX_API_KEY for Cursor.\n"),
    ).toThrow("candidate_prohibited_host_or_provider_claim");
    expect(() =>
      validateCandidateBody("Inspect `.kb` without writing anything.\n"),
    ).not.toThrow();
    expect(() =>
      validateCandidateBody("Never read or edit files inside `.kb`.\n"),
    ).not.toThrow();
  });

  test("freezes valid candidates and records optional source request hashes", () => {
    const variant = freezeCandidateVariant({
      skill: "kibi-usage",
      variant: "skillopt",
      body: "Use Kibi through the required MCP surface.\n",
      ...SURFACE,
      provenance: "skillopt",
      sourceRequestHash: "c".repeat(64),
    });
    expect(variant.sourceRequestHash).toBe("c".repeat(64));
    expect(variant.provenance).toBe("skillopt");
    expect(
      freezeCandidateVariant({
        skill: "kibi-usage",
        variant: "one-shot",
        body: "Use Kibi through MCP.\n",
        ...SURFACE,
        provenance: "codex-one-shot",
      }).sourceRequestHash,
    ).toBeUndefined();
  });

  test("baseline encoding failures stay on the candidate validation lane", () => {
    expect(() =>
      createBaselineVariant({
        skill: "kibi-usage",
        body: "",
        ...SURFACE,
      }),
    ).toThrow("candidate_empty");
    expect(() =>
      createBaselineVariant({
        skill: "kibi-usage",
        body: "ok\u0000",
        ...SURFACE,
      }),
    ).toThrow("candidate_invalid_utf8");
    expect(() =>
      createBaselineVariant({
        skill: "kibi-usage",
        body: "x".repeat(MAX_CANDIDATE_BODY_BYTES + 1),
        ...SURFACE,
      }),
    ).toThrow("candidate_too_large");
  });

  test("maps non-Error one-shot failures to invalid comparators", async () => {
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
          throw "optimizer_unavailable";
        },
      },
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid");
    expect(result.error).toBe("optimizer_unavailable");
  });
});
