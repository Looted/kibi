import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  createSemanticReviewDiagnostics,
  createSymbolGranularityDiagnostics,
  hasBlockingImpactDiagnostics,
  hasBlockingQualityDiagnostics,
} from "../../../src/public/impact/diagnostics.js";
import type { KibiImpactDiagnostic } from "../../../src/traceability/staged-diagnostics.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function manifest(
  id: string,
  title: string,
  extra: {
    entity?: Record<string, unknown>;
    types?: string[];
    sourceFile?: string | undefined;
  } = {},
): ExtractionResult {
  return {
    entity: {
      id,
      type: "symbol",
      title,
      status: "active",
      source: ".kb/symbols.yaml",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...extra.entity,
    },
    relationships: (extra.types ?? ["implements"]).map((type) => ({
      type,
      from: id,
      to: "REQ-x",
    })),
    ...("sourceFile" in extra
      ? extra.sourceFile === undefined
        ? {}
        : { sourceFile: extra.sourceFile }
      : { sourceFile: "src/a.ts" }),
  } as ExtractionResult;
}

function extracted(
  name: string,
  kind: ExtractedSymbol["kind"],
  extra: Partial<ExtractedSymbol> = {},
): ExtractedSymbol {
  return {
    id: `SYM-${name}`,
    name,
    kind,
    role:
      kind === "function" || kind === "method"
        ? "behavioral"
        : kind === "class"
          ? "structural"
          : "type-shape",
    location: { file: "src/a.ts", startLine: 1, endLine: 2 },
    hunkRanges: [{ start: 1, end: 2 }],
    reqLinks: [],
    ...extra,
  } as ExtractedSymbol;
}

const SOURCE = [
  extracted("Upload", "class"),
  extracted("Upload.run", "method"),
  extracted("Upload.stop", "method"),
  extracted("Shape", "interface"),
  extracted("helper", "function"),
];

function granularity(
  results: ExtractionResult[],
  extra: Record<string, unknown> = {},
): KibiImpactDiagnostic[] {
  return createSymbolGranularityDiagnostics({
    manifestResults: results,
    symbolsByFile: new Map(),
    sourceSymbolsByFile: new Map([["src/a.ts", SOURCE]]),
    ...extra,
  });
}

describe("createSymbolGranularityDiagnostics", () => {
  test("blocks a coarse link on an extracted symbol", () => {
    expect(granularity([manifest("SYM-up", "Upload")])).toStrictEqual([
      {
        id: "symbol_granularity_violation",
        severity: "error",
        blocking: true,
        category: "symbol",
        entityId: "SYM-up",
        source: ".kb/symbols.yaml",
        files: [".kb/symbols.yaml", "src/a.ts"],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message:
          "Symbol SYM-up links src/a.ts coarsely while granular symbols are available (behavioral only): Upload.run, Upload.stop",
        suggestion:
          "Move ownership/coverage/test relationships to the narrow behavioral symbol, add a manifest behavioral anchor, or add granularity_reason with config-artifact, module-level-behavior, extractor-miss, legacy-link, or test-suite when the coarse symbol is intentional.",
        evidence: {
          sourceFile: "src/a.ts",
          title: "Upload",
          titleExtracted: true,
          granularSymbols: ["Upload.run", "Upload.stop"],
        },
      },
    ]);
  });

  test("explains a title the extractor does not produce", () => {
    const [diagnostic] = granularity([
      manifest("SYM-file", "a.ts", { entity: { source: "" } }),
    ]);
    expect(diagnostic).toStrictEqual({
      id: "symbol_granularity_violation",
      severity: "error",
      blocking: true,
      category: "symbol",
      entityId: "SYM-file",
      files: ["", "src/a.ts"],
      docs: ["docs/symbol-traceability-taxonomy.md"],
      message:
        "Symbol SYM-file names 'a.ts', which the source extractor does not produce for src/a.ts (private class members and removed or renamed declarations are not tracked), so it links src/a.ts coarsely while granular symbols are available (behavioral only): Upload.run, Upload.stop, helper",
      suggestion:
        "Re-point this symbol's relationships to the public declaration that owns the behavior (one of: Upload.run, Upload.stop, helper) or remove the symbol; add granularity_reason with config-artifact, module-level-behavior, extractor-miss, legacy-link, or test-suite only when coarse ownership is intentional. Non-behavioral symbols ignored for this decision: Shape, Upload.",
      evidence: {
        sourceFile: "src/a.ts",
        title: "a.ts",
        titleExtracted: false,
        granularSymbols: ["Upload.run", "Upload.stop", "helper"],
      },
    });
  });

  test("skips links that are allowed or cannot be judged", () => {
    expect(
      granularity(
        [
          manifest("SYM-inactive", "Upload"),
          manifest("SYM-nofile", "Upload", { sourceFile: undefined }),
          manifest("SYM-related", "Upload", { types: ["relates_to"] }),
          manifest("SYM-reason", "Upload", {
            entity: { granularity_reason: "legacy-link" },
          }),
          manifest("SYM-narrow", "Upload.run"),
          manifest("SYM-shape", "Shape2", { sourceFile: "src/b.ts" }),
          manifest("SYM-unknown-file", "x", { sourceFile: "src/none.ts" }),
        ],
        {
          activeEntityIds: new Set([
            "SYM-nofile",
            "SYM-related",
            "SYM-reason",
            "SYM-narrow",
            "SYM-shape",
            "SYM-unknown-file",
          ]),
          sourceSymbolsByFile: new Map([
            ["src/a.ts", SOURCE],
            [
              "src/b.ts",
              [extracted("Shape2", "interface"), extracted("T", "type")],
            ],
          ]),
        },
      ),
    ).toStrictEqual([]);
  });

  test("counts any traceability link among other relationships", () => {
    expect(
      granularity([
        manifest("SYM-a", "Upload", { types: ["relates_to", "covered_by"] }),
      ]).map((d) => d.entityId),
    ).toStrictEqual(["SYM-a"]);
  });

  test("skips a result without a source file before reading sources", () => {
    expect(
      createSymbolGranularityDiagnostics({
        manifestResults: [
          manifest("SYM-a", "Upload", { sourceFile: undefined }),
        ],
        symbolsByFile: new Map(),
      }),
    ).toStrictEqual([]);
  });

  test("judges declarations against changed symbols when the source has none", () => {
    const [diagnostic] = granularity([manifest("SYM-up", "Upload")], {
      symbolsByFile: new Map([
        [
          "src/a.ts",
          [
            extracted("Upload", "class"),
            extracted("Upload.go", "method"),
            extracted("helper", "function"),
          ],
        ],
      ]),
      sourceSymbolsByFile: new Map(),
    });
    expect(diagnostic?.evidence).toStrictEqual({
      sourceFile: "src/a.ts",
      title: "Upload",
      titleExtracted: true,
      granularSymbols: ["Upload.go"],
    });
  });

  test("checks every result when no active ids are given", () => {
    expect(
      granularity([
        manifest("SYM-a", "Upload"),
        manifest("SYM-b", "Upload"),
      ]).map((d) => d.entityId),
    ).toStrictEqual(["SYM-a", "SYM-b"]);
  });

  test("prefers changed symbols as candidates and falls back to them as source", () => {
    const changed = [extracted("Upload.go", "method")];
    const [withSource] = granularity([manifest("SYM-up", "Upload")], {
      symbolsByFile: new Map([["src/a.ts", changed]]),
    });
    expect(withSource?.evidence?.granularSymbols).toStrictEqual(["Upload.go"]);
    expect(withSource?.evidence?.titleExtracted).toBe(true);
    const [withoutSource] = granularity([manifest("SYM-up", "Upload")], {
      symbolsByFile: new Map([["src/a.ts", changed]]),
      sourceSymbolsByFile: new Map(),
    });
    expect(withoutSource?.evidence?.granularSymbols).toStrictEqual([
      "Upload.go",
    ]);
    expect(withoutSource?.evidence?.titleExtracted).toBe(false);
  });

  test("extracts source symbols from staged content or the workspace", () => {
    const content = "export class Upload {\n  run(): void {}\n}\n";
    const staged = createSymbolGranularityDiagnostics({
      manifestResults: [manifest("SYM-up", "Upload")],
      symbolsByFile: new Map(),
      sourceContentByFile: new Map([["src/a.ts", content]]),
      workspaceRoot: "/nonexistent",
    });
    expect(staged.map((d) => d.evidence?.granularSymbols)).toStrictEqual([
      ["Upload.run"],
    ]);

    const root = mkdtempSync(join(tmpdir(), "kibi-impact-diag-"));
    roots.push(root);
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "a.ts"), content);
    const fromDisk = createSymbolGranularityDiagnostics({
      manifestResults: [manifest("SYM-up", "Upload")],
      symbolsByFile: new Map(),
      workspaceRoot: root,
    });
    expect(fromDisk.map((d) => d.evidence?.granularSymbols)).toStrictEqual([
      ["Upload.run"],
    ]);
    const absolute = createSymbolGranularityDiagnostics({
      manifestResults: [
        manifest("SYM-up", "Upload", { sourceFile: join(root, "src", "a.ts") }),
      ],
      symbolsByFile: new Map(),
    });
    expect(absolute.map((d) => d.evidence?.granularSymbols)).toStrictEqual([
      ["Upload.run"],
    ]);
    expect(
      createSymbolGranularityDiagnostics({
        manifestResults: [
          manifest("SYM-up", "Upload", {
            sourceFile: "src/kibi-missing-file.ts",
          }),
        ],
        symbolsByFile: new Map(),
      }),
    ).toStrictEqual([]);
    expect(
      createSymbolGranularityDiagnostics({
        manifestResults: [manifest("SYM-up", "Upload")],
        symbolsByFile: new Map(),
        workspaceRoot: join(root, "missing"),
      }),
    ).toStrictEqual([]);
  });
});

describe("createSemanticReviewDiagnostics", () => {
  const linked = extracted("run", "function", {
    relationships: [
      { type: "covered_by", to: "TEST-a" },
      { type: "implements", to: "REQ-b" },
      { type: "implements", to: "REQ-b" },
      { type: "relates_to", to: "REQ-z" },
    ],
  });
  const bare = extracted("go", "function", {
    relationships: [{ type: "relates_to", to: "REQ-z" }],
  });

  test("asks to compare linked behavior with its coverage", () => {
    expect(
      createSemanticReviewDiagnostics({
        symbolsByFile: new Map([["src/a.ts", [linked]]]),
      }),
    ).toStrictEqual([
      {
        id: "symbol_semantic_review_needed",
        severity: "warning",
        blocking: false,
        category: "symbol",
        files: ["src/a.ts"],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message:
          "Changed behavioral symbol run needs semantic review against linked Kibi coverage: REQ-b, TEST-a",
        suggestion:
          "Use kb_search and kb_query for src/a.ts, then verify that REQ-b, TEST-a actually describe and test the changed behavior or UI copy. Update Kibi links or requirements/tests while the edit context is fresh.",
      },
    ]);
  });

  test("asks to record behavior in a file no requirement owns", () => {
    const [diagnostic] = createSemanticReviewDiagnostics({
      symbolsByFile: new Map([["src/a.ts", [bare]]]),
    });
    expect(diagnostic?.message).toBe(
      "Changed behavioral symbol go is in a file no requirement owns, so no recorded intent covers the behavior it has after this change",
    );
    expect(diagnostic?.suggestion).toBe(
      'If the change adds or alters behavior, record it as part of this change; that is part of finishing it, not a separate request, so it needs no permission: kb_search({query:"<the behavior>", sourceLocations:[{path:"src/a.ts"}]}) for a requirement that already describes it and link go to it; if none does, kb_upsert a requirement with a scenario and link the symbol with implements. If behavior is unchanged (a refactor, renaming), say so in the final report instead.',
    );
    const unlinkedOtherFile = createSemanticReviewDiagnostics({
      symbolsByFile: new Map([["src/a.ts", [bare]]]),
      linkedSourceFiles: new Set(["src/other.ts"]),
    });
    expect(unlinkedOtherFile[0]?.message).toBe(diagnostic?.message as string);
  });

  test("compares behavior in a file another symbol links", () => {
    const [diagnostic] = createSemanticReviewDiagnostics({
      symbolsByFile: new Map([["src/a.ts", [extracted("go", "function")]]]),
      linkedSourceFiles: new Set(["src/a.ts"]),
    });
    expect(diagnostic?.message).toBe(
      "Changed behavioral symbol go needs semantic review against linked Kibi coverage: linked requirements/tests",
    );
  });

  test("skips non-behavioral, class and unchanged symbols", () => {
    expect(
      createSemanticReviewDiagnostics({
        symbolsByFile: new Map([
          [
            "src/a.ts",
            [
              extracted("Shape", "interface"),
              extracted("Upload", "class", { role: "behavioral" }),
              extracted("idle", "function", { hunkRanges: [] }),
            ],
          ],
        ]),
      }),
    ).toStrictEqual([]);
  });
});

describe("blocking diagnostics", () => {
  const diagnostic = (blocking: boolean, severity: string) =>
    ({ blocking, severity }) as unknown as KibiImpactDiagnostic;

  test("a blocking flag or error severity blocks", () => {
    expect(hasBlockingQualityDiagnostics([])).toBe(false);
    expect(hasBlockingQualityDiagnostics([diagnostic(false, "warning")])).toBe(
      false,
    );
    expect(hasBlockingQualityDiagnostics([diagnostic(true, "warning")])).toBe(
      true,
    );
    expect(hasBlockingQualityDiagnostics([diagnostic(false, "error")])).toBe(
      true,
    );
    expect(hasBlockingImpactDiagnostics([diagnostic(false, "error")])).toBe(
      true,
    );
    expect(hasBlockingImpactDiagnostics([diagnostic(false, "review")])).toBe(
      false,
    );
  });
});
