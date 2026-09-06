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

describe("staged-diagnostics remaining coordinate derivation and empty override", () => {
  test("derives coordinates from the symbols manifest path and returns early for empty overrides", () => {
    restores.push(isolateKibiEnv());
    const derived = collectStagedKibiDiagnostics(
      {
        sourceChanges: [
          { path: "src/app.ts", kind: "behavior_source_edit" },
        ],
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
    expect(derived[0]?.files[0]).toBe("docs/symbol-coordinates.yaml");

    const emptyOverride: KibiImpactEvidence = {
      sourceChanges: [],
      symbolsManifest: {
        path: ".kb/symbol-coordinates.yaml",
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
          path: ".kb/symbol-coordinates.yaml",
          state: "not_required",
          sourcePaths: [],
        },
        mode: { kind: "missing" },
      }),
    ).toThrow(/no-impact override/);
  });
});
