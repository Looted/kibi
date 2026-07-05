import { describe, expect, it } from "bun:test";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  buildNextActions,
  collectLinkedEntities,
  formatExtractedSymbols,
} from "../../../src/public/impact/summaries.js";
import type { SymbolsByFile } from "../../../src/public/impact/types.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

function symbol(
  id: string,
  name: string,
  relationships: ExtractedSymbol["relationships"] = [],
): ExtractedSymbol {
  return {
    id,
    name,
    kind: "function",
    role: "behavioral",
    location: { file: "src/upload.ts", startLine: 1, endLine: 3 },
    hunkRanges: [{ start: 1, end: 3 }],
    reqLinks: [],
    relationships,
  };
}

function manifestResult(
  id: string,
  sourceFile: string | undefined,
  relationships: ExtractionResult["relationships"],
): ExtractionResult {
  return {
    entity: {
      id,
      type: "symbol",
      title: id,
      status: "active",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
      source: "documentation/symbols.yaml",
    },
    relationships,
    ...(sourceFile !== undefined ? { sourceFile } : {}),
  };
}

describe("impact summaries", () => {
  it("formats extracted symbols with sorted names and traceability-only linked ids", () => {
    const symbolsByFile: SymbolsByFile = new Map([
      [
        "src/upload.ts",
        [
          symbol("SYM-B", "beta", [
            { type: "relates_to", to: "REQ-IGNORED" },
            { type: "implements", to: "REQ-B" },
            { type: "covered_by", to: "TEST-B" },
            { type: "implements", to: "REQ-B" },
          ]),
          symbol("SYM-A", "alpha"),
        ],
      ],
    ]);

    expect(formatExtractedSymbols(symbolsByFile)).toEqual([
      expect.objectContaining({ id: "SYM-A", name: "alpha", linkedEntityIds: [] }),
      expect.objectContaining({
        id: "SYM-B",
        name: "beta",
        linkedEntityIds: ["REQ-B", "TEST-B"],
      }),
    ]);
  });

  it("collects linked entities from changed symbols and active manifest entries", () => {
    const symbolsByFile: SymbolsByFile = new Map([
      [
        "src/upload.ts",
        [
          symbol("SYM-UPLOAD", "upload", [
            { type: "implements", to: "REQ-UPLOAD" },
            { type: "relates_to", to: "REQ-NOT-TRACEABILITY" },
          ]),
        ],
      ],
    ]);
    const manifestResults = [
      manifestResult("SYM-MANIFEST", "src/upload.ts", [
        { type: "covered_by", from: "SYM-MANIFEST", to: "TEST-UPLOAD" },
      ]),
      manifestResult("SYM-INACTIVE", "src/other.ts", [
        { type: "implements", from: "SYM-INACTIVE", to: "REQ-OTHER" },
      ]),
      manifestResult("SYM-NO-SOURCE", undefined, [
        { type: "implements", from: "SYM-NO-SOURCE", to: "REQ-NO-SOURCE" },
      ]),
    ];

    expect(
      collectLinkedEntities(
        symbolsByFile,
        manifestResults,
        new Set(["src/upload.ts"]),
      ),
    ).toEqual([
      {
        id: "REQ-UPLOAD",
        relationshipType: "implements",
        sourceSymbolId: "SYM-UPLOAD",
        sourceSymbolName: "upload",
      },
      {
        id: "TEST-UPLOAD",
        relationshipType: "covered_by",
        sourceSymbolId: "SYM-MANIFEST",
        sourceSymbolName: "SYM-MANIFEST",
      },
    ]);
  });

  it("returns no next actions when there are no source files", () => {
    expect(buildNextActions([])).toEqual([]);
  });

  it("builds discovery and exact lookup next actions for changed source files", () => {
    expect(buildNextActions(["src/a.ts", "src/b.ts"])).toEqual([
      'kb_search({ query: "src/a.ts src/b.ts" }) to discover requirements/tests that may describe the changed behavior.',
      'kb_query({ sourceFile: "src/a.ts" }) to inspect exact source-linked Kibi entities before deciding whether requirements/tests need updates.',
      'kb_query({ sourceFile: "src/b.ts" }) to inspect exact source-linked Kibi entities before deciding whether requirements/tests need updates.',
      "Update narrower symbols, requirements, tests, or strict facts when diagnostics show broad or stale modeling.",
      "rerun kb_check with the same sourceFiles/impact options after Kibi updates.",
    ]);
  });
});
