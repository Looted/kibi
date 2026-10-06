// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
import { describe, expect, test } from "bun:test";
import { buildBootstrapCandidates } from "../../src/operations/bootstrap/candidates.js";
import { selectBootstrapCandidates } from "../../src/operations/bootstrap/generate.js";
import { buildIntentClaimCandidates } from "../../src/operations/bootstrap/intent-claims.js";
import { markdownCandidates } from "../../src/operations/bootstrap/markdown-candidates.js";
import {
  normalizeBootstrapContext,
  presentBootstrap,
} from "../../src/operations/bootstrap/presentation.js";
import type {
  BootstrapEvidence,
  BootstrapKnowledgeSource,
  Candidate,
} from "../../src/operations/bootstrap/types.js";
import { validateBootstrapPayload } from "../../src/operations/bootstrap/validation.js";

function candidate(index: number, sourceKind = "intent_claim"): Candidate {
  const type = sourceKind === "intent_claim" ? "req" : "fact";
  return {
    candidateId: `candidate:${index}`,
    entityType: type,
    title: `Claim ${index}`,
    sourceKind,
    sourcePath: `source:${index}`,
    confidence: 0.82,
    confidenceBand: "medium",
    evidence: [`citation:${index}`],
    relationships: [],
    applyPlan: [
      {
        type,
        id: `${type === "req" ? "REQ" : "FACT"}-candidate-${index}`,
        properties: {
          title: `Claim ${index}`,
          status: type === "req" ? "open" : "active",
          ...(type === "fact" ? { fact_kind: "observation" } : {}),
        },
        relationships: [],
      },
    ],
  };
}
function evidence(
  content: string,
  kind: BootstrapEvidence["kind"] = "generic_markdown",
): BootstrapEvidence {
  return {
    provider:
      kind === "typed_markdown" ? "typed_kibi_docs" : "generic_repo_docs",
    kind,
    label: "requirements.md",
    relativePath: "requirements.md",
    content,
    data: {},
  };
}

describe("bootstrap write safety and evidence accounting", () => {
  test("schema-valid inbound relationships remain writable", () => {
    const payload = {
      type: "scenario",
      id: "SCEN-inbound",
      properties: { title: "Inbound scenario", status: "active" },
      relationships: [
        { from: "REQ-existing", type: "specified_by", to: "SCEN-inbound" },
      ],
    };
    expect(validateBootstrapPayload(payload, new Date())).toBe(payload);
  });
  test("invalid candidate is suppressed with the writer error and a cited authoring follow-up", () => {
    const invalid = {
      ...candidate(1),
      applyPlan: [
        {
          type: "fact",
          id: "FACT-invalid",
          properties: {
            title: "Invalid",
            status: "active",
            fact_kind: "property_value",
            subject_key: "exports",
            property_key: "headers",
            polarity: "require",
          },
        },
      ],
    };
    const result = selectBootstrapCandidates(
      [invalid, candidate(2)],
      new Set(),
      undefined,
      1,
    );
    expect(result.candidates.map((row) => row.candidateId)).toEqual([
      "candidate:2",
    ]);
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({
        reason: "invalid_write",
        message: expect.stringContaining("requires operator"),
      }),
    );
    expect(result.sourceOnlySignals[0]).toMatchObject({
      kind: "req",
      sourcePath: "source:1",
      evidence: ["citation:1"],
    });
  });
  test("declared claims are never capped; maxCandidates limits only discovered candidates", () => {
    const claims = Array.from({ length: 60 }, (_, index) => candidate(index));
    const observations = Array.from({ length: 100 }, (_, index) =>
      candidate(index + 100, "source_symbols"),
    );
    const result = selectBootstrapCandidates(
      [...observations, ...claims, candidate(0)],
      new Set(["REQ-candidate-1"]),
      undefined,
      50,
    );
    expect(result.candidates).toHaveLength(59);
    expect(
      result.candidates.every((row) => row.sourceKind === "intent_claim"),
    ).toBe(true);
    expect(
      result.suppressed.filter((row) => row.reason === "over_limit"),
    ).toHaveLength(100);
    const factsOnly = selectBootstrapCandidates(
      [...observations.slice(0, 3), ...claims.slice(0, 2)],
      new Set(),
      ["fact"],
      50,
    );
    expect(factsOnly.candidates).toHaveLength(3);
    expect(
      factsOnly.suppressed.filter(
        (row) => row.reason === "filtered_by_entity_type",
      ),
    ).toHaveLength(2);
    expect(result.diagnostics).toContainEqual(
      expect.stringContaining(
        "59 declared intent claim(s) exceed maxCandidates 50",
      ),
    );
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({ reason: "entity_exists" }),
    );
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({ reason: "duplicate_title" }),
    );
    const mixed = selectBootstrapCandidates(
      [...observations, ...claims.slice(0, 10)],
      new Set(),
      undefined,
      50,
    );
    expect(mixed.candidates).toHaveLength(50);
    expect(
      mixed.candidates.filter((row) => row.sourceKind === "intent_claim"),
    ).toHaveLength(10);
  });
  test("a candidate that rewrites a planned entity with different content is suppressed before apply", () => {
    const first = candidate(1, "generic_markdown");
    const second = {
      ...candidate(2, "generic_markdown"),
      applyPlan: [
        {
          ...first.applyPlan[0],
          properties: {
            title: "Claim 1 restated",
            status: "active",
            fact_kind: "observation",
          },
        },
      ],
    };
    const identical = {
      ...candidate(3, "generic_markdown"),
      applyPlan: first.applyPlan,
    };
    const result = selectBootstrapCandidates(
      [first, second, identical],
      new Set(),
      undefined,
      10,
    );
    expect(result.candidates.map((row) => row.candidateId)).toEqual([
      "candidate:1",
      "candidate:3",
    ]);
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({
        candidateId: "candidate:2",
        reason: "duplicate_entity",
        message: expect.stringContaining("FACT-candidate-1"),
      }),
    );
  });
  test("restated markdown lines that share entity IDs plan one candidate, not a partial apply", () => {
    const built = buildBootstrapCandidates(
      [
        evidence(
          "# Testing\n- **New code:** Must achieve 100% coverage\n\n# Rules\nNew code must achieve 100% coverage.\n",
        ),
      ],
      new Set(),
      0.8,
      true,
    );
    expect(built.candidates).toHaveLength(2);
    const result = selectBootstrapCandidates(
      built.candidates,
      new Set(),
      undefined,
      50,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({ reason: "duplicate_entity" }),
    );
  });
  test("a claim_key grounding mismatch is suppressed at plan time with the write-time error", () => {
    const [telemetry, exports] = buildIntentClaimCandidates(
      normalizeBootstrapContext({
        knowledgeSources: [
          {
            id: "spec",
            title: "Spec",
            locator: "spec",
            kind: "specification",
            authority: "authoritative",
          },
        ],
        intentClaims: [
          {
            sourceId: "spec",
            reference: "line:1",
            statement: "Telemetry must be disabled.",
          },
          {
            sourceId: "spec",
            reference: "line:2",
            statement: "Exports must be signed.",
          },
        ],
      }),
      new Set(),
      0.8,
    ).candidates;
    if (!telemetry || !exports) throw new Error("expected two strict claims");
    const otherFacts = exports.applyPlan.filter(
      (payload) => payload.type === "fact",
    );
    const retarget = new Map(
      telemetry.applyPlan
        .filter((payload) => payload.type === "fact")
        .map((payload, index) => [payload.id, otherFacts[index]?.id]),
    );
    // The requirement now grounds on another claim's facts.
    const mismatched: Candidate = {
      ...telemetry,
      applyPlan: [
        ...otherFacts,
        ...telemetry.applyPlan
          .filter((payload) => payload.type === "req")
          .map((payload) => ({
            ...payload,
            relationships: (
              payload.relationships as {
                type: string;
                from: string;
                to: string;
              }[]
            ).map((relationship) => ({
              ...relationship,
              to: retarget.get(relationship.to) ?? relationship.to,
            })),
          })),
      ],
    };
    expect(
      selectBootstrapCandidates([telemetry], new Set(), undefined, 1)
        .candidates,
    ).toHaveLength(1);
    const result = selectBootstrapCandidates(
      [mismatched],
      new Set(),
      undefined,
      1,
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({
        reason: "invalid_write",
        message: expect.stringContaining("claim_keys must match"),
      }),
    );
  });
  test("the plan reports declared claims per source and is not ready when an authoritative source plans nothing", () => {
    const sources: readonly BootstrapKnowledgeSource[] = [
      {
        id: "tracker",
        title: "Tracker",
        locator: "tracker",
        kind: "issue_tracker",
        authority: "authoritative",
      },
      {
        id: "spec",
        title: "Spec",
        locator: "spec",
        kind: "specification",
        authority: "authoritative",
      },
    ];
    const bootstrapContext = {
      projectSummary: "A compiler",
      sourceOfTruthPaths: ["docs"],
      verificationAnchors: ["bun test"],
      knowledgeSources: sources,
      intentClaims: [
        {
          sourceId: "tracker",
          reference: "T-1",
          statement: "Exports must be signed.",
        },
        {
          sourceId: "spec",
          reference: "§1",
          statement: "Telemetry must be disabled.",
        },
      ],
    };
    const claimed = buildIntentClaimCandidates(
      normalizeBootstrapContext(bootstrapContext),
      new Set(),
      0.8,
    ).candidates;
    const present = (
      candidates: readonly Candidate[],
      suppressedCandidates: readonly Readonly<Record<string, unknown>>[] = [],
      context: typeof bootstrapContext = bootstrapContext,
    ) =>
      presentBootstrap({
        root: "/tmp/repo",
        activation: {
          activationState: "root_uninitialized",
          activationMode: "cold_start_bootstrap",
          applyBlocked: false,
          allowCandidateGeneration: true,
          reason: "cold start",
        },
        discoverySummary: {
          activationState: "root_uninitialized",
          activationMode: "cold_start_bootstrap",
          applyBlocked: false,
          reason: "cold start",
          providersRun: [],
          providerCounts: {},
          detectedLanguages: [],
          detectedTestFrameworks: [],
          excludedRoots: [],
          truncated: false,
          scanWarnings: [],
        },
        migrationWarning: null,
        bootstrapContext: context,
        candidates,
        sourceOnlySignals: [],
        suppressedCandidates,
        expected: {
          branch: "main",
          kbSnapshotId: "snap",
          workspaceSnapshot: "ws",
          sourceHashes: {},
        },
      });
    expect(present(claimed).structuredContent.plan.status).toBe("ready");
    const plan = present(
      claimed.filter((row) => row.candidateId.startsWith("claim:spec:")),
    ).structuredContent.plan;
    expect(plan.status).toBe("needs_context");
    expect(plan.diagnostics).toContain(
      "Knowledge source tracker (authoritative): 1 declared claim(s), 0 planned, 0 already in the KB, 0 filtered out, 1 not planned (see suppressedCandidates and source-only follow-ups).",
    );
    expect(plan.diagnostics).toContain(
      "Knowledge source spec (authoritative): 1 declared claim(s), 1 planned, 0 already in the KB, 0 filtered out, 0 not planned (see suppressedCandidates and source-only follow-ups).",
    );
    expect(plan.contextQuestions[0]).toContain('"Tracker"');
    const spec = claimed.filter((row) =>
      row.candidateId.startsWith("claim:spec:"),
    );
    const tracker = claimed.filter((row) =>
      row.candidateId.startsWith("claim:tracker:"),
    );
    // Claims already in the KB or excluded by the caller's filters are not lost.
    for (const reason of ["entity_exists", "filtered_by_entity_type"]) {
      const accounted = present(
        spec,
        tracker.map((row) => ({ candidateId: row.candidateId, reason })),
      ).structuredContent.plan;
      expect(accounted.status).toBe("ready");
    }
    // A supporting source that plans nothing is reported but does not block.
    const supporting = present(spec, [], {
      ...bootstrapContext,
      knowledgeSources: sources.map((source) =>
        source.id === "tracker"
          ? { ...source, authority: "supporting" }
          : source,
      ),
    }).structuredContent.plan;
    expect(supporting.status).toBe("ready");
    expect(supporting.diagnostics).toContain(
      "Knowledge source tracker (supporting): 1 declared claim(s), 0 planned, 0 already in the KB, 0 filtered out, 1 not planned (see suppressedCandidates and source-only follow-ups).",
    );
  });
  test("task markers are stripped and questions and invalid keys remain line-cited follow-ups", () => {
    const result = markdownCandidates(
      evidence(
        "# Requirements\n- [ ] Must support SSO\n- [x] Admins should review access\n- [ ] should we keep the CSV export?\n- [ ] 🚀 must 🚀",
      ),
      new Set(),
      0.8,
    );
    expect(result.candidates).toHaveLength(2);
    const subjects = result.candidates
      .flatMap((row) => row.applyPlan)
      .map((row) => (row.properties as Record<string, unknown>).subject_key)
      .filter(Boolean);
    expect(subjects).toContain("system");
    expect(subjects).toContain("admins");
    expect(subjects).not.toContain("x_admins");
    expect(result.sourceOnlySignals.map((row) => row.sourcePath)).toEqual(
      expect.arrayContaining(["requirements.md#L4", "requirements.md#L5"]),
    );
    expect(result.diagnostics.join("\n")).toContain("#L5");
  });
  test("one malformed intent claim does not prevent later claims from being modeled", () => {
    const context = normalizeBootstrapContext({
      knowledgeSources: [
        {
          id: "spec",
          title: "Spec",
          locator: "spec",
          kind: "specification",
          authority: "authoritative",
        },
      ],
      intentClaims: [
        { sourceId: "spec", reference: "line:1", statement: "🚀 must 🚀" },
        {
          sourceId: "spec",
          reference: "line:2",
          statement: "Telemetry must be disabled.",
        },
      ],
    });
    const result = buildIntentClaimCandidates(context, new Set(), 0.8);
    expect(result.candidates).toHaveLength(1);
    expect(result.sourceOnlySignals).toHaveLength(1);
    expect(result.diagnostics.join("\n")).toContain("line:1");
    for (const payload of result.candidates[0]?.applyPlan ?? [])
      expect(() => validateBootstrapPayload(payload, new Date())).not.toThrow();
  });
  test("typed extractor failures name the path and suppression reason", () => {
    const result = buildBootstrapCandidates(
      [
        evidence(
          "---\nid: REQ-broken\ntitle: Broken\nstatus: open\ntype: req\ninvalid: [\n---",
          "typed_markdown",
        ),
      ],
      new Set(),
      0.8,
      true,
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics.join("\n")).toContain("requirements.md");
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({
        reason: "extraction_failed",
        sourcePath: "requirements.md",
      }),
    );
  });
});
