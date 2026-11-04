import { describe, expect, test } from "bun:test";
import { shareSubjectFacts } from "../../../src/operations/bootstrap/requirement-claims.js";
import type { Candidate } from "../../../src/operations/bootstrap/types.js";

const subject = (
  id: string,
  key: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  type: "fact",
  properties: { fact_kind: "subject", subject_key: key, ...extra },
});

const candidate = (
  candidateId: string,
  sourcePath: string,
  applyPlan: Record<string, unknown>[],
  relationships: Candidate["relationships"] = [],
): Candidate => ({
  candidateId,
  entityType: "req",
  title: candidateId,
  sourceKind: "markdown",
  sourcePath,
  confidence: 1,
  confidenceBand: "high",
  evidence: [],
  relationships,
  applyPlan,
});

describe("shareSubjectFacts", () => {
  test("keeps the first subject fact for a shared key and retargets later links", () => {
    const first = candidate("C1", "docs/a.md", [
      subject("FACT-a", "user.session", { tags: ["kept"] }),
      {
        id: "REQ-a",
        type: "req",
        relationships: [{ type: "constrains", to: "FACT-a" }],
      },
      { id: "FACT-other", type: "fact", properties: "none" },
    ]);
    const second = candidate(
      "C2",
      "docs/b.md",
      [
        subject("FACT-b", "user.session"),
        {
          id: "REQ-b",
          type: "req",
          relationships: [
            { type: "constrains", to: "FACT-b" },
            { type: "relates_to", to: "REQ-a" },
          ],
        },
      ],
      [{ type: "constrains", from: "REQ-b", to: "FACT-b" }],
    );
    const third = candidate("C3", "docs/c.md", [
      subject("FACT-c", "user.session", { text_ref: "docs/b.md" }),
      subject("FACT-a", "user.session"),
      subject("FACT-solo", "billing.plan", { tags: "none" }),
    ]);
    const { candidates, diagnostics } = shareSubjectFacts([
      first,
      second,
      third,
    ]);
    expect(diagnostics).toStrictEqual([
      "subject-key-shared: claims at docs/a.md, docs/b.md name the same subject user.session, so the plan writes one subject fact FACT-a and links every requirement to it through constrains.",
    ]);
    expect(candidates[0]?.applyPlan[0]).toStrictEqual({
      id: "FACT-a",
      type: "fact",
      properties: {
        fact_kind: "subject",
        subject_key: "user.session",
        tags: ["kept", "provenance:docs-a-md", "provenance:docs-b-md"],
      },
      document: {
        body: "Subject user.session, shared by the requirements bootstrap planned from docs/a.md, docs/b.md. Each of them links to this fact through constrains.\n",
      },
    });
    expect(candidates[0]?.applyPlan.slice(1)).toStrictEqual(
      first.applyPlan.slice(1),
    );
    expect(candidates[1]).toStrictEqual({
      ...second,
      relationships: [{ type: "constrains", from: "REQ-b", to: "FACT-a" }],
      applyPlan: [
        {
          id: "REQ-b",
          type: "req",
          relationships: [
            { type: "constrains", to: "FACT-a" },
            { type: "relates_to", to: "REQ-a" },
          ],
        },
      ],
    });
    // FACT-a reappears in a later candidate: it is the owner, so it is kept
    // and gets the shared provenance too; the untagged solo subject is kept.
    expect(candidates[2]?.applyPlan.map((step) => step.id)).toStrictEqual([
      "FACT-a",
      "FACT-solo",
    ]);
    expect(
      (candidates[2]?.applyPlan[0]?.properties as Record<string, unknown>).tags,
    ).toStrictEqual(["provenance:docs-a-md", "provenance:docs-b-md"]);
    expect(candidates[2]?.applyPlan[1]).toStrictEqual(third.applyPlan[2]);
  });

  test("leaves a plan without shared keys as it is", () => {
    const only = candidate("C1", "docs/a.md", [subject("FACT-a", "k")]);
    expect(shareSubjectFacts([only])).toStrictEqual({
      candidates: [only],
      diagnostics: [],
    });
  });
});
