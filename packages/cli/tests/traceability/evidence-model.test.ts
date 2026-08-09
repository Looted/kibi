import { describe, expect, it } from "bun:test";

import {
  KIBI_NO_IMPACT_DECLARATION,
  KIBI_STAGED_IMPACT_EVIDENCE_DOC,
  KIBI_SYMBOL_COORDINATES_PATH,
  type KibiImpactEvidence,
  getKbEvidencePaths,
  getMissingBehaviorSourcePaths,
  hasOverrideRationale,
} from "../../src/traceability/evidence-model.js";
import { collectStagedKibiDiagnostics } from "../../src/traceability/staged-diagnostics.js";

function makeEvidence(
  overrides: Partial<KibiImpactEvidence> = {},
): KibiImpactEvidence {
  return {
    sourceChanges: [
      {
        path: "packages/cli/src/traceability/check.ts",
        kind: "behavior_source_edit",
      },
    ],
    symbolsManifest: {
      path: KIBI_SYMBOL_COORDINATES_PATH,
      state: "not_required",
      sourcePaths: [],
    },
    mode: { kind: "missing" },
    ...overrides,
  };
}

describe("evidence-model", () => {
  it("treats staged KB docs and a fresh symbols manifest as explicit Kibi impact evidence", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: KIBI_SYMBOL_COORDINATES_PATH,
        state: "fresh",
        sourcePaths: ["packages/cli/src/traceability/check.ts"],
      },
      mode: {
        kind: "kb_changes",
        kbArtifacts: [
          {
            kind: "entity_markdown",
            path: "documentation/requirements/REQ-cli-check.md",
            sourcePaths: ["packages/cli/src/traceability/check.ts"],
            entityTypes: ["req", "test"],
            entityIds: [],
          },
        ],
      },
    });

    expect(getKbEvidencePaths(evidence)).toEqual([
      "documentation/requirements/REQ-cli-check.md",
      KIBI_SYMBOL_COORDINATES_PATH,
    ]);
    expect(getMissingBehaviorSourcePaths(evidence)).toEqual([]);
    expect(collectStagedKibiDiagnostics(evidence)).toEqual([]);
  });

  it("emits kibi_impact_evidence_missing for behavior-changing staged files without KB evidence", () => {
    const evidence = makeEvidence();

    expect(collectStagedKibiDiagnostics(evidence)).toEqual([
      {
        id: "kibi_impact_evidence_missing",
        severity: "error",
        blocking: true,
        category: "fact",
        files: ["packages/cli/src/traceability/check.ts"],
        docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
        message:
          "Behavior-changing staged files are missing staged Kibi impact evidence (see docs/cli-reference.md#staged-impact-evidence): packages/cli/src/traceability/check.ts",
        suggestion:
          "Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown, authored documentation/symbols.yaml metadata, or refreshed documentation/symbol-coordinates.yaml. Re-run kibi check --staged after staging tracked evidence.",
      },
    ]);
  });

  it("emits symbols_manifest_stale when documentation/symbol-coordinates.yaml is stale for staged source files", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: KIBI_SYMBOL_COORDINATES_PATH,
        state: "stale",
        sourcePaths: ["packages/cli/src/traceability/check.ts"],
      },
    });

    expect(collectStagedKibiDiagnostics(evidence)).toContainEqual({
      id: "symbols_manifest_stale",
      severity: "error",
      blocking: true,
      category: "symbol",
      files: [
        KIBI_SYMBOL_COORDINATES_PATH,
        "packages/cli/src/traceability/check.ts",
      ],
      docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
      message:
        "documentation/symbol-coordinates.yaml is stale or missing for staged source files: packages/cli/src/traceability/check.ts",
      suggestion:
        "Run kibi sync --refresh-symbol-coordinates && git add documentation/symbol-coordinates.yaml documentation/symbols.yaml, then re-run kibi check --staged.",
    });
  });

  it("emits symbols_manifest_stale when documentation/symbol-coordinates.yaml is missing for staged source files", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: KIBI_SYMBOL_COORDINATES_PATH,
        state: "missing",
        sourcePaths: ["packages/cli/src/traceability/check.ts"],
      },
    });

    expect(collectStagedKibiDiagnostics(evidence)).toContainEqual({
      id: "symbols_manifest_stale",
      severity: "error",
      blocking: true,
      category: "symbol",
      files: [
        KIBI_SYMBOL_COORDINATES_PATH,
        "packages/cli/src/traceability/check.ts",
      ],
      docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
      message:
        "documentation/symbol-coordinates.yaml is stale or missing for staged source files: packages/cli/src/traceability/check.ts",
      suggestion:
        "Run kibi sync --refresh-symbol-coordinates && git add documentation/symbol-coordinates.yaml documentation/symbols.yaml, then re-run kibi check --staged.",
    });
  });

  it("uses the configured symbols manifest path in stale diagnostics", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: "docs/symbol-coordinates.yaml",
        state: "stale",
        sourcePaths: ["packages/cli/src/traceability/check.ts"],
      },
    });

    expect(
      collectStagedKibiDiagnostics(evidence, "docs/symbols.yaml"),
    ).toContainEqual({
      id: "symbols_manifest_stale",
      severity: "error",
      blocking: true,
      category: "symbol",
      files: [
        "docs/symbol-coordinates.yaml",
        "packages/cli/src/traceability/check.ts",
      ],
      docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
      message:
        "docs/symbol-coordinates.yaml is stale or missing for staged source files: packages/cli/src/traceability/check.ts",
      suggestion:
        "Run kibi sync --refresh-symbol-coordinates && git add docs/symbol-coordinates.yaml docs/symbols.yaml, then re-run kibi check --staged.",
    });
  });

  it("uses the configured symbols manifest path in missing-evidence suggestions", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: "docs/symbol-coordinates.yaml",
        state: "not_required",
        sourcePaths: [],
      },
    });

    expect(
      collectStagedKibiDiagnostics(evidence, "docs/symbols.yaml"),
    ).toContainEqual({
      id: "kibi_impact_evidence_missing",
      severity: "error",
      blocking: true,
      category: "fact",
      files: ["packages/cli/src/traceability/check.ts"],
      docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
      message:
        "Behavior-changing staged files are missing staged Kibi impact evidence (see docs/cli-reference.md#staged-impact-evidence): packages/cli/src/traceability/check.ts",
      suggestion:
        "Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown, authored docs/symbols.yaml metadata, or refreshed docs/symbol-coordinates.yaml. Re-run kibi check --staged after staging tracked evidence.",
    });
  });

  it("emits kibi_impact_override_missing_rationale when a no-impact override omits rationale", () => {
    const evidence = makeEvidence({
      sourceChanges: [
        {
          path: "packages/cli/src/traceability/comments.ts",
          kind: "non_behavior_source_edit",
        },
      ],
      mode: {
        kind: "no_impact_override",
        override: {
          declaration: KIBI_NO_IMPACT_DECLARATION,
          path: "documentation/facts/FACT-kibi-impact-none.md",
          sourcePaths: ["packages/cli/src/traceability/comments.ts"],
          reason: "non_behavioral_source_edit",
          rationale: "   ",
        },
      },
    });

    expect(hasOverrideRationale(evidence)).toBe(false);
    expect(collectStagedKibiDiagnostics(evidence)).toEqual([
      {
        id: "kibi_impact_override_missing_rationale",
        severity: "error",
        blocking: true,
        category: "fact",
        files: [
          "documentation/facts/FACT-kibi-impact-none.md",
          "packages/cli/src/traceability/comments.ts",
        ],
        docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
        message:
          "Kibi-Impact: none override is missing rationale for staged source files: packages/cli/src/traceability/comments.ts",
        suggestion:
          "Add a non-empty rationale in the same staged override record, keep overrides limited to false positives or non-behavioral source edits, and re-run kibi check --staged.",
      },
    ]);
  });

  it("allows a justified no-impact override for non-behavioral source edits", () => {
    const evidence = makeEvidence({
      sourceChanges: [
        {
          path: "packages/cli/src/traceability/comments.ts",
          kind: "non_behavior_source_edit",
        },
      ],
      mode: {
        kind: "no_impact_override",
        override: {
          declaration: KIBI_NO_IMPACT_DECLARATION,
          path: "documentation/facts/FACT-kibi-impact-none.md",
          sourcePaths: ["packages/cli/src/traceability/comments.ts"],
          reason: "false_positive",
          rationale:
            "Comment-only rewrite; exported behavior and symbol graph are unchanged.",
        },
      },
    });

    expect(hasOverrideRationale(evidence)).toBe(true);
    expect(collectStagedKibiDiagnostics(evidence)).toEqual([]);
  });

  it("does not let a no-impact override satisfy a genuine behavior_source_edit", () => {
    const evidence = makeEvidence({
      mode: {
        kind: "no_impact_override",
        override: {
          declaration: KIBI_NO_IMPACT_DECLARATION,
          path: "documentation/facts/FACT-kibi-impact-none.md",
          sourcePaths: ["packages/cli/src/traceability/check.ts"],
          reason: "false_positive",
          rationale: "This text should not waive a real behavior change.",
        },
      },
    });

    expect(getMissingBehaviorSourcePaths(evidence)).toEqual([
      "packages/cli/src/traceability/check.ts",
    ]);
    expect(collectStagedKibiDiagnostics(evidence)).toContainEqual({
      id: "kibi_impact_evidence_missing",
      severity: "error",
      blocking: true,
      category: "fact",
      files: ["packages/cli/src/traceability/check.ts"],
      docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
      message:
        "Behavior-changing staged files are missing staged Kibi impact evidence (see docs/cli-reference.md#staged-impact-evidence): packages/cli/src/traceability/check.ts",
      suggestion:
        "Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown, authored documentation/symbols.yaml metadata, or refreshed documentation/symbol-coordinates.yaml. Re-run kibi check --staged after staging tracked evidence.",
    });
  });
});
