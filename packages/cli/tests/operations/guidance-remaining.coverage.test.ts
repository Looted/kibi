// implements REQ-KIBI-BOOTSTRAP-PLAN
import { afterEach, describe, expect, test } from "bun:test";
import path from "node:path";
import { buildGuidance } from "../../src/operations/bootstrap/guidance.js";
import type {
  ActivationPolicy,
  BootstrapDeclaredContext,
  Candidate,
  SourceOnlySignal,
} from "../../src/operations/bootstrap/types.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function activation(
  overrides: Partial<ActivationPolicy> = {},
): ActivationPolicy {
  return {
    activationState: "root_uninitialized",
    activationMode: "cold_start_bootstrap",
    applyBlocked: false,
    allowCandidateGeneration: true,
    reason: "cold start",
    ...overrides,
  };
}

function declared(
  overrides: Partial<BootstrapDeclaredContext> = {},
): BootstrapDeclaredContext {
  return {
    sourceOfTruthPaths: ["docs/a.md", "docs/b.md"],
    sourceOfTruthNotes: [],
    priorityRoots: [],
    verificationAnchors: ["tests/a.test.ts"],
    ...overrides,
  };
}

function candidate(entityType: string, title: string): Candidate {
  return {
    candidateId: `CAND-${title}`,
    entityType,
    title,
    sourceKind: "typed_markdown",
    sourcePath: "docs/a.md",
    confidence: 0.8,
    confidenceBand: "high",
    evidence: ["docs/a.md"],
    relationships: [],
    applyPlan: [],
  };
}

describe("bootstrap guidance remaining relative, signal, and warning branches", () => {
  test("formats escaped paths, truncated summaries, signals, and warnings", () => {
    restores.push(isolateKibiEnv());
    const root = "/workspace/project";
    const signals: SourceOnlySignal[] = [
      {
        kind: "req",
        title: "Outside req",
        sourcePath: "/abs/secret.md",
        confidence: 0.4,
        evidence: [],
      },
      {
        kind: "scenario",
        title: "Parent scenario",
        sourcePath: path.join(root, "..", "outside", "scen.md"),
        confidence: 0.4,
        evidence: [],
      },
      {
        kind: "test",
        title: "Local test",
        sourcePath: path.join(root, "tests", "a.test.ts"),
        confidence: 0.5,
        evidence: [],
      },
      {
        kind: "req",
        title: "Extra",
        sourcePath: path.join(root, "docs", "extra.md"),
        confidence: 0.3,
        evidence: [],
      },
    ];
    const result = buildGuidance({
      root,
      activation: activation({
        activationMode: "attached_thin_handoff",
        activationState: "root_active_thin",
      }),
      declared: declared({
        projectSummary: "A compact editor",
        sourceOfTruthPaths: ["docs/a.md", "docs/b.md", "docs/c.md", "docs/d.md"],
      }),
      candidates: [candidate("req", "Retain drafts")],
      signals,
      warnings: ["scan truncated", "ignored vendored tree"],
    });
    expect(result.promptBlock).toMatch(/Author REQ\/SCENARIO\/TEST manually/);
    expect(result.promptBlock).toMatch(/\+1 more/);
    expect(result.confidence.reasons).toEqual(
      expect.arrayContaining([
        "Source-only evidence was routed into authoring guidance.",
      ]),
    );
    const warned = buildGuidance({
      root,
      activation: activation(),
      declared: declared({
        sourceOfTruthPaths: [],
        verificationAnchors: [],
      }),
      candidates: [],
      signals: [],
      warnings: ["scan truncated", "ignored vendored tree"],
    });
    expect(warned.promptBlock).toMatch(/Scan diagnostics: 2 warning/);
  });
});
