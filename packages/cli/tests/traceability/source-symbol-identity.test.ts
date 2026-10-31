// executable_for TEST-source-analysis-v2-contract
import { expect, test } from "bun:test";
import type { SourceAnalysisResultV2 } from "kibi-plugin-sdk";
import {
  type ManifestLookupEntry,
  createManifestLookupSentinelKey,
  extractSymbolsFromStagedFileAsync,
} from "../../src/traceability/symbol-extract.js";

function analysis(names: string[]): SourceAnalysisResultV2 {
  return {
    contractVersion: "kibi.symbol-extractor.v2",
    status: "ok",
    sourceFile: "service.py",
    language: "python",
    module: { title: "service", language: "python", analysisMode: "parser" },
    diagnostics: [],
    uncoveredRanges: [],
    symbols: names.map((qualifiedName, index) => ({
      name: "execute",
      qualifiedName,
      kind: "method",
      startLine: index + 1,
      endLine: index + 1,
      startColumn: 0,
      endColumn: 3,
    })),
  };
}
const file = {
  path: "service.py",
  status: "A" as const,
  content: "one\ntwo",
  hunkRanges: [{ start: 1, end: 2 }],
};
const sentinel: [string, ManifestLookupEntry] = [
  createManifestLookupSentinelKey(".kb/symbols.yaml"),
  { id: "captured", relationships: [] },
];

test("qualified locators retain authored IDs without sharing bare-name ownership", async () => {
  const lookup = new Map<string, ManifestLookupEntry>([
    sentinel,
    [
      "service.py:First.execute",
      {
        id: "SYM-first",
        relationships: [{ type: "implements", to: "REQ-first" }],
      },
    ],
    [
      "service.py:execute",
      {
        id: "SYM-ambiguous",
        relationships: [{ type: "implements", to: "REQ-other" }],
      },
    ],
  ]);
  const symbols = await extractSymbolsFromStagedFileAsync(file, lookup, {
    analyzeText: () => analysis(["First.execute", "Second.execute"]),
  });
  expect(symbols[0]?.id).toBe("SYM-first");
  expect(symbols[0]?.reqLinks).toEqual(["REQ-first"]);
  expect(symbols[1]?.id).not.toBe("SYM-ambiguous");
  expect(symbols[1]?.reqLinks).toEqual([]);
});

test("duplicate qualified declarations cannot transfer one authored identity to both", async () => {
  const lookup = new Map<string, ManifestLookupEntry>([
    sentinel,
    ["service.py:Service.execute", { id: "SYM-authored", relationships: [] }],
  ]);
  await expect(
    extractSymbolsFromStagedFileAsync(file, lookup, {
      analyzeText: () => analysis(["Service.execute", "Service.execute"]),
    }),
  ).rejects.toThrow("Ambiguous declaration locator");
});

// executable_for TEST-kibi-tree-sitter-language-packs
test("a local partial gap validates the symbols declared outside it", async () => {
  const lookup = new Map<string, ManifestLookupEntry>([sentinel]);
  const partial = (
    codes: string[],
    ranges: SourceAnalysisResultV2["uncoveredRanges"],
  ): SourceAnalysisResultV2 => ({
    ...analysis(["Outside.execute", "Inside.execute"]),
    status: "partial",
    diagnostics: codes.map((code) => ({ code, message: code })),
    uncoveredRanges: ranges,
  });
  const gap = {
    startLine: 2,
    startColumn: 0,
    endLine: 2,
    endColumn: 3,
    reason: "include-may-alter-declarations",
  };
  const symbols = await extractSymbolsFromStagedFileAsync(file, lookup, {
    analyzeText: () => partial(["TREESITTER_INCLUDE_UNAVAILABLE"], [gap]),
  });
  expect(symbols.map((symbol) => symbol.location.startLine)).toEqual([1]);
  const { diagnostics: _omitted, ...withoutDiagnostics } = partial([], [gap]);
  expect(
    (
      await extractSymbolsFromStagedFileAsync(file, lookup, {
        analyzeText: () => withoutDiagnostics as SourceAnalysisResultV2,
      })
    ).length,
  ).toBe(1);
  // A whole-file gap, a truncated diagnostic list or no named range still
  // refuses complete validation.
  for (const [codes, ranges] of [
    [["TREESITTER_SYNTAX_ERROR"], [gap]],
    [["TREESITTER_DIAGNOSTIC_LIMIT"], [gap]],
    [["TREESITTER_INCLUDE_UNAVAILABLE"], []],
  ] as const)
    await expect(
      extractSymbolsFromStagedFileAsync(file, lookup, {
        analyzeText: () => partial([...codes], [...ranges]),
      }),
    ).rejects.toThrow("complete symbol validation is unavailable");
});
