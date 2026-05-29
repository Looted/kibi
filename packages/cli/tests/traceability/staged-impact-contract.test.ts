import { describe, expect, it } from "bun:test";

import {
  KIBI_ENTITY_SCHEMA_DOC,
  KIBI_SYMBOLS_MANIFEST_PATH,
  type KibiImpactEvidence,
} from "../../src/traceability/evidence-model.js";
import { collectStagedKibiDiagnostics } from "../../src/traceability/staged-diagnostics.js";
import {
  type BehaviorSourceEditInput,
  type KibiImpactEvidenceInput,
  classifyKibiImpactEvidence,
  isAuditedNoImpactOverrideAllowed,
  isBehaviorSourceEdit,
  isSupportedBehaviorSourcePath,
  parseKibiImpactOverride,
} from "../../src/traceability/staged-impact-contract.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal BehaviorSourceEditInput with sensible defaults. */
function makeBehaviorEdit(
  overrides: Partial<BehaviorSourceEditInput> = {},
): BehaviorSourceEditInput {
  return {
    path: "packages/cli/src/traceability/check.ts",
    diffText: "-export function old() {}\n+export function updated() {}\n",
    intersectsBehaviorBearingSymbol: true,
    knownUserFacingSurface: true,
    ...overrides,
  };
}

/** Build a full KibiImpactEvidence snapshot for diagnostic collection. */
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

// ---------------------------------------------------------------------------
// isSupportedBehaviorSourcePath
// ---------------------------------------------------------------------------

describe("isSupportedBehaviorSourcePath", () => {
  it("accepts .ts files", () => {
    expect(isSupportedBehaviorSourcePath("src/foo.ts")).toBe(true);
  });

  it("accepts .tsx files", () => {
    expect(isSupportedBehaviorSourcePath("src/App.tsx")).toBe(true);
  });

  it("accepts .js files", () => {
    expect(isSupportedBehaviorSourcePath("src/foo.js")).toBe(true);
  });

  it("accepts .mts files", () => {
    expect(isSupportedBehaviorSourcePath("src/foo.mts")).toBe(true);
  });

  it("rejects lockfiles (bun.lock)", () => {
    expect(isSupportedBehaviorSourcePath("bun.lock")).toBe(false);
  });

  it("rejects lockfiles (package-lock.json)", () => {
    expect(isSupportedBehaviorSourcePath("package-lock.json")).toBe(false);
  });

  it("rejects yaml files", () => {
    expect(isSupportedBehaviorSourcePath("documentation/symbols.yaml")).toBe(
      false,
    );
  });

  it("rejects markdown files", () => {
    expect(
      isSupportedBehaviorSourcePath("documentation/requirements/REQ-001.md"),
    ).toBe(false);
  });

  it("rejects JSON files", () => {
    expect(isSupportedBehaviorSourcePath("tsconfig.json")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBehaviorSourceEdit
// ---------------------------------------------------------------------------

describe("isBehaviorSourceEdit", () => {
  it("returns true for a .ts edit intersecting behavior-bearing symbols with real changes", () => {
    const input = makeBehaviorEdit();
    expect(isBehaviorSourceEdit(input)).toBe(true);
  });

  it("returns false for a lockfile path regardless of content", () => {
    const input = makeBehaviorEdit({
      path: "bun.lock",
      diffText: '-"old-dep": "1.0"\n+"new-dep": "2.0"\n',
    });
    expect(isBehaviorSourceEdit(input)).toBe(false);
  });

  it("returns false for package-lock.json", () => {
    const input = makeBehaviorEdit({
      path: "package-lock.json",
      diffText: "-  old line\n+  new line\n",
    });
    expect(isBehaviorSourceEdit(input)).toBe(false);
  });

  it("returns false when the edit does not intersect behavior-bearing symbols and is not user-facing", () => {
    const input = makeBehaviorEdit({
      intersectsBehaviorBearingSymbol: false,
      knownUserFacingSurface: false,
    });
    expect(isBehaviorSourceEdit(input)).toBe(false);
  });

  it("returns false for comment-only changes", () => {
    const input = makeBehaviorEdit({
      diffText: "-// old comment\n+// new comment\n",
    });
    expect(isBehaviorSourceEdit(input)).toBe(false);
  });

  it("returns false for whitespace-only changes", () => {
    const input = makeBehaviorEdit({
      diffText: "-  \n+\n",
    });
    expect(isBehaviorSourceEdit(input)).toBe(false);
  });

  it("returns false when added lines are identical to removed lines (pure move)", () => {
    const input = makeBehaviorEdit({
      diffText: "-export function foo() {}\n+export function foo() {}\n",
    });
    expect(isBehaviorSourceEdit(input)).toBe(false);
  });

  it("returns true when intersectsBehaviorBearingSymbol is false but knownUserFacingSurface is true", () => {
    const input = makeBehaviorEdit({
      intersectsBehaviorBearingSymbol: false,
      knownUserFacingSurface: true,
    });
    expect(isBehaviorSourceEdit(input)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// classifyKibiImpactEvidence
// ---------------------------------------------------------------------------

describe("classifyKibiImpactEvidence", () => {
  it("classifies entity markdown under /requirements/ as entity_markdown", () => {
    const input: KibiImpactEvidenceInput = {
      filePath: "documentation/requirements/REQ-001.md",
    };
    expect(classifyKibiImpactEvidence(input)).toBe("entity_markdown");
  });

  it("classifies entity markdown under /scenarios/ as entity_markdown", () => {
    const input: KibiImpactEvidenceInput = {
      filePath: "documentation/scenarios/SCEN-001.md",
    };
    expect(classifyKibiImpactEvidence(input)).toBe("entity_markdown");
  });

  it("classifies entity markdown under /facts/ as entity_markdown", () => {
    const input: KibiImpactEvidenceInput = {
      filePath: "documentation/facts/FACT-001.md",
    };
    expect(classifyKibiImpactEvidence(input)).toBe("entity_markdown");
  });

  it("classifies a symbols manifest with changed extraction output as symbols_manifest", () => {
    const input: KibiImpactEvidenceInput = {
      filePath: "documentation/symbols.yaml",
      extractionOutputChanged: true,
    };
    expect(classifyKibiImpactEvidence(input)).toBe("symbols_manifest");
  });

  it("does NOT classify a symbols manifest when extraction output is unchanged", () => {
    const input: KibiImpactEvidenceInput = {
      filePath: "documentation/symbols.yaml",
      extractionOutputChanged: false,
    };
    expect(classifyKibiImpactEvidence(input)).toBeNull();
  });

  it("classifies a no-impact override with rationale as audited_no_impact", () => {
    const input: KibiImpactEvidenceInput = {
      overrideDeclared: true,
      overrideRationale: "Comment-only rewrite, no behavior change.",
    };
    expect(classifyKibiImpactEvidence(input)).toBe("audited_no_impact");
  });

  it("does NOT classify an override without rationale as audited_no_impact", () => {
    const input: KibiImpactEvidenceInput = {
      overrideDeclared: true,
      overrideRationale: null,
    };
    expect(classifyKibiImpactEvidence(input)).toBeNull();
  });

  it("returns null for an unrecognized file path", () => {
    const input: KibiImpactEvidenceInput = {
      filePath: "src/something.ts",
    };
    expect(classifyKibiImpactEvidence(input)).toBeNull();
  });

  it("returns null when no filePath is provided", () => {
    const input: KibiImpactEvidenceInput = {};
    expect(classifyKibiImpactEvidence(input)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseKibiImpactOverride
// ---------------------------------------------------------------------------

describe("parseKibiImpactOverride", () => {
  it("parses a Kibi-Impact: none declaration with rationale", () => {
    const result = parseKibiImpactOverride(
      "Kibi-Impact: none\nRationale: Comment-only rewrite.",
    );
    expect(result.declared).toBe(true);
    expect(result.rationale).toBe("Comment-only rewrite.");
  });

  it("parses a declaration without rationale", () => {
    const result = parseKibiImpactOverride("Kibi-Impact: none");
    expect(result.declared).toBe(true);
    expect(result.rationale).toBeNull();
  });

  it("returns declared=false for text without the declaration", () => {
    const result = parseKibiImpactOverride("Some other text");
    expect(result.declared).toBe(false);
    expect(result.rationale).toBeNull();
  });

  it("treats whitespace-only rationale as null", () => {
    const result = parseKibiImpactOverride("Kibi-Impact: none\nRationale:   ");
    expect(result.declared).toBe(true);
    expect(result.rationale).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isAuditedNoImpactOverrideAllowed
// ---------------------------------------------------------------------------

describe("isAuditedNoImpactOverrideAllowed", () => {
  it("allows override for non-behavior edit with declared override and rationale", () => {
    expect(
      isAuditedNoImpactOverrideAllowed({
        behaviorSourceEdit: false,
        override: { declared: true, rationale: "Whitespace-only change." },
      }),
    ).toBe(true);
  });

  it("rejects override for a genuine behavior source edit even with rationale", () => {
    expect(
      isAuditedNoImpactOverrideAllowed({
        behaviorSourceEdit: true,
        override: { declared: true, rationale: "Should not matter." },
      }),
    ).toBe(false);
  });

  it("rejects override when declaration is missing", () => {
    expect(
      isAuditedNoImpactOverrideAllowed({
        behaviorSourceEdit: false,
        override: { declared: false, rationale: "Some reason." },
      }),
    ).toBe(false);
  });

  it("rejects override when rationale is missing", () => {
    expect(
      isAuditedNoImpactOverrideAllowed({
        behaviorSourceEdit: false,
        override: { declared: true, rationale: null },
      }),
    ).toBe(false);
  });
});

// ===========================================================================
// Diagnostic flow: contract → diagnostics
// ===========================================================================

describe("staged diagnostics: kibi_impact_evidence_missing contract", () => {
  // -------------------------------------------------------------------------
  // 1. Behavior source edit WITHOUT KB evidence → fails staged check
  // -------------------------------------------------------------------------

  it("emits kibi_impact_evidence_missing when a .ts behavior edit has no KB/symbol evidence", () => {
    // A .ts file classified as behavior_source_edit with no KB artifacts
    // and no fresh symbols manifest.
    const evidence = makeEvidence({
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
    });

    const diagnostics = collectStagedKibiDiagnostics(evidence);

    expect(diagnostics).toContainEqual({
      id: "kibi_impact_evidence_missing",
      severity: "error",
      files: ["packages/cli/src/traceability/check.ts"],
      docs: [KIBI_ENTITY_SCHEMA_DOC],
      message: expect.stringContaining(
        "Behavior-changing staged files are missing Kibi impact evidence",
      ),
      suggestion: expect.stringContaining("Query Kibi via MCP"),
    });
  });

  // -------------------------------------------------------------------------
  // 2. Lockfile-only staged change → passes (advisory, not a behavior edit)
  // -------------------------------------------------------------------------

  it("emits no kibi_impact_evidence_missing for a lockfile-only change (not a behavior source edit)", () => {
    // bun.lock is NOT a supported behavior source extension, so the upstream
    // classifier should mark it as non_behavior_source_edit (or omit it).
    // We model the case where no behavior_source_edit entries exist at all.
    const evidence = makeEvidence({
      sourceChanges: [
        {
          path: "bun.lock",
          kind: "non_behavior_source_edit",
        },
      ],
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "not_required",
        sourcePaths: [],
      },
      mode: { kind: "missing" },
    });

    const diagnostics = collectStagedKibiDiagnostics(evidence);

    // No behavior source edits → no missing-evidence diagnostic
    const missingDiagnostic = diagnostics.find(
      (d) => d.id === "kibi_impact_evidence_missing",
    );
    expect(missingDiagnostic).toBeUndefined();
  });

  it("emits no kibi_impact_evidence_missing for package-lock.json change", () => {
    const evidence = makeEvidence({
      sourceChanges: [
        {
          path: "package-lock.json",
          kind: "non_behavior_source_edit",
        },
      ],
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "not_required",
        sourcePaths: [],
      },
      mode: { kind: "missing" },
    });

    const diagnostics = collectStagedKibiDiagnostics(evidence);

    const missingDiagnostic = diagnostics.find(
      (d) => d.id === "kibi_impact_evidence_missing",
    );
    expect(missingDiagnostic).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 3. Source edit WITH refreshed symbol coordinates → passes
  // -------------------------------------------------------------------------

  it("passes when a behavior source edit has a fresh symbols manifest covering the file", () => {
    const sourcePath = "packages/cli/src/traceability/check.ts";
    const evidence = makeEvidence({
      sourceChanges: [
        {
          path: sourcePath,
          kind: "behavior_source_edit",
        },
      ],
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "fresh",
        sourcePaths: [sourcePath],
      },
      mode: { kind: "missing" },
    });

    // Fresh symbols manifest covers the behavior source path → no diagnostics
    const diagnostics = collectStagedKibiDiagnostics(evidence);
    expect(diagnostics).toEqual([]);
  });

  it("passes when a behavior source edit is covered by staged KB entity markdown", () => {
    const sourcePath = "packages/cli/src/traceability/check.ts";
    const evidence = makeEvidence({
      sourceChanges: [
        {
          path: sourcePath,
          kind: "behavior_source_edit",
        },
      ],
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "not_required",
        sourcePaths: [],
      },
      mode: {
        kind: "kb_changes",
        kbArtifacts: [
          {
            kind: "entity_markdown",
            path: "documentation/requirements/REQ-cli-check.md",
            sourcePaths: [sourcePath],
            entityTypes: ["req"],
            entityIds: [],
          },
        ],
      },
    });

    const diagnostics = collectStagedKibiDiagnostics(evidence);
    expect(diagnostics).toEqual([]);
  });

  it("passes when multiple behavior edits are covered by a combination of KB artifacts and fresh manifest", () => {
    const sourceA = "packages/cli/src/traceability/check.ts";
    const sourceB = "packages/cli/src/traceability/evidence-model.ts";
    const evidence = makeEvidence({
      sourceChanges: [
        { path: sourceA, kind: "behavior_source_edit" },
        { path: sourceB, kind: "behavior_source_edit" },
      ],
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "fresh",
        sourcePaths: [sourceA],
      },
      mode: {
        kind: "kb_changes",
        kbArtifacts: [
          {
            kind: "entity_markdown",
            path: "documentation/requirements/REQ-evidence.md",
            sourcePaths: [sourceB],
            entityTypes: ["req"],
            entityIds: [],
          },
        ],
      },
    });

    const diagnostics = collectStagedKibiDiagnostics(evidence);
    expect(diagnostics).toEqual([]);
  });

  it("reports only uncovered behavior edits when some have evidence and some do not", () => {
    const covered = "packages/cli/src/traceability/check.ts";
    const uncovered = "packages/cli/src/traceability/audit.ts";
    const evidence = makeEvidence({
      sourceChanges: [
        { path: covered, kind: "behavior_source_edit" },
        { path: uncovered, kind: "behavior_source_edit" },
      ],
      symbolsManifest: {
        path: KIBI_SYMBOLS_MANIFEST_PATH,
        state: "fresh",
        sourcePaths: [covered],
      },
      mode: { kind: "missing" },
    });

    const diagnostics = collectStagedKibiDiagnostics(evidence);

    expect(diagnostics).toContainEqual({
      id: "kibi_impact_evidence_missing",
      severity: "error",
      files: [uncovered],
      docs: [KIBI_ENTITY_SCHEMA_DOC],
      message: expect.stringContaining(uncovered),
      suggestion: expect.any(String),
    });

    // Should NOT report the covered file
    const missingFiles = diagnostics
      .filter((d) => d.id === "kibi_impact_evidence_missing")
      .flatMap((d) => d.files);
    expect(missingFiles).not.toContain(covered);
  });
});
