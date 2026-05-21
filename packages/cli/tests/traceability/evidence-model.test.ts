import { describe, expect, it } from "bun:test";

import {
  KIBI_ENTITY_SCHEMA_DOC,
  KIBI_NO_IMPACT_DECLARATION,
  KIBI_SYMBOLS_MANIFEST_PATH,
  getKbEvidencePaths,
  getMissingBehaviorSourcePaths,
  hasOverrideRationale,
  type KibiImpactEvidence,
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
      path: KIBI_SYMBOLS_MANIFEST_PATH,
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
        path: KIBI_SYMBOLS_MANIFEST_PATH,
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
      KIBI_SYMBOLS_MANIFEST_PATH,
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
        files: ["packages/cli/src/traceability/check.ts"],
        docs: [KIBI_ENTITY_SCHEMA_DOC],
        message:
          "Behavior-changing staged files are missing Kibi impact evidence (see docs/entity-schema.md): packages/cli/src/traceability/check.ts",
        suggestion:
          "Query Kibi via MCP before deciding, then stage requirement/scenario/test/fact/symbol markdown evidence or a refreshed documentation/symbols.yaml that covers these files. Re-run kibi check --staged after staging the evidence.",
      },
    ]);
  });

  it("emits symbols_manifest_stale when documentation/symbols.yaml is stale for staged source files", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "stale",
        sourcePaths: ["packages/cli/src/traceability/check.ts"],
      },
    });

    expect(collectStagedKibiDiagnostics(evidence)).toContainEqual({
      id: "symbols_manifest_stale",
      severity: "error",
      files: [
        KIBI_SYMBOLS_MANIFEST_PATH,
        "packages/cli/src/traceability/check.ts",
      ],
      docs: [KIBI_ENTITY_SCHEMA_DOC],
      message:
        "documentation/symbols.yaml is stale or missing for staged source files: packages/cli/src/traceability/check.ts",
      suggestion:
        "Regenerate and stage documentation/symbols.yaml when symbol extraction output changes; do not treat the refreshed manifest as scope creep. Re-run kibi check --staged after staging the manifest.",
    });
  });

  it("emits symbols_manifest_stale when documentation/symbols.yaml is missing for staged source files", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "missing",
        sourcePaths: ["packages/cli/src/traceability/check.ts"],
      },
    });

    expect(collectStagedKibiDiagnostics(evidence)).toContainEqual({
      id: "symbols_manifest_stale",
      severity: "error",
      files: [
        KIBI_SYMBOLS_MANIFEST_PATH,
        "packages/cli/src/traceability/check.ts",
      ],
      docs: [KIBI_ENTITY_SCHEMA_DOC],
      message:
        "documentation/symbols.yaml is stale or missing for staged source files: packages/cli/src/traceability/check.ts",
      suggestion:
        "Regenerate and stage documentation/symbols.yaml when symbol extraction output changes; do not treat the refreshed manifest as scope creep. Re-run kibi check --staged after staging the manifest.",
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
        files: [
          "documentation/facts/FACT-kibi-impact-none.md",
          "packages/cli/src/traceability/comments.ts",
        ],
        docs: [KIBI_ENTITY_SCHEMA_DOC],
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
          rationale: "Comment-only rewrite; exported behavior and symbol graph are unchanged.",
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
      files: ["packages/cli/src/traceability/check.ts"],
      docs: [KIBI_ENTITY_SCHEMA_DOC],
      message:
        "Behavior-changing staged files are missing Kibi impact evidence (see docs/entity-schema.md): packages/cli/src/traceability/check.ts",
      suggestion:
        "Query Kibi via MCP before deciding, then stage requirement/scenario/test/fact/symbol markdown evidence or a refreshed documentation/symbols.yaml that covers these files. Re-run kibi check --staged after staging the evidence.",
    });
  });
});
