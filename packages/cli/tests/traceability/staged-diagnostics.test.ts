// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import {
  KIBI_NO_IMPACT_DECLARATION,
  type KibiImpactEvidence,
} from "../../src/traceability/evidence-model.js";
import {
  collectStagedKibiDiagnostics,
  createMissingOverrideRationaleDiagnostic,
} from "../../src/traceability/staged-diagnostics.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("collectStagedKibiDiagnostics symbols_manifest_stale and override rendering", () => {
  test("names the symbols manifest and returns early for empty overrides", () => {
    restores.push(isolateKibiEnv());
    const derived = collectStagedKibiDiagnostics(
      {
        sourceChanges: [{ path: "src/app.ts", kind: "behavior_source_edit" }],
        symbolsManifest: {
          path: "",
          state: "stale",
          sourcePaths: ["src/app.ts"],
        },
        mode: { kind: "missing" },
      },
      "docs/symbols.yaml",
    );
    expect(derived.some((row) => row.id === "symbols_manifest_stale")).toBe(
      true,
    );
    expect(derived[0]?.files[0]).toBe("docs/symbols.yaml");

    const emptyOverride: KibiImpactEvidence = {
      sourceChanges: [],
      symbolsManifest: {
        path: ".kb/symbols.yaml",
        state: "not_required",
        sourcePaths: [],
      },
      mode: {
        kind: "no_impact_override",
        override: {
          declaration: KIBI_NO_IMPACT_DECLARATION,
          path: ".kb/facts/FACT-none.md",
          sourcePaths: [],
          reason: "false_positive",
          rationale: "not needed",
        },
      },
    };
    expect(collectStagedKibiDiagnostics(emptyOverride)).toEqual([]);
  });

  test("rejects override-rationale diagnostics without a no-impact override", () => {
    restores.push(isolateKibiEnv());
    expect(() =>
      createMissingOverrideRationaleDiagnostic({
        sourceChanges: [],
        symbolsManifest: {
          path: ".kb/symbols.yaml",
          state: "not_required",
          sourcePaths: [],
        },
        mode: { kind: "missing" },
      }),
    ).toThrow(/no-impact override/);
  });

  test("names uncovered symbols in the Detail lines and author-first suggestion", () => {
    restores.push(isolateKibiEnv());
    const derived = collectStagedKibiDiagnostics({
      sourceChanges: [{ path: "src/app.ts", kind: "behavior_source_edit" }],
      symbolsManifest: {
        path: ".kb/symbols.yaml",
        state: "stale",
        sourcePaths: ["src/app.ts"],
        fileDetails: [
          {
            path: "src/app.ts",
            expectedCount: 8,
            coveredCount: 4,
            missing: [
              { title: "AppConfig", line: 5 },
              { title: "AppEnv", line: 9 },
            ],
            extra: [],
          },
        ],
      },
      mode: { kind: "missing" },
    });

    const stale = derived.find((row) => row.id === "symbols_manifest_stale");
    expect(stale?.details?.[0]).toContain(
      "src/app.ts — extraction finds 8 symbol(s), evidence covers 4.",
    );
    expect(stale?.details?.join("\n")).toContain(
      "Not in .kb/symbols.yaml: AppConfig (line 5), AppEnv (line 9)",
    );
    expect(stale?.suggestion).toContain(
      "Author .kb/symbols.yaml entries for the uncovered symbols",
    );
    expect(stale?.evidence).toMatchObject({
      symbolsManifest: [{ path: "src/app.ts", expectedCount: 8 }],
    });

    const missing = derived.find(
      (row) => row.id === "kibi_impact_evidence_missing",
    );
    expect(missing?.details?.join("\n")).toContain(
      "src/app.ts — symbols without authored evidence: AppConfig, AppEnv",
    );
    expect(missing?.suggestion).toContain(
      "author .kb/symbols.yaml entries (kibi upsert)",
    );
  });

  test("asks to re-point or retire orphaned entries when only extra evidence remains", () => {
    restores.push(isolateKibiEnv());
    const derived = collectStagedKibiDiagnostics({
      sourceChanges: [{ path: "src/app.ts", kind: "behavior_source_edit" }],
      symbolsManifest: {
        path: ".kb/symbols.yaml",
        state: "stale",
        sourcePaths: ["src/app.ts"],
        fileDetails: [
          {
            path: "src/app.ts",
            expectedCount: 1,
            coveredCount: 2,
            missing: [],
            extra: ["RemovedSymbol"],
          },
        ],
      },
      mode: { kind: "missing" },
    });

    const stale = derived.find((row) => row.id === "symbols_manifest_stale");
    expect(stale?.details?.join("\n")).toContain(
      "Evidence without a matching symbol: RemovedSymbol",
    );
    expect(stale?.suggestion).not.toContain("Author .kb/symbols.yaml entries");
    expect(stale?.suggestion).toContain(
      "Re-point or remove (kibi delete) the .kb/symbols.yaml entries whose declaration is gone",
    );
    expect(stale?.suggestion).not.toContain("refresh-symbol-coordinates");
  });
  test("renders every symbol name in text and JSON evidence", () => {
    restores.push(isolateKibiEnv());
    const extra = Array.from({ length: 9 }, (_, index) => `ghost${index + 1}`);
    const missing = Array.from({ length: 8 }, (_, index) => ({
      title: `symFn${index + 1}`,
      line: index * 3 + 1,
    }));
    const derived = collectStagedKibiDiagnostics({
      sourceChanges: [{ path: "src/app.ts", kind: "behavior_source_edit" }],
      symbolsManifest: {
        path: ".kb/symbols.yaml",
        state: "stale",
        sourcePaths: ["src/app.ts"],
        fileDetails: [
          {
            path: "src/app.ts",
            expectedCount: 10,
            coveredCount: 2,
            missing,
            extra,
          },
        ],
      },
      mode: { kind: "missing" },
    });

    const stale = derived.find((row) => row.id === "symbols_manifest_stale");
    const text = stale?.details?.join("\n") ?? "";
    expect(text).toContain(
      `Evidence without a matching symbol: ${extra.join(", ")}`,
    );
    expect(text).toContain(
      "symFn6 (line 16), symFn7 (line 19), symFn8 (line 22)",
    );
    expect(text).not.toContain("more");
    expect(stale?.evidence).toEqual({
      symbolsManifest: [
        {
          path: "src/app.ts",
          expectedCount: 10,
          coveredCount: 2,
          missing,
          extra,
        },
      ],
    });

    const uncovered = derived.find(
      (row) => row.id === "kibi_impact_evidence_missing",
    );
    expect(uncovered?.details?.join("\n")).toContain(
      `symbols without authored evidence: ${missing.map((entry) => entry.title).join(", ")}`,
    );
    expect(uncovered?.evidence).toEqual({
      uncoveredSymbols: [
        { path: "src/app.ts", titles: missing.map((entry) => entry.title) },
      ],
    });
  });
});
