import { describe, expect, test } from "bun:test";
import {
  KIBI_ENTITY_SCHEMA_DOC,
  KIBI_NO_IMPACT_DECLARATION,
  KIBI_STAGED_IMPACT_EVIDENCE_DOC,
  KIBI_SYMBOLS_MANIFEST_PATH,
  KIBI_SYMBOL_COORDINATES_PATH,
  type KibiImpactEvidence,
  type KibiImpactMode,
  type KibiImpactSymbolsManifest,
  getBehaviorSourcePaths,
  getFreshSymbolsManifestSourcePaths,
  getKbCoveredSourcePaths,
  getKbEvidencePaths,
  getMissingBehaviorSourcePaths,
  hasOverrideRationale,
} from "../../src/traceability/evidence-model.js";

// implements REQ-cli-staged-impact-enforcement

function evidence(
  mode: KibiImpactMode,
  symbolsManifest: Partial<KibiImpactSymbolsManifest> = {},
): KibiImpactEvidence {
  return {
    sourceChanges: [
      { path: "src/z.ts", kind: "behavior_source_edit" },
      { path: "src/n.ts", kind: "non_behavior_source_edit" },
      { path: "src/b.ts", kind: "behavior_source_edit" },
      { path: "src/m.ts", kind: "behavior_source_edit" },
    ],
    symbolsManifest: {
      path: ".kb/symbols.yaml",
      state: "not_required",
      sourcePaths: [],
      ...symbolsManifest,
    },
    mode,
  };
}

const kbChanges: KibiImpactMode = {
  kind: "kb_changes",
  kbArtifacts: [
    {
      kind: "entity_markdown",
      path: ".kb/requirements/REQ-z.md",
      entityTypes: ["req"],
      entityIds: ["REQ-z"],
      sourcePaths: ["src/z.ts", "src/a.ts"],
    },
    {
      kind: "entity_markdown",
      path: ".kb/requirements/REQ-a.md",
      entityTypes: ["req"],
      entityIds: ["REQ-a"],
      sourcePaths: ["src/a.ts"],
    },
  ],
};

const override = (rationale: string): KibiImpactMode => ({
  kind: "no_impact_override",
  override: {
    declaration: "Kibi-Impact: none",
    path: ".kibi/override.md",
    sourcePaths: ["src/z.ts"],
    reason: "false_positive",
    rationale,
  },
});

describe("evidence model constants", () => {
  test("name the canonical docs, paths and declaration", () => {
    expect(KIBI_STAGED_IMPACT_EVIDENCE_DOC).toBe(
      "docs/cli-reference.md#staged-impact-evidence",
    );
    expect(KIBI_ENTITY_SCHEMA_DOC).toBe("docs/entity-schema.md");
    expect(KIBI_SYMBOLS_MANIFEST_PATH).toBe(".kb/symbols.yaml");
    expect(KIBI_SYMBOL_COORDINATES_PATH).toBe(".kb/symbol-coordinates.yaml");
    expect(KIBI_NO_IMPACT_DECLARATION).toBe("Kibi-Impact: none");
  });
});

describe("evidence model selectors", () => {
  test("behavior paths are the sorted behavior edits", () => {
    expect(getBehaviorSourcePaths(evidence({ kind: "missing" }))).toStrictEqual(
      ["src/b.ts", "src/m.ts", "src/z.ts"],
    );
  });

  test("KB-covered paths are unique, sorted and only for KB changes", () => {
    expect(getKbCoveredSourcePaths(evidence(kbChanges))).toStrictEqual([
      "src/a.ts",
      "src/z.ts",
    ]);
    expect(getKbCoveredSourcePaths(evidence(override("r")))).toStrictEqual([]);
  });

  test("fresh manifest paths are sorted and only for a fresh manifest", () => {
    const paths = { sourcePaths: ["src/m.ts", "src/b.ts"] };
    expect(
      getFreshSymbolsManifestSourcePaths(
        evidence({ kind: "missing" }, { ...paths, state: "fresh" }),
      ),
    ).toStrictEqual(["src/b.ts", "src/m.ts"]);
    for (const state of ["stale", "not_required"] as const) {
      expect(
        getFreshSymbolsManifestSourcePaths(
          evidence({ kind: "missing" }, { ...paths, state }),
        ),
      ).toStrictEqual([]);
    }
  });

  test("evidence paths list KB artifacts and a fresh manifest", () => {
    expect(
      getKbEvidencePaths(evidence(kbChanges, { state: "fresh" })),
    ).toStrictEqual([
      ".kb/requirements/REQ-a.md",
      ".kb/requirements/REQ-z.md",
      ".kb/symbols.yaml",
    ]);
    expect(getKbEvidencePaths(evidence(kbChanges))).toStrictEqual([
      ".kb/requirements/REQ-a.md",
      ".kb/requirements/REQ-z.md",
    ]);
    expect(
      getKbEvidencePaths(evidence(override("r"), { state: "fresh" })),
    ).toStrictEqual([".kb/symbols.yaml"]);
    expect(getKbEvidencePaths(evidence({ kind: "missing" }))).toStrictEqual([]);
  });

  test("override rationale must be non-blank", () => {
    expect(hasOverrideRationale(evidence(override("because")))).toBe(true);
    expect(hasOverrideRationale(evidence(override("  ")))).toBe(false);
    expect(hasOverrideRationale(evidence(kbChanges))).toBe(false);
  });

  test("missing paths subtract KB and fresh manifest coverage", () => {
    expect(
      getMissingBehaviorSourcePaths(
        evidence(kbChanges, { state: "fresh", sourcePaths: ["src/b.ts"] }),
      ),
    ).toStrictEqual(["src/m.ts"]);
    expect(
      getMissingBehaviorSourcePaths(
        evidence(override("r"), { state: "stale", sourcePaths: ["src/b.ts"] }),
      ),
    ).toStrictEqual(["src/b.ts", "src/m.ts", "src/z.ts"]);
  });
});
