import { describe, expect, it } from "bun:test";
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
});
