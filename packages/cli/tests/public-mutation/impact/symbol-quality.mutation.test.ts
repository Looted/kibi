import { describe, expect, test } from "bun:test";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import { createSymbolQualityDiagnostics } from "../../../src/public/impact/symbol-quality.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

function sym(
  id: string,
  entity: Record<string, unknown>,
  targets: readonly string[] = [],
  sourceFile = "src/a.ts",
): ExtractionResult {
  return {
    entity: {
      id,
      type: "symbol",
      title: id,
      status: "active",
      source: ".kb/symbols.yaml",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...entity,
    },
    relationships: targets.map((to) => ({ type: "implements", from: id, to })),
    sourceFile,
  } as ExtractionResult;
}

function req(id: string, tags?: string[]): ExtractionResult {
  return {
    entity: {
      id,
      type: "req",
      title: id,
      status: "open",
      source: `.kb/requirements/${id}.md`,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...(tags === undefined ? {} : { tags }),
    },
    relationships: [],
  } as ExtractionResult;
}

function run(
  manifestResults: ExtractionResult[],
  symbolsByFile: Map<string, ExtractedSymbol[]> = new Map(),
) {
  return createSymbolQualityDiagnostics({ manifestResults, symbolsByFile });
}

const reqs = (count: number) =>
  Array.from({ length: count }, (_, index) => `REQ-${index + 1}`);

describe("multi-requirement symbols", () => {
  test("reviews a behavioral symbol above two requirements", () => {
    expect(
      run([sym("SYM-f", { symbol_kind: "function" }, reqs(3))]),
    ).toStrictEqual([
      {
        id: "multi_requirement_symbol_review",
        severity: "review",
        blocking: false,
        category: "symbol",
        entityId: "SYM-f",
        source: ".kb/symbols.yaml",
        files: [".kb/symbols.yaml", "src/a.ts"],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message:
          "Symbol SYM-f implements 3 requirements, above the 2 target review threshold.",
        suggestion:
          "Review whether this symbol owns multiple unrelated behaviors; move relationships to narrower behavioral symbols or add a valid granularity_reason when broad ownership is intentional.",
        evidence: {
          targetIds: ["REQ-1", "REQ-2", "REQ-3"],
          targetCount: 3,
          threshold: 2,
          symbolKind: "function",
          symbolRole: "behavioral",
          sourceFile: "src/a.ts",
        },
      },
    ]);
  });

  test("allows two requirements on a behavioral symbol", () => {
    expect(
      run([sym("SYM-f", { symbol_kind: "function" }, reqs(2))]),
    ).toStrictEqual([]);
  });

  test("uses a threshold of four for aggregate kinds", () => {
    expect(
      run([sym("SYM-c", { symbol_kind: "component" }, reqs(4))]),
    ).toStrictEqual([]);
    const [diagnostic] = run([
      sym("SYM-c", { symbol_kind: "component" }, reqs(5)),
    ]);
    expect(diagnostic?.message).toBe(
      "Symbol SYM-c implements 5 requirements, above the 4 target review threshold.",
    );
  });

  test("reviews modules and configs unless a granularity reason covers them", () => {
    expect(
      run([sym("SYM-m", { symbol_kind: "module" }, reqs(5))]).map((d) => d.id),
    ).toStrictEqual(["multi_requirement_symbol_review"]);
    expect(
      run([
        sym(
          "SYM-g",
          { symbol_role: "config", symbol_kind: "function" },
          reqs(3),
        ),
      ]).map((d) => d.id),
    ).toStrictEqual(["multi_requirement_symbol_review"]);
    expect(
      run([
        sym(
          "SYM-m",
          {
            symbol_kind: "module",
            granularity_reason: "module-level-behavior",
          },
          reqs(5),
        ),
      ]),
    ).toStrictEqual([]);
  });

  test("ignores type-shape symbols", () => {
    expect(
      run([sym("SYM-t", { symbol_kind: "interface" }, reqs(9))]),
    ).toStrictEqual([]);
  });
});

describe("duplicate coordinates", () => {
  const coords = (line: number) => ({
    sourceLine: line,
    sourceColumn: 1,
    sourceEndLine: line,
    sourceEndColumn: 9,
  });

  test("reviews same-title symbols without distinct coordinates", () => {
    expect(
      run([
        sym("SYM-b", { title: "run", symbol_kind: "type" }),
        sym("SYM-a", { title: "run", symbol_kind: "type" }),
      ]),
    ).toStrictEqual([
      {
        id: "duplicate_symbol_coordinate_review",
        severity: "review",
        blocking: false,
        category: "coordinate",
        entityId: "SYM-b",
        source: ".kb/symbols.yaml",
        files: [".kb/symbols.yaml", "src/a.ts"],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message:
          "Symbols SYM-a, SYM-b share title run and source src/a.ts without distinct coordinate evidence.",
        suggestion:
          "Refresh symbol coordinates or rename member-level manifest entries so duplicate modeled symbols are distinguishable after parsing.",
        evidence: {
          candidateIds: ["SYM-a", "SYM-b"],
          title: "run",
          sourceFile: "src/a.ts",
        },
      },
    ]);
  });

  test("reviews equal or partly missing coordinates", () => {
    expect(
      run([
        sym("SYM-a", { title: "run", symbol_kind: "type", ...coords(1) }),
        sym("SYM-b", { title: "run", symbol_kind: "type", ...coords(1) }),
      ]).map((d) => d.id),
    ).toStrictEqual(["duplicate_symbol_coordinate_review"]);
    expect(
      run([
        sym("SYM-a", { title: "run", symbol_kind: "type", ...coords(1) }),
        sym("SYM-b", { title: "run", symbol_kind: "type" }),
      ]).map((d) => d.id),
    ).toStrictEqual(["duplicate_symbol_coordinate_review"]);
  });

  test("accepts distinct coordinates, other files and unique titles", () => {
    expect(
      run([
        sym("SYM-a", { title: "run", symbol_kind: "type", ...coords(1) }),
        sym("SYM-b", { title: "run", symbol_kind: "type", ...coords(2) }),
        sym("SYM-c", { title: "go", symbol_kind: "type" }, [], "src/a.ts"),
        sym("SYM-d", { title: "go", symbol_kind: "type" }, [], "src/b.ts"),
      ]),
    ).toStrictEqual([]);
  });
});

describe("mixed-purpose symbols", () => {
  const targets = ["REQ-a", "REQ-b", "REQ-c"];
  const tagged = [
    req("REQ-a", ["y"]),
    req("REQ-b", ["x"]),
    req("REQ-c", ["z", "y"]),
  ];

  test("reviews an aggregate spanning unrelated tags with narrower members", () => {
    const diagnostics = run([
      sym("SYM-up", { title: "Upload", symbol_kind: "class" }, targets),
      sym("SYM-run", { title: "Upload.run", symbol_kind: "type" }),
      ...tagged,
    ]);
    expect(diagnostics).toStrictEqual([
      {
        id: "component_mixed_purpose_review",
        severity: "review",
        blocking: false,
        category: "mixed-purpose",
        entityId: "SYM-up",
        source: ".kb/symbols.yaml",
        files: [".kb/symbols.yaml", "src/a.ts"],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message:
          "Symbol SYM-up spans unrelated requirement tag clusters while narrower same-file symbols exist.",
        suggestion:
          "Move unrelated requirement ownership to narrower class members/components/services or split the coarse symbol into cohesive behavioral anchors.",
        evidence: {
          targetIds: ["REQ-a", "REQ-b", "REQ-c"],
          requirementTags: ["x", "y", "z"],
          narrowerSymbolIds: ["SYM-run"],
          sourceFile: "src/a.ts",
          symbolKind: "class",
          symbolRole: "behavioral",
        },
      },
    ]);
  });

  test("counts extracted members and merges duplicate ids", () => {
    const extracted = [
      { id: "SYM-run", name: "Upload.run", role: "behavioral" },
      { id: "SYM-x", name: "Upload.x", role: "behavioral" },
      { id: "SYM-aaa", name: "Upload.aaa", role: "behavioral" },
    ] as unknown as ExtractedSymbol[];
    const diagnostic = run(
      [
        sym(
          "SYM-up",
          { title: "Upload", symbol_role: "module", symbol_kind: "x" },
          targets,
        ),
        sym("SYM-run", { title: "Upload.run", symbol_kind: "type" }),
        ...tagged,
      ],
      new Map([["src/a.ts", extracted]]),
    ).find((d) => d.id === "component_mixed_purpose_review");
    expect(diagnostic?.evidence?.narrowerSymbolIds).toStrictEqual([
      "SYM-aaa",
      "SYM-run",
      "SYM-x",
    ]);
    const [extractedOnly] = run(
      [
        sym("SYM-up", { title: "Upload", symbol_kind: "service" }, targets),
        ...tagged,
      ],
      new Map([["src/a.ts", extracted]]),
    );
    expect(extractedOnly?.evidence?.narrowerSymbolIds).toStrictEqual([
      "SYM-aaa",
      "SYM-run",
      "SYM-x",
    ]);
  });

  test("reviews when a target has no tags at all", () => {
    for (const extra of [[req("REQ-d")], []]) {
      const diagnostics = run([
        sym("SYM-up", { title: "Upload", symbol_kind: "class" }, [
          ...targets,
          "REQ-d",
        ]),
        sym("SYM-run", { title: "Upload.run", symbol_kind: "type" }),
        ...tagged,
        ...extra,
      ]);
      expect(diagnostics.map((d) => d.id)).toStrictEqual([
        "component_mixed_purpose_review",
      ]);
      expect(diagnostics[0]?.evidence?.requirementTags).toStrictEqual([
        "x",
        "y",
        "z",
      ]);
    }
  });

  test("reads tags from requirements only", () => {
    expect(
      run([
        sym("SYM-up", { title: "Upload", symbol_kind: "class" }, targets),
        sym("SYM-run", { title: "Upload.run", symbol_kind: "type" }),
        req("REQ-a", ["x"]),
        req("REQ-b", ["y"]),
        {
          ...req("REQ-c", ["z"]),
          entity: { ...req("REQ-c", ["z"]).entity, type: "scenario" },
        } as ExtractionResult,
      ]),
    ).toStrictEqual([]);
  });

  test("skips cohesive, small or member-less symbols", () => {
    const member = sym("SYM-run", { title: "Upload.run", symbol_kind: "type" });
    const cases: ExtractionResult[][] = [
      [
        sym("SYM-up", { title: "Upload", symbol_kind: "class" }, targets),
        ...tagged,
      ],
      [
        sym("SYM-up", { title: "Upload", symbol_kind: "class" }, targets),
        member,
        req("REQ-a", ["x", "k"]),
        req("REQ-b", ["y", "k"]),
        req("REQ-c", ["z", "k"]),
      ],
      [
        sym("SYM-up", { title: "Upload", symbol_kind: "class" }, targets),
        member,
        req("REQ-a", ["x"]),
        req("REQ-b", ["y"]),
        req("REQ-c", ["x"]),
      ],
      [
        sym("SYM-up", { title: "Upload", symbol_kind: "function" }, targets),
        member,
        ...tagged,
      ],
    ];
    for (const results of cases.slice(0, 3)) {
      expect(run(results)).toStrictEqual([]);
    }
    expect(run(cases[3] as ExtractionResult[]).map((d) => d.id)).toStrictEqual([
      "multi_requirement_symbol_review",
    ]);
  });
});
