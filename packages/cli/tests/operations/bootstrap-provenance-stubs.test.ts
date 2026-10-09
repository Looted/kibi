// implements REQ-bootstrap-provenance-stubs
import { describe, expect, test } from "bun:test";

import {
  buildBootstrapCandidates,
  isProvenanceStubCandidate,
} from "../../src/operations/bootstrap/candidates.js";
import { selectBootstrapCandidates } from "../../src/operations/bootstrap/generate.js";
import { presentBootstrap } from "../../src/operations/bootstrap/presentation.js";
import type {
  ActivationPolicy,
  BootstrapEvidence,
  Candidate,
  DiscoverySummary,
} from "../../src/operations/bootstrap/types.js";
import { PROVENANCE_STUB_TAG } from "../../src/provenance-stub.js";

type Step = {
  type: string;
  id: string;
  properties: Record<string, unknown>;
  document?: { body?: string };
};

function provider(
  provider: BootstrapEvidence["provider"],
  relativePath: string,
  data: Record<string, unknown>,
): BootstrapEvidence {
  return {
    provider,
    kind: provider as BootstrapEvidence["kind"],
    label: relativePath,
    relativePath,
    absolutePath: `/repo/${relativePath}`,
    data,
  };
}

function plannedSteps(evidence: readonly BootstrapEvidence[]): {
  candidates: readonly Candidate[];
  steps: Step[];
} {
  const built = buildBootstrapCandidates(evidence, new Set(), 0.5, true);
  return {
    candidates: built.candidates,
    steps: built.candidates.flatMap(
      (candidate) => candidate.applyPlan as unknown as Step[],
    ),
  };
}

function claimCandidate(index: number, sourceKind = "intent_claim"): Candidate {
  const type = sourceKind === "intent_claim" ? "req" : "fact";
  return {
    candidateId: `${sourceKind}:${index}`,
    entityType: type,
    title: `${sourceKind} claim ${index}`,
    sourceKind,
    sourcePath: `source:${sourceKind}:${index}`,
    confidence: 0.82,
    confidenceBand: "medium",
    evidence: [`citation:${index}`],
    relationships: [],
    applyPlan: [
      {
        type,
        id: `${type === "req" ? "REQ" : "FACT"}-${sourceKind}-${index}`,
        properties: {
          title: `${sourceKind} claim ${index}`,
          status: type === "req" ? "open" : "active",
          ...(type === "fact" ? { fact_kind: "observation" } : {}),
        },
        relationships: [],
      },
    ],
  };
}

function stubCandidate(index: number): Candidate {
  return {
    candidateId: `prov:source_symbols:src-module-${index}-ts`,
    entityType: "fact",
    title: `Source module: module-${index}`,
    sourceKind: "source_symbols",
    sourcePath: `/repo/src/module-${index}.ts`,
    // Stubs score above the claims so only the lane keeps them last.
    confidence: 0.95,
    confidenceBand: "high",
    evidence: [`source_symbols:src/module-${index}.ts`],
    relationships: [],
    applyPlan: [
      {
        type: "fact",
        id: `FACT-GEN-SOURCE-SYMBOLS-SRC-MODULE-${index}-TS`,
        properties: {
          title: `Source module: module-${index}`,
          status: "active",
          fact_kind: "meta",
          tags: [PROVENANCE_STUB_TAG],
        },
        relationships: [],
      },
    ],
  };
}

describe("bootstrap provider facts without a claim are provenance stubs", () => {
  test("source modules, repository metadata and layout roots are written as tagged meta facts", () => {
    const { steps } = plannedSteps([
      provider("source_symbols", "src/service.ts", {
        title: "Source module: service",
        factKind: "observation",
        confidence: 0.82,
        evidence: ["source_symbols:src/service.ts"],
        symbolCount: 4,
      }),
      provider("repo_metadata", "package.json", {
        title: "Repository metadata: package.json",
        factKind: "meta",
        confidence: 0.86,
        evidence: ["repo_metadata:package.json"],
      }),
      provider("repo_layout", "src", {
        title: "Repository layout: src directory",
        factKind: "observation",
        confidence: 0.84,
        evidence: ["repo_layout:src"],
      }),
      provider("test_topology", "tests/service.test.ts", {
        title: "Test topology: tests/service.test.ts",
        factKind: "observation",
        confidence: 0.85,
        evidence: ["test_topology:tests/service.test.ts"],
        frameworks: [],
      }),
    ]);
    expect(steps).toHaveLength(4);
    for (const step of steps) {
      expect(step.properties.fact_kind).toBe("meta");
      expect(step.properties.tags).toEqual([PROVENANCE_STUB_TAG]);
      expect(step.document?.body).toContain("provenance stub");
      expect(step.document?.body).toContain("Recorded deterministically by");
    }
  });

  test("a test topology entry that names its framework states a claim and stays an observation", () => {
    const { candidates, steps } = plannedSteps([
      provider("test_topology", "tests/service.test.ts", {
        title: "Test topology: bun:test",
        factKind: "observation",
        confidence: 0.92,
        evidence: ["test_topology:tests/service.test.ts", "framework:bun:test"],
        frameworks: ["bun:test"],
        claim: "tests/service.test.ts is a test file that runs under bun:test.",
      }),
    ]);
    const fact = steps.find((step) => step.type === "fact");
    expect(fact?.properties.fact_kind).toBe("observation");
    expect(fact?.properties).not.toHaveProperty("tags");
    expect(fact?.document?.body).toContain(
      "tests/service.test.ts is a test file that runs under bun:test.",
    );
    expect(fact?.document?.body).not.toContain("provenance stub");
    expect(candidates.some(isProvenanceStubCandidate)).toBe(false);
  });

  test("stubs take the discovered budget last and over_limit rows say which are stubs", () => {
    const claims = Array.from({ length: 3 }, (_, index) =>
      claimCandidate(index, "typed_markdown"),
    );
    const stubs = Array.from({ length: 4 }, (_, index) => stubCandidate(index));
    const selected = selectBootstrapCandidates(
      [...stubs, ...claims],
      new Set(),
      undefined,
      5,
    );
    // Every candidate with a claim is planned before any stub, whatever the
    // confidence order says.
    expect(
      selected.candidates.map((candidate) => candidate.sourceKind),
    ).toEqual([
      "typed_markdown",
      "typed_markdown",
      "typed_markdown",
      "source_symbols",
      "source_symbols",
    ]);
    const overLimit = selected.suppressed.filter(
      (row) => row.reason === "over_limit",
    );
    expect(overLimit).toHaveLength(2);
    expect(overLimit.every((row) => row.provenanceStub === true)).toBe(true);
    expect(selected.diagnostics).toContain(
      "2 discovered candidate(s) exceeded maxCandidates 5 and are suppressed as over_limit, 2 of them provenance stubs that state no claim (raise the limit only for the 0 with a claim); declared intent claims do not count against it.",
    );
  });

  test("the plan reports stubs apart from candidates with claims and tells the operator not to raise the limit for them", () => {
    const activation: ActivationPolicy = {
      activationState: "root_active_thin",
      activationMode: "attached_thin_bootstrap",
      applyBlocked: false,
      allowCandidateGeneration: true,
      reason: "thin KB",
    };
    const summary: DiscoverySummary = {
      activationState: "root_active_thin",
      activationMode: "attached_thin_bootstrap",
      applyBlocked: false,
      reason: "thin KB",
      providersRun: ["source_symbols"],
      providerCounts: { source_symbols: 3 },
      detectedLanguages: ["typescript"],
      detectedTestFrameworks: [],
      excludedRoots: [],
      truncated: false,
      scanWarnings: [],
    };
    const candidates = [
      claimCandidate(0),
      claimCandidate(1, "generic_markdown"),
      stubCandidate(0),
      stubCandidate(1),
    ];
    const result = presentBootstrap({
      root: "/repo",
      activation,
      discoverySummary: summary,
      migrationWarning: null,
      candidates,
      sourceOnlySignals: [],
      suppressedCandidates: [
        {
          candidateId: "prov:source_symbols:src-module-2-ts",
          reason: "over_limit",
          sourcePath: "/repo/src/module-2.ts",
          entityType: "fact",
          provenanceStub: true,
        },
        {
          candidateId: "generic_markdown:9",
          reason: "over_limit",
          sourcePath: "source:generic_markdown:9",
          entityType: "req",
          provenanceStub: false,
        },
      ],
      expected: {
        branch: "main",
        kbSnapshotId: "snapshot",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: {},
      },
    });
    const plan = result.structuredContent.plan;
    expect(plan.discoverySummary).toMatchObject({
      candidatesWithClaims: 2,
      provenanceStubs: 2,
      suppressedProvenanceStubs: 1,
    });
    expect(result.structuredContent.discoverySummary).toEqual(
      plan.discoverySummary,
    );
    expect(result.structuredContent.tldr).toContain(
      "over_limit (1 of 2 are provenance stubs that state no claim); raise the limit only for the 1 with a claim, or narrow entityTypes.",
    );
  });
});
