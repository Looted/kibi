import { describe, expect, test } from "bun:test";
import {
  AGENT_REQUIREMENT_REVIEW_LIMIT,
  evaluateOriginReview,
} from "../../src/public/operations/origin-review.js";
import { getRuleEnforcementClass } from "../../src/utils/rule-registry.js";

function req(id: string, extra: Record<string, unknown> = {}) {
  return { id, type: "req", status: "open", source: `${id}.md`, ...extra };
}

describe("origin review advisories", () => {
  test("rules are registered as non-blocking advisories", () => {
    for (const rule of [
      "exception-unapproved",
      "exception-approval-self-attested",
      "agent-requirement-unapproved",
    ]) {
      expect(getRuleEnforcementClass(rule)).toBe("advisory");
    }
  });

  test("an exception without approved_by exempts nothing and is reported", () => {
    const findings = evaluateOriginReview({
      requirements: [req("REQ-base"), req("REQ-exc")],
      exempts: [["REQ-exc", "REQ-base"]],
      superseded: new Set(),
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "exception-unapproved",
      entityId: "REQ-exc",
      source: "REQ-exc.md",
      evidence: { exceptionId: "REQ-exc", exempts: ["REQ-base"] },
    });
  });

  test("an agent-recorded approval without human corroboration is self-attested", () => {
    const findings = evaluateOriginReview({
      requirements: [
        req("REQ-base"),
        req("REQ-exc-agent", {
          approved_by: "dana",
          origin: JSON.stringify({ kind: "agent" }),
        }),
        req("REQ-exc-corroborated", {
          approved_by: "dana",
          approval_ref: "ADR-7",
          origin: { kind: "agent", approved_by: "dana" },
        }),
        req("REQ-exc-human", {
          approved_by: "dana",
          origin: { kind: "human" },
        }),
      ],
      exempts: [
        ["REQ-exc-agent", "REQ-base"],
        ["REQ-exc-corroborated", "REQ-base"],
        ["REQ-exc-human", "REQ-base"],
      ],
      superseded: new Set(),
    });

    const selfAttested = findings.filter(
      (finding) => finding.rule === "exception-approval-self-attested",
    );
    expect(selfAttested.map((finding) => finding.entityId)).toEqual([
      "REQ-exc-agent",
    ]);
    expect(selfAttested[0]?.evidence).toMatchObject({
      approvedBy: "dana",
      missing: ["origin.approved_by", "approval_ref"],
    });
  });

  test("lists unapproved agent requirements up to the limit, then one summary", () => {
    const requirements = Array.from(
      { length: AGENT_REQUIREMENT_REVIEW_LIMIT + 3 },
      (_, index) =>
        req(`REQ-agent-${String(index).padStart(2, "0")}`, {
          origin: { kind: "agent", ref: `session-${index}` },
        }),
    );
    requirements.push(
      req("REQ-approved", { origin: { kind: "agent", approved_by: "lee" } }),
      req("REQ-human", { origin: { kind: "human" } }),
      req("REQ-migrated", { origin: { kind: "migration" } }),
      req("REQ-retired", {
        status: "deprecated",
        origin: { kind: "agent" },
      }),
      req("REQ-replaced", { origin: { kind: "agent" } }),
    );

    const findings = evaluateOriginReview(
      {
        requirements,
        exempts: [],
        superseded: new Set(["REQ-replaced"]),
      },
      new Set(["agent-requirement-unapproved"]),
    );

    expect(findings).toHaveLength(AGENT_REQUIREMENT_REVIEW_LIMIT + 1);
    expect(findings[0]?.entityId).toBe("REQ-agent-00");
    const summary = findings.at(-1);
    expect(summary?.entityId).toBe("workspace");
    expect(summary?.evidence).toMatchObject({
      total: AGENT_REQUIREMENT_REVIEW_LIMIT + 3,
      remainingIds: ["REQ-agent-25", "REQ-agent-26", "REQ-agent-27"],
    });
    expect(
      findings.some((finding) =>
        [
          "REQ-approved",
          "REQ-human",
          "REQ-migrated",
          "REQ-retired",
          "REQ-replaced",
        ].includes(finding.entityId),
      ),
    ).toBe(false);
  });

  test("honors the selected rule subset", () => {
    expect(
      evaluateOriginReview(
        {
          requirements: [req("REQ-base"), req("REQ-exc")],
          exempts: [["REQ-exc", "REQ-base"]],
          superseded: new Set(),
        },
        new Set(["agent-requirement-unapproved"]),
      ),
    ).toEqual([]);
  });
});
