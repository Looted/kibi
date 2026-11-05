import { describe, expect, test } from "bun:test";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  AGGREGATE_KINDS,
  type SymbolMetadata,
  collectSymbols,
  isModuleOrConfig,
  narrowerExtractedSymbols,
  narrowerManifestSymbols,
} from "../../../src/public/impact/symbol-quality-model.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

function result(
  id: string,
  entity: Record<string, unknown> = {},
  extra: Partial<ExtractionResult> = {},
): ExtractionResult {
  return {
    entity: {
      id,
      type: "symbol",
      title: id,
      status: "active",
      source: `src/${id}.ts`,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...entity,
    },
    relationships: [],
    sourceFile: "src/a.ts",
    ...extra,
  } as ExtractionResult;
}

function collect(
  results: ExtractionResult[],
  activeEntityIds?: ReadonlySet<string>,
): readonly SymbolMetadata[] {
  return collectSymbols({
    manifestResults: results,
    symbolsByFile: new Map(),
    ...(activeEntityIds === undefined ? {} : { activeEntityIds }),
  });
}

function only(entity: Record<string, unknown>): SymbolMetadata {
  const [symbol] = collect([result("S", entity)]);
  if (symbol === undefined) throw new Error("no symbol");
  return symbol;
}

describe("AGGREGATE_KINDS", () => {
  test("lists the aggregate kinds", () => {
    expect([...AGGREGATE_KINDS]).toStrictEqual([
      "class",
      "component",
      "service",
      "module",
    ]);
  });
});

describe("collectSymbols", () => {
  test("builds full metadata for an active symbol", () => {
    const source = result(
      "SYM-a",
      {
        title: "parse",
        symbol_kind: "function",
        sourceLine: 1,
        sourceColumn: 2,
        sourceEndLine: 3,
        sourceEndColumn: 4,
      },
      {
        relationships: [
          { type: "implements", from: "SYM-a", to: "REQ-b" },
          { type: "implements", from: "SYM-a", to: "REQ-a" },
          { type: "implements", from: "SYM-a", to: "REQ-b" },
          { type: "implements", from: "SYM-a", to: "TEST-x" },
          { type: "covered_by", from: "SYM-a", to: "REQ-c" },
        ],
      },
    );
    expect(collect([source])).toStrictEqual([
      {
        result: source,
        id: "SYM-a",
        title: "parse",
        sourceFile: "src/a.ts",
        source: "src/SYM-a.ts",
        kind: "function",
        role: "behavioral",
        requirementTargetIds: ["REQ-a", "REQ-b"],
        coordinateKey: "1:2:3:4",
      },
    ]);
  });

  test("leaves the coordinate key null when any coordinate is missing", () => {
    const full = {
      sourceLine: 1,
      sourceColumn: 2,
      sourceEndLine: 3,
      sourceEndColumn: 4,
    };
    for (const missing of Object.keys(full)) {
      const entity: Record<string, unknown> = { ...full };
      delete entity[missing];
      expect(only(entity).coordinateKey).toBeNull();
    }
  });

  test("keeps only active symbols with a source file", () => {
    const results = [
      result("SYM-ok"),
      result("REQ-x", { type: "req" }),
      result("SYM-old", { status: "deprecated" }),
      result("SYM-nofile", {}, { sourceFile: undefined }),
    ];
    expect(collect(results).map((symbol) => symbol.id)).toStrictEqual([
      "SYM-ok",
    ]);
  });

  test("filters by the active entity ids when given", () => {
    const results = [
      result("SYM-a"),
      result("SYM-b"),
      result("SYM-c", { status: "deprecated" }),
    ];
    expect(
      collect(results, new Set(["SYM-b", "SYM-c"])).map((symbol) => symbol.id),
    ).toStrictEqual(["SYM-b"]);
  });
});

describe("kind inference", () => {
  test.each([
    ["component", "XService"],
    ["service", "XComponent"],
    ["module", "XComponent"],
    ["config", "XComponent"],
    ["function", "XComponent"],
    ["class", "XComponent"],
    ["method", "XComponent"],
    ["property", "XComponent"],
    ["accessor", "XComponent"],
    ["interface", "XComponent"],
    ["type", "XComponent"],
    ["variable", "XComponent"],
    ["enum", "XComponent"],
    ["unknown", "XComponent"],
  ])("keeps an explicit %p kind", (symbol_kind, title) => {
    expect(only({ symbol_kind, title }).kind).toBe(symbol_kind as never);
  });

  test.each([
    ["UploadComponent", "component"],
    ["UploadService", "service"],
    ["UploadModule", "module"],
    ["UploadConfig", "config"],
    ["Upload.run", "method"],
    ["a.UploadService", "service"],
    ["Upload", "unknown"],
  ])("infers %p as %p from its title", (title, kind) => {
    expect(only({ title, symbol_kind: "other" }).kind).toBe(kind as never);
  });
});

describe("role inference", () => {
  test.each([
    ["behavioral", "interface"],
    ["structural", "function"],
    ["type-shape", "function"],
    ["config", "function"],
    ["module", "function"],
    ["unknown", "function"],
  ])("keeps an explicit %p role", (symbol_role, symbol_kind) => {
    expect(only({ symbol_role, symbol_kind }).role).toBe(symbol_role as never);
  });

  test.each([
    ["component", "behavioral"],
    ["service", "behavioral"],
    ["module", "module"],
    ["config", "config"],
    ["interface", "type-shape"],
    ["function", "behavioral"],
  ])("infers the role of a %p", (symbol_kind, role) => {
    expect(only({ symbol_kind, symbol_role: "other" }).role).toBe(
      role as never,
    );
  });
});

describe("symbol helpers", () => {
  test("isModuleOrConfig", () => {
    expect(isModuleOrConfig(only({ symbol_role: "module" }))).toBe(true);
    expect(isModuleOrConfig(only({ symbol_role: "config" }))).toBe(true);
    expect(isModuleOrConfig(only({ symbol_role: "behavioral" }))).toBe(false);
  });

  test("narrowerManifestSymbols finds dotted members in the same file", () => {
    const symbols = collect([
      result("SYM-parent", { title: "Upload" }),
      result("SYM-member", { title: "Upload.run" }),
      result("SYM-parent", { title: "Upload.self" }),
      result("SYM-other-file", { title: "Upload.x" }, { sourceFile: "b.ts" }),
      result("SYM-prefix", { title: "UploadMore" }),
    ]);
    const parent = symbols[0] as SymbolMetadata;
    expect(
      narrowerManifestSymbols(parent, symbols).map((symbol) => symbol.id),
    ).toStrictEqual(["SYM-member"]);
  });

  test("narrowerExtractedSymbols finds behavioral dotted members", () => {
    const parent = only({ title: "Upload" });
    const extracted = (name: string, role: string) =>
      ({ name, role }) as unknown as ExtractedSymbol;
    const members = [
      extracted("Upload", "behavioral"),
      extracted("Upload.run", "behavioral"),
      extracted("Upload.shape", "type-shape"),
      extracted("UploadX", "behavioral"),
    ];
    expect(
      narrowerExtractedSymbols(parent, new Map([["src/a.ts", members]])),
    ).toStrictEqual([members[1]]);
    expect(narrowerExtractedSymbols(parent, new Map())).toStrictEqual([]);
  });
});
