import { describe, expect, test } from "bun:test";
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
  relationships?: ExtractedSymbol["relationships"],
): ExtractedSymbol {
  return {
    id,
    name,
    kind: "function",
    role: "behavioral",
    location: { file: "src/a.ts", startLine: 1, endLine: 3 },
    hunkRanges: [{ start: 1, end: 3 }],
    reqLinks: [],
    ...(relationships === undefined ? {} : { relationships }),
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
      title: `title ${id}`,
      status: "active",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
      source: ".kb/symbols.yaml",
    },
    relationships,
    ...(sourceFile === undefined ? {} : { sourceFile }),
  };
}

describe("formatExtractedSymbols", () => {
  test("formats symbols sorted by name with traceability links only", () => {
    const formatted = formatExtractedSymbols(
      new Map([
        [
          "src/a.ts",
          [
            symbol("SYM-B", "beta", [
              { type: "relates_to", to: "REQ-X" },
              { type: "implements", to: "REQ-B" },
              { type: "covered_by", to: "TEST-A" },
            ]),
            symbol("SYM-A", "alpha"),
          ],
        ],
      ]) as SymbolsByFile,
    );
    expect(formatted).toStrictEqual([
      {
        id: "SYM-A",
        name: "alpha",
        kind: "function",
        role: "behavioral",
        location: { file: "src/a.ts", startLine: 1, endLine: 3 },
        hunkRanges: [{ start: 1, end: 3 }],
        linkedEntityIds: [],
      },
      {
        id: "SYM-B",
        name: "beta",
        kind: "function",
        role: "behavioral",
        location: { file: "src/a.ts", startLine: 1, endLine: 3 },
        hunkRanges: [{ start: 1, end: 3 }],
        linkedEntityIds: ["REQ-B", "TEST-A"],
      },
    ]);
  });
});

describe("collectLinkedEntities", () => {
  test("collects symbol and active manifest links sorted by id", () => {
    const symbolsByFile: SymbolsByFile = new Map([
      [
        "src/a.ts",
        [
          symbol("SYM-1", "one", [
            { type: "implements", to: "REQ-Z" },
            { type: "relates_to", to: "REQ-IGNORED" },
          ]),
          symbol("SYM-2", "two"),
        ],
      ],
    ]);
    const linked = collectLinkedEntities(
      symbolsByFile,
      [
        manifestResult("SYM-M", "src/a.ts", [
          { type: "covered_by", from: "SYM-M", to: "TEST-A" },
          { type: "relates_to", from: "SYM-M", to: "REQ-NOPE" },
        ]),
        manifestResult("SYM-OFF", "src/other.ts", [
          { type: "implements", from: "SYM-OFF", to: "REQ-OFF" },
        ]),
        manifestResult("SYM-NONE", undefined, [
          { type: "implements", from: "SYM-NONE", to: "REQ-NONE" },
        ]),
      ],
      new Set(["src/a.ts"]),
    );
    expect(linked).toStrictEqual(
      [
        {
          id: "REQ-Z",
          relationshipType: "implements",
          sourceSymbolId: "SYM-1",
          sourceSymbolName: "one",
        },
        {
          id: "TEST-A",
          relationshipType: "covered_by",
          sourceSymbolId: "SYM-M",
          sourceSymbolName: "title SYM-M",
        },
      ].sort((left, right) => left.id.localeCompare(right.id)),
    );
    expect(linked.map((entity) => entity.id)).toStrictEqual([
      "REQ-Z",
      "TEST-A",
    ]);
  });

  test("sorts links by entity id and de-duplicates identical links", () => {
    const linked = collectLinkedEntities(
      new Map([
        [
          "src/a.ts",
          [
            symbol("SYM-1", "one", [
              { type: "implements", to: "REQ-C" },
              { type: "implements", to: "REQ-A" },
              { type: "implements", to: "REQ-C" },
              { type: "implements", to: "REQ-B" },
            ]),
          ],
        ],
      ]),
      [],
      new Set(),
    );
    expect(linked.map((entity) => entity.id)).toStrictEqual([
      "REQ-A",
      "REQ-B",
      "REQ-C",
    ]);
  });
});

describe("buildNextActions", () => {
  test("returns nothing without source files", () => {
    expect(buildNextActions([])).toStrictEqual([]);
  });

  test("lists the follow-up actions for each source file", () => {
    expect(buildNextActions(["src/a.ts", "src/b.ts"])).toStrictEqual([
      'kb_search({ query: "src/a.ts src/b.ts" }) to discover requirements/tests that may describe the changed behavior.',
      'kb_query({ sourceFile: "src/a.ts" }) to inspect exact source-linked Kibi entities before deciding whether requirements/tests need updates.',
      'kb_query({ sourceFile: "src/b.ts" }) to inspect exact source-linked Kibi entities before deciding whether requirements/tests need updates.',
      "Update narrower symbols, requirements, tests, or strict facts when diagnostics show broad or stale modeling.",
      "rerun kb_check with the same sourceFiles/impact options after Kibi updates.",
    ]);
  });
});
