import { describe, expect, test } from "bun:test";
import type {
  KibiImpactEvidence,
  KibiImpactMode,
  KibiImpactSymbolsManifest,
  KibiImpactSymbolsManifestFileDetail,
} from "../../src/traceability/evidence-model.js";
import { collectStagedKibiDiagnostics } from "../../src/traceability/staged-diagnostics.js";

// implements REQ-cli-staged-impact-enforcement

const DOC = "docs/cli-reference.md#staged-impact-evidence";
const BASE_SUGGESTION = (manifest: string) =>
  `Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown or authored ${manifest} metadata. Re-run kibi check --staged after staging tracked evidence.`;

function evidence(
  behaviorPaths: string[],
  mode: KibiImpactMode = { kind: "missing" },
  symbolsManifest: Partial<KibiImpactSymbolsManifest> = {},
): KibiImpactEvidence {
  return {
    sourceChanges: behaviorPaths.map((path) => ({
      path,
      kind: "behavior_source_edit",
    })),
    symbolsManifest: {
      path: ".kb/symbols.yaml",
      state: "not_required",
      sourcePaths: [],
      ...symbolsManifest,
    },
    mode,
  };
}

const detail = (
  path: string,
  missing: string[],
  extra: string[],
): KibiImpactSymbolsManifestFileDetail => ({
  path,
  expectedCount: missing.length + 2,
  coveredCount: 2,
  missing: missing.map((title, index) => ({ title, line: index + 10 })),
  extra,
});

describe("missing evidence diagnostic", () => {
  test("lists sorted missing behavior files with the default manifest", () => {
    expect(
      collectStagedKibiDiagnostics(evidence(["src/b.ts", "src/a.ts"])),
    ).toStrictEqual([
      {
        id: "kibi_impact_evidence_missing",
        severity: "error",
        blocking: true,
        category: "fact",
        files: ["src/a.ts", "src/b.ts"],
        docs: [DOC],
        message: `Behavior-changing staged files are missing staged Kibi impact evidence (see ${DOC}): src/a.ts, src/b.ts`,
        suggestion: BASE_SUGGESTION(".kb/symbols.yaml"),
      },
    ]);
  });

  test("no behavior files means no diagnostics", () => {
    expect(collectStagedKibiDiagnostics(evidence([]))).toStrictEqual([]);
  });

  test("names uncovered symbols of the missing files only", () => {
    const details = [
      detail("src/a.ts", ["alpha", "beta"], []),
      detail("src/b.ts", [], ["gone"]),
      detail("src/other.ts", ["other"], []),
    ];
    expect(
      collectStagedKibiDiagnostics(
        evidence(["src/a.ts", "src/b.ts"], undefined, {
          state: "not_required",
          sourcePaths: [],
          fileDetails: details,
        }),
        "custom.yaml",
      ),
    ).toStrictEqual([
      {
        id: "kibi_impact_evidence_missing",
        severity: "error",
        blocking: true,
        category: "fact",
        files: ["src/a.ts", "src/b.ts"],
        docs: [DOC],
        message: `Behavior-changing staged files are missing staged Kibi impact evidence (see ${DOC}): src/a.ts, src/b.ts`,
        suggestion: `${BASE_SUGGESTION("custom.yaml")} For symbol-level evidence, author custom.yaml entries (kibi upsert) for the listed uncovered symbols.`,
        details: ["src/a.ts — symbols without authored evidence: alpha, beta"],
        evidence: {
          uncoveredSymbols: [
            { path: "src/a.ts", titles: ["alpha", "beta"] },
            { path: "src/b.ts", titles: [] },
          ],
        },
      },
    ]);
  });

  test("file details without uncovered symbols add nothing", () => {
    const [diagnostic] = collectStagedKibiDiagnostics(
      evidence(["src/b.ts"], undefined, {
        fileDetails: [detail("src/b.ts", [], ["gone"])],
      }),
    );
    expect(diagnostic?.suggestion).toBe(BASE_SUGGESTION(".kb/symbols.yaml"));
    expect(diagnostic?.details).toBeUndefined();
  });
});

describe("stale manifest diagnostic", () => {
  const stale = (
    fileDetails?: KibiImpactSymbolsManifestFileDetail[],
  ): Record<string, unknown>[] =>
    collectStagedKibiDiagnostics(
      evidence([], undefined, {
        state: "stale",
        sourcePaths: ["src/z.ts", "src/a.ts"],
        ...(fileDetails ? { fileDetails } : {}),
      }),
      "m.yaml",
    ) as unknown as Record<string, unknown>[];
  const base = {
    id: "symbols_manifest_stale",
    severity: "error",
    blocking: true,
    category: "symbol",
    files: ["m.yaml", "src/a.ts", "src/z.ts"],
    docs: [DOC],
    message:
      "m.yaml does not cover the declarations of staged source files: src/a.ts, src/z.ts",
  };

  test("without details asks only to stage the manifest", () => {
    expect(stale()).toStrictEqual([
      {
        ...base,
        suggestion:
          "Stage m.yaml with the behavior edit, then re-run kibi check --staged.",
      },
    ]);
  });

  test("missing and extra symbols give both steps and detail lines", () => {
    const details = [
      detail("src/a.ts", ["alpha", "beta"], ["old1", "old2"]),
      detail("src/x.ts", ["ignored"], []),
      detail("src/z.ts", [], []),
    ];
    expect(stale(details)).toStrictEqual([
      {
        ...base,
        suggestion:
          "Author m.yaml entries for the uncovered symbols (kibi upsert, with implements/covered_by links), and re-point or remove (kibi delete) the m.yaml entries whose declaration is gone. Stage m.yaml with the behavior edit, then re-run kibi check --staged.",
        details: [
          "src/a.ts — extraction finds 4 symbol(s), evidence covers 2.",
          "    Not in m.yaml: alpha (line 10), beta (line 11)",
          "    Evidence without a matching symbol: old1, old2",
          "src/z.ts — extraction finds 2 symbol(s), evidence covers 2.",
        ],
        evidence: {
          symbolsManifest: [
            {
              path: "src/a.ts",
              expectedCount: 4,
              coveredCount: 2,
              missing: [
                { title: "alpha", line: 10 },
                { title: "beta", line: 11 },
              ],
              extra: ["old1", "old2"],
            },
            {
              path: "src/z.ts",
              expectedCount: 2,
              coveredCount: 2,
              missing: [],
              extra: [],
            },
          ],
        },
      },
    ]);
  });

  test("only extra symbols give the re-point step capitalized", () => {
    const [diagnostic] = stale([
      detail("src/z.ts", [], ["old"]),
      detail("src/a.ts", [], []),
    ]);
    expect(diagnostic?.suggestion).toBe(
      "Re-point or remove (kibi delete) the m.yaml entries whose declaration is gone. Stage m.yaml with the behavior edit, then re-run kibi check --staged.",
    );
  });

  test("only missing symbols give the author step", () => {
    const [diagnostic] = stale([
      detail("src/a.ts", [], []),
      detail("src/z.ts", ["n"], []),
    ]);
    expect(diagnostic?.suggestion).toBe(
      "Author m.yaml entries for the uncovered symbols (kibi upsert, with implements/covered_by links). Stage m.yaml with the behavior edit, then re-run kibi check --staged.",
    );
  });

  test("details with nothing missing or extra keep the plain suggestion", () => {
    const [diagnostic] = stale([detail("src/a.ts", [], [])]);
    expect(diagnostic?.suggestion).toBe(
      "Stage m.yaml with the behavior edit, then re-run kibi check --staged.",
    );
  });

  test("a stale manifest without paths and a fresh one report nothing", () => {
    expect(
      collectStagedKibiDiagnostics(
        evidence([], undefined, { state: "stale", sourcePaths: [] }),
      ),
    ).toStrictEqual([]);
    expect(
      collectStagedKibiDiagnostics(
        evidence([], undefined, { state: "fresh", sourcePaths: ["src/a.ts"] }),
      ),
    ).toStrictEqual([]);
    expect(
      collectStagedKibiDiagnostics(
        evidence([], undefined, {
          state: "not_required",
          sourcePaths: ["src/a.ts"],
        }),
      ),
    ).toStrictEqual([]);
  });
});
