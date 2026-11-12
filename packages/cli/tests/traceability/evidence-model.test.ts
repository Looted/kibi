import { describe, expect, it } from "bun:test";

import {
  KIBI_STAGED_IMPACT_EVIDENCE_DOC,
  KIBI_SYMBOLS_MANIFEST_PATH,
  type KibiImpactEvidence,
  getKbEvidencePaths,
  getMissingBehaviorSourcePaths,
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
            path: ".kb/requirements/REQ-cli-check.md",
            sourcePaths: ["packages/cli/src/traceability/check.ts"],
            entityTypes: ["req", "test"],
            entityIds: [],
          },
        ],
      },
    });

    expect(getKbEvidencePaths(evidence)).toEqual([
      ".kb/requirements/REQ-cli-check.md",
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
        blocking: true,
        category: "fact",
        files: ["packages/cli/src/traceability/check.ts"],
        docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
        message:
          "Behavior-changing staged files are missing staged Kibi impact evidence (see docs/cli-reference.md#staged-impact-evidence): packages/cli/src/traceability/check.ts",
        suggestion:
          "Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown or authored .kb/symbols.yaml metadata. Re-run kibi check --staged after staging tracked evidence.",
      },
    ]);
  });

  it("emits symbols_manifest_stale when .kb/symbols.yaml does not cover staged declarations", () => {
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
      blocking: true,
      category: "symbol",
      files: [
        KIBI_SYMBOLS_MANIFEST_PATH,
        "packages/cli/src/traceability/check.ts",
      ],
      docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
      message:
        ".kb/symbols.yaml does not cover the declarations of staged source files: packages/cli/src/traceability/check.ts",
      suggestion:
        "Stage .kb/symbols.yaml with the behavior edit, then re-run kibi check --staged.",
    });
  });

  it("names the authoring and removal steps for uncovered and vanished symbols", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "stale",
        sourcePaths: ["packages/cli/src/traceability/check.ts"],
        fileDetails: [
          {
            path: "packages/cli/src/traceability/check.ts",
            expectedCount: 2,
            coveredCount: 1,
            missing: [{ title: "checkLabel", line: 12 }],
            extra: ["checkOld"],
          },
        ],
      },
    });

    const stale = collectStagedKibiDiagnostics(evidence).find(
      (diagnostic) => diagnostic.id === "symbols_manifest_stale",
    );
    expect(stale?.details).toEqual([
      "packages/cli/src/traceability/check.ts — extraction finds 2 symbol(s), evidence covers 1.",
      "    Not in .kb/symbols.yaml: checkLabel (line 12)",
      "    Evidence without a matching symbol: checkOld",
    ]);
    expect(stale?.suggestion).toBe(
      "Author .kb/symbols.yaml entries for the uncovered symbols (kibi upsert, with implements/covered_by links), and re-point or remove (kibi delete) the .kb/symbols.yaml entries whose declaration is gone. Stage .kb/symbols.yaml with the behavior edit, then re-run kibi check --staged.",
    );
  });

  it("uses the configured symbols manifest path in stale diagnostics", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: "docs/symbols.yaml",
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
      files: ["docs/symbols.yaml", "packages/cli/src/traceability/check.ts"],
      docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
      message:
        "docs/symbols.yaml does not cover the declarations of staged source files: packages/cli/src/traceability/check.ts",
      suggestion:
        "Stage docs/symbols.yaml with the behavior edit, then re-run kibi check --staged.",
    });
  });

  it("uses the configured symbols manifest path in missing-evidence suggestions", () => {
    const evidence = makeEvidence({
      symbolsManifest: {
        path: "docs/symbols.yaml",
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
        "Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown or authored docs/symbols.yaml metadata. Re-run kibi check --staged after staging tracked evidence.",
    });
  });
});
