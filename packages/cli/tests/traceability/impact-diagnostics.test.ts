import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtractionResult } from "../../src/extractors/markdown.js";
import {
  createSemanticReviewDiagnostics,
  createSymbolGranularityDiagnostics,
  hasBlockingImpactDiagnostics,
} from "../../src/public/impact-diagnostics.js";
import type { ExtractedSymbol } from "../../src/traceability/symbol-extract.js";

function makeSymbol(overrides: Partial<ExtractedSymbol> = {}): ExtractedSymbol {
  return {
    id: "SYM-HASH",
    name: "UploadPageComponent.processingProgressLabel",
    kind: "property",
    role: "behavioral",
    location: {
      file: "src/app/pages/upload/upload-page.component.ts",
      startLine: 2,
      endLine: 2,
    },
    hunkRanges: [{ start: 2, end: 2 }],
    reqLinks: [],
    ...overrides,
  };
}

function makeManifestResult(
  title: string,
  granularityReason?: string,
): ExtractionResult {
  return {
    entity: {
      id: `SYM-${title.replace(/[^A-Za-z0-9]/g, "-").toUpperCase()}`,
      type: "symbol",
      title,
      status: "active",
      created_at: "2026-06-25T00:00:00.000Z",
      updated_at: "2026-06-25T00:00:00.000Z",
      source: "documentation/symbols.yaml",
      ...(granularityReason ? { granularity_reason: granularityReason } : {}),
    },
    sourceFile: "src/app/pages/upload/upload-page.component.ts",
    relationships: [
      { type: "implements", from: "SYM-UPLOAD-PAGE", to: "REQ-UPLOAD" },
      { type: "covered_by", from: "SYM-UPLOAD-PAGE", to: "TEST-UPLOAD" },
    ],
  };
}

describe("impact diagnostics", () => {
  it("emits a hard granularity diagnostic for changed class-property behavior hidden by coarse class ownership", () => {
    const symbolsByFile = new Map<string, ExtractedSymbol[]>([
      [
        "src/app/pages/upload/upload-page.component.ts",
        [
          makeSymbol({
            id: "SYM-UPLOAD-PAGE",
            name: "UploadPageComponent",
            kind: "class",
            location: {
              file: "src/app/pages/upload/upload-page.component.ts",
              startLine: 1,
              endLine: 6,
            },
          }),
          makeSymbol(),
        ],
      ],
    ]);

    const diagnostics = createSymbolGranularityDiagnostics({
      manifestResults: [makeManifestResult("UploadPageComponent")],
      symbolsByFile,
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "symbol_granularity_violation",
        severity: "error",
        blocking: true,
        message: expect.stringContaining(
          "UploadPageComponent.processingProgressLabel",
        ),
      }),
    ]);
    expect(hasBlockingImpactDiagnostics(diagnostics)).toBe(true);
  });

  it("keeps intentional module-level ownership from becoming a hard granularity blocker", () => {
    const symbolsByFile = new Map<string, ExtractedSymbol[]>([
      ["src/app/pages/upload/upload-page.component.ts", [makeSymbol()]],
    ]);

    expect(
      createSymbolGranularityDiagnostics({
        manifestResults: [
          makeManifestResult("UploadPageComponent", "module-level-behavior"),
        ],
        symbolsByFile,
      }),
    ).toEqual([]);
  });

  it("ignores inactive manifest entries when staged diagnostics are scoped to active symbol IDs", () => {
    const symbolsByFile = new Map<string, ExtractedSymbol[]>([
      [
        "src/app/pages/upload/upload-page.component.ts",
        [
          makeSymbol(),
          makeSymbol({
            id: "SYM-UPLOAD-PAGE",
            name: "UploadPageComponent",
            kind: "class",
            location: {
              file: "src/app/pages/upload/upload-page.component.ts",
              startLine: 1,
              endLine: 6,
            },
          }),
          makeSymbol({
            id: "SYM-LEGACY-PROPERTY",
            name: "LegacyFeature.run",
          }),
        ],
      ],
    ]);
    const activeManifestResult = makeManifestResult("UploadPageComponent");

    const diagnostics = createSymbolGranularityDiagnostics({
      manifestResults: [
        makeManifestResult("LegacyFeature"),
        activeManifestResult,
      ],
      activeEntityIds: new Set([activeManifestResult.entity.id]),
      symbolsByFile,
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "symbol_granularity_violation",
        message: expect.stringContaining("UploadPageComponent"),
      }),
    ]);
  });

  it("emits a semantic review warning for changed behavior even when narrow coverage exists", () => {
    const symbol = makeSymbol({
      id: "SYM-UPLOAD-PAGE-PROGRESS-LABEL",
      relationships: [
        { type: "implements", to: "REQ-VIDEO-UPLOAD-PROGRESS" },
        { type: "covered_by", to: "TEST-DASH-001" },
      ],
    });

    const diagnostics = createSemanticReviewDiagnostics({
      symbolsByFile: new Map([[symbol.location.file, [symbol]]]),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "symbol_semantic_review_needed",
        severity: "warning",
        blocking: false,
        message: expect.stringContaining(
          "UploadPageComponent.processingProgressLabel",
        ),
        suggestion: expect.stringContaining("REQ-VIDEO-UPLOAD-PROGRESS"),
      }),
    ]);
    expect(hasBlockingImpactDiagnostics(diagnostics)).toBe(false);
  });

  it("reads staged source content to report narrower behavioral symbols and ignored non-behavioral symbols", () => {
    const sourceFile = "src/app/pages/upload/upload-page.component.ts";
    const sourceContent = [
      "export class UploadPageComponent {",
      "  processingProgressLabel = 'Uploading';",
      "}",
      "export interface UploadPageComponentProps { value: string }",
      "",
    ].join("\n");

    const diagnostics = createSymbolGranularityDiagnostics({
      manifestResults: [makeManifestResult("UploadPageComponent")],
      symbolsByFile: new Map(),
      sourceContentByFile: new Map([[sourceFile, sourceContent]]),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "symbol_granularity_violation",
        message: expect.stringContaining(
          "UploadPageComponent.processingProgressLabel",
        ),
      }),
    ]);
  });

  it("mentions ignored non-behavioral symbols when narrower type-shape candidates exist", () => {
    const behavioral = makeSymbol({
      name: "UploadPageComponent.processingProgressLabel",
      kind: "property",
      role: "behavioral",
    });
    const typeShape = makeSymbol({
      name: "UploadPageComponent.Props",
      kind: "interface",
      role: "type-shape",
    });

    const diagnostics = createSymbolGranularityDiagnostics({
      manifestResults: [makeManifestResult("UploadPageComponent")],
      symbolsByFile: new Map([
        [behavioral.location.file, [behavioral, typeShape]],
      ]),
    });

    expect(diagnostics[0]?.suggestion).toContain(
      "Non-behavioral symbols ignored",
    );
  });

  it("reads source files from workspace root when no staged content map is supplied", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-impact-test-"));
    const sourceFile = path.join(tmpDir, "fixture.ts");
    fs.writeFileSync(
      sourceFile,
      'export class FixtureComponent {\n  value = "ok";\n}',
    );

    try {
      const diagnostics = createSymbolGranularityDiagnostics({
        manifestResults: [
          {
            ...makeManifestResult("FixtureComponent"),
            sourceFile,
          },
        ],
        symbolsByFile: new Map(),
        workspaceRoot: tmpDir,
      });

      expect(diagnostics).toEqual([
        expect.objectContaining({
          id: "symbol_granularity_violation",
          message: expect.stringContaining("FixtureComponent.value"),
        }),
      ]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("skips missing source files when manifest entries cannot be read", () => {
    expect(
      createSymbolGranularityDiagnostics({
        manifestResults: [
          {
            ...makeManifestResult("MissingComponent"),
            sourceFile: "src/does-not-exist.ts",
          },
        ],
        symbolsByFile: new Map(),
        workspaceRoot: process.cwd(),
      }),
    ).toEqual([]);
  });

  it("skips semantic review for class and non-behavioral changed symbols", () => {
    const classSymbol = makeSymbol({
      name: "UploadPageComponent",
      kind: "class",
      role: "behavioral",
    });
    const typeSymbol = makeSymbol({
      name: "UploadPageComponentProps",
      kind: "interface",
      role: "type-shape",
    });

    expect(
      createSemanticReviewDiagnostics({
        symbolsByFile: new Map([
          [classSymbol.location.file, [classSymbol, typeSymbol]],
        ]),
      }),
    ).toEqual([]);
  });

  it("uses fallback linked-target wording when changed behavior has no traceability links", () => {
    const diagnostics = createSemanticReviewDiagnostics({
      symbolsByFile: new Map([["src/upload.ts", [makeSymbol()]]]),
    });

    expect(diagnostics[0]?.message).toContain("linked requirements/tests");
  });
});
