import { describe, expect, test } from "bun:test";
import { buildIntentClaimCandidates } from "../../../src/operations/bootstrap/intent-claims.js";
import { normalizeBootstrapContext } from "../../../src/operations/bootstrap/presentation.js";
import type { SubjectKeyRegistry } from "../../../src/operations/bootstrap/requirement-claims.js";

const declared = normalizeBootstrapContext({
  knowledgeSources: [
    {
      id: "handover",
      kind: "specification",
      title: "Handover",
      locator: "https://example.com/h",
      authority: "supporting",
      component: "reports",
    },
  ],
  intentClaims: [
    {
      statement: "Logs must be retained for 7 days.",
      sourceId: "handover",
      reference: "H-1",
      excerpt: "kept a week",
    },
    {
      statement: "The export page is slow.",
      sourceId: "handover",
      reference: "H-2",
      excerpt: "slow",
      kind: "observation",
    },
    {
      statement: "Users must be able to export reports as PDF?",
      sourceId: "handover",
      reference: "H-3",
      excerpt: "pdf",
    },
  ],
  conflicts: [
    {
      note: "they disagree",
      claimReferences: [
        { sourceId: "handover", reference: "H-1" },
        { sourceId: "handover", reference: "H-2" },
      ],
    },
  ],
} as never);
const requirements = [
  {
    id: "REQ-x",
    title: "t",
    semanticText: "Users must be able to export reports as PDF now.",
  },
];
const REQ = "REQ-AUTO-7542082B20BC8384";
const OBSERVATION = "FACT-BOOTSTRAP-OBSERVATION-7972ED4E0B95790A";
const CONFLICT = "FACT-BOOTSTRAP-CONFLICT-16EF6977B642378B";
const NEAR =
  "Intent claim at handover:H-3 closely restates current requirement REQ-x (token overlap 0.9 with its semantic text, not an exact match); it is still planned. Review it before apply: drop the claim if it states the same rule, or keep it and link the two with restates or supersedes.";

const build = (
  existing: readonly string[],
  minConfidence: number,
  subjectKeys?: SubjectKeyRegistry,
) =>
  buildIntentClaimCandidates(
    declared,
    new Set(existing),
    minConfidence,
    subjectKeys,
    requirements,
  );

describe("buildIntentClaimCandidates suppression", () => {
  test("plans every claim and conflict at a low threshold", () => {
    const result = build([], 0);
    expect(
      result.candidates.map((candidate) => candidate.candidateId),
    ).toStrictEqual([
      `claim:handover:${REQ.toLowerCase()}`,
      `claim:handover:${OBSERVATION.toLowerCase()}`,
      `conflict:${CONFLICT.toLowerCase()}`,
    ]);
    expect(
      result.sourceOnlySignals.map((signal) => signal.sourcePath),
    ).toStrictEqual(["H-3"]);
    expect(result.diagnostics).toContain(NEAR);
  });

  test("suppresses claims and conflicts below the minimum confidence", () => {
    const result = build([], 0.95);
    expect(result.candidates).toStrictEqual([]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: `claim:handover:${REQ.toLowerCase()}`,
        reason: "below_min_confidence",
        sourcePath: "H-1",
        entityType: "req",
      },
      {
        candidateId: `claim:handover:${OBSERVATION.toLowerCase()}`,
        reason: "below_min_confidence",
        sourcePath: "H-2",
        entityType: "fact",
      },
      {
        candidateId: `conflict:${CONFLICT.toLowerCase()}`,
        reason: "below_min_confidence",
        sourcePath: "handover:H-1, handover:H-2",
        entityType: "fact",
      },
    ]);
    expect(
      result.sourceOnlySignals.map((signal) => signal.sourcePath),
    ).toStrictEqual(["H-1", "H-3"]);
  });

  test("suppresses claims and conflicts whose entity already exists", () => {
    const result = build([REQ, OBSERVATION, CONFLICT], 0);
    expect(result.candidates).toStrictEqual([]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: `claim:handover:${REQ.toLowerCase()}`,
        reason: "entity_exists",
        sourcePath: "H-1",
        entityType: "req",
      },
      {
        candidateId: `claim:handover:${OBSERVATION.toLowerCase()}`,
        reason: "entity_exists",
        sourcePath: "H-2",
        entityType: "fact",
      },
      {
        candidateId: `conflict:${CONFLICT.toLowerCase()}`,
        reason: "entity_exists",
        sourcePath: "handover:H-1, handover:H-2",
        entityType: "fact",
      },
    ]);
    expect(
      result.sourceOnlySignals.map((signal) => signal.sourcePath),
    ).toStrictEqual(["H-3"]);
  });

  test("reports a claim whose extraction throws as a diagnostic", () => {
    const failing = {
      assign() {
        throw new Error("registry broke");
      },
    } as unknown as SubjectKeyRegistry;
    const thrown = buildIntentClaimCandidates(
      normalizeBootstrapContext({
        knowledgeSources: declared.knowledgeSources,
        intentClaims: declared.intentClaims?.slice(0, 1),
      } as never),
      new Set(),
      0,
      failing,
    );
    expect(thrown.diagnostics).toStrictEqual([
      "Intent claim extraction failed at handover:H-1: registry broke",
    ]);
    const nonError = {
      assign() {
        throw "plain";
      },
    } as unknown as SubjectKeyRegistry;
    expect(
      buildIntentClaimCandidates(
        normalizeBootstrapContext({
          knowledgeSources: declared.knowledgeSources,
          intentClaims: declared.intentClaims?.slice(0, 1),
        } as never),
        new Set(),
        0,
        nonError,
      ).diagnostics,
    ).toStrictEqual(["Intent claim extraction failed at handover:H-1: plain"]);
  });
});
