import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AGENT_REQUIREMENT_REVIEW_LIMIT,
  evaluateOriginReview,
  markdownHasRationaleSection,
  rationaleSectionReader,
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
      "requirement-rationale-missing",
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

  test("asks human- and agent-authored requirements for a rationale", () => {
    const authored = { kind: "agent", approved_by: "lee" };
    const findings = evaluateOriginReview(
      {
        requirements: [
          req("REQ-agent-bare", { origin: authored }),
          req("REQ-human-bare", { origin: { kind: "human" } }),
          req("REQ-with-field", {
            origin: authored,
            rationale: "Support asked for it after the outage.",
          }),
          req("REQ-with-section", { origin: authored }),
          req("REQ-with-adr", { origin: authored }),
          req("REQ-imported", { origin: { kind: "import" } }),
          req("REQ-migrated", { origin: { kind: "migration" } }),
          req("REQ-no-origin"),
          req("REQ-replaced", { origin: authored }),
        ],
        exempts: [],
        superseded: new Set(["REQ-replaced"]),
        adrLinked: new Set(["REQ-with-adr"]),
        hasRationaleSection: (entity) => entity.id === "REQ-with-section",
      },
      new Set(["requirement-rationale-missing"]),
    );

    expect(findings.map((finding) => finding.entityId)).toEqual([
      "REQ-agent-bare",
      "REQ-human-bare",
    ]);
    expect(findings[0]).toMatchObject({
      rule: "requirement-rationale-missing",
      source: "REQ-agent-bare.md",
      evidence: { origin: authored },
    });
  });

  test("caps the rationale review list with one summary finding", () => {
    const requirements = Array.from(
      { length: AGENT_REQUIREMENT_REVIEW_LIMIT + 2 },
      (_, index) =>
        req(`REQ-why-${String(index).padStart(2, "0")}`, {
          origin: { kind: "human" },
        }),
    );
    const findings = evaluateOriginReview(
      { requirements, exempts: [], superseded: new Set() },
      new Set(["requirement-rationale-missing"]),
    );
    expect(findings).toHaveLength(AGENT_REQUIREMENT_REVIEW_LIMIT + 1);
    expect(findings.at(-1)).toMatchObject({
      entityId: "workspace",
      evidence: {
        total: AGENT_REQUIREMENT_REVIEW_LIMIT + 2,
        listed: AGENT_REQUIREMENT_REVIEW_LIMIT,
        remainingIds: ["REQ-why-25", "REQ-why-26"],
      },
    });
  });
});

describe("rationale sections", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("recognizes Rationale, Why and Context headings in the body only", () => {
    expect(
      markdownHasRationaleSection("# Title\n\n## Rationale\nBecause."),
    ).toBe(true);
    expect(markdownHasRationaleSection("### Why this exists\n")).toBe(true);
    expect(markdownHasRationaleSection("## Why\r\nBecause.")).toBe(true);
    expect(
      markdownHasRationaleSection("Statement.\n\n## Context\nAsked."),
    ).toBe(true);
    expect(
      markdownHasRationaleSection(
        '---\nid: REQ-x\ntitle: "# Why"\n---\n\nNo reason given.',
      ),
    ).toBe(false);
    expect(markdownHasRationaleSection("## Whyever\n")).toBe(false);
    expect(markdownHasRationaleSection("Rationale: inline prose\n")).toBe(
      false,
    );
  });

  test("reads each requirement document once, relative to the workspace", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-rationale-"));
    roots.push(root);
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    const withWhy = ".kb/requirements/REQ-why.md";
    writeFileSync(
      path.join(root, withWhy),
      "---\nid: REQ-why\n---\n\n## Why\n\nOperators asked.\n",
    );
    const read = rationaleSectionReader(root);
    expect(read({ id: "REQ-why", source: withWhy })).toBe(true);
    rmSync(path.join(root, withWhy));
    // Cached: the file is read at most once per check.
    expect(read({ id: "REQ-why", source: withWhy })).toBe(true);
    expect(
      read({ id: "REQ-missing", source: ".kb/requirements/nope.md" }),
    ).toBe(false);
    expect(read({ id: "REQ-no-source" })).toBe(false);
  });
});
