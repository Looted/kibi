import { describe, expect, test } from "bun:test";
import {
  OWNER_PAYLOADS_SHOWN,
  type OwnerFinding,
  collectOwnerFindings,
  coveringTests,
  formatOwnerFindings,
  withoutOwnedCauses,
} from "../../src/traceability/owner-findings.js";
import type { KibiImpactDiagnostic } from "../../src/traceability/staged-diagnostics.js";
import type { Violation } from "../../src/traceability/validate.js";

function diagnostic(
  id: KibiImpactDiagnostic["id"],
  files: readonly string[],
  evidence?: Record<string, unknown>,
): KibiImpactDiagnostic {
  return {
    id,
    severity: id === "symbol_semantic_review_needed" ? "warning" : "error",
    blocking: id !== "symbol_semantic_review_needed",
    category: "symbol",
    files,
    docs: [],
    message: `${id} message`,
    suggestion: `${id} suggestion`,
    ...(evidence !== undefined ? { evidence } : {}),
  } as KibiImpactDiagnostic;
}

const manifest = (
  path: string,
  missing: Array<{ title: string; line: number }>,
  extra: string[] = [],
) =>
  diagnostic("symbols_manifest_stale", [".kb/symbols.yaml", path], {
    symbolsManifest: [
      { path, expectedCount: 2, coveredCount: 1, missing, extra },
    ],
  });

const uncovered = (path: string, titles: string[]) =>
  diagnostic("kibi_impact_evidence_missing", [path], {
    uncoveredSymbols: [{ path, titles }],
  });

const review = (path: string, symbol: string) =>
  diagnostic("symbol_semantic_review_needed", [path], { symbol });

function violation(file: string, name: string, line: number): Violation {
  return {
    symbolId: `SYM-${name}`,
    name,
    file,
    line,
    column: 1,
    currentLinks: 0,
    requiredLinks: 1,
  };
}

const requirements: Record<string, { title: string; status: string }> = {
  "REQ-tags-create": { title: "Tag creation", status: "open" },
  "REQ-tags-rename": { title: "Tag renaming", status: "active" },
};

const readRequirement = (id: string) => requirements[id];

describe("collectOwnerFindings", () => {
  test("merges the four findings of one new unowned function into one", () => {
    const findings = collectOwnerFindings({
      traceability: [violation("src/tags.ts", "renameTag", 5)],
      diagnostics: [
        manifest("src/tags.ts", [{ title: "renameTag", line: 5 }]),
        uncovered("src/tags.ts", ["renameTag"]),
        review("src/tags.ts", "renameTag"),
      ],
      symbols: [
        {
          name: "renameTag",
          location: { file: "src/tags.ts", startLine: 5 },
          role: "behavioral",
          callable: true,
        },
      ],
      candidatesByFile: new Map([
        ["src/tags.ts", ["REQ-tags-rename", "REQ-tags-create"]],
      ]),
      readRequirement,
      testsFor: (file, req) =>
        file === "src/tags.ts" && req === "REQ-tags-create"
          ? ["TEST-tags-z", "TEST-tags-a"]
          : [],
    });
    expect(findings).toEqual([
      {
        blocks: "commit",
        symbol: "renameTag",
        file: "src/tags.ts",
        line: 5,
        state: "new",
        typeShape: false,
        causes: [
          "symbols_manifest_stale",
          "kibi_impact_evidence_missing",
          "symbol_semantic_review_needed",
          "symbol-traceability",
        ],
        candidates: [
          {
            id: "REQ-tags-create",
            title: "Tag creation",
            status: "open",
            tests: ["TEST-tags-a", "TEST-tags-z"],
          },
          {
            id: "REQ-tags-rename",
            title: "Tag renaming",
            status: "active",
            tests: [],
          },
        ],
        payloads: [
          {
            type: "req",
            id: "REQ-tags-create",
            properties: { title: "Tag creation", status: "open" },
            implementedBy: [
              {
                sourceFile: "src/tags.ts",
                symbol: "renameTag",
                coveredBy: ["TEST-tags-a", "TEST-tags-z"],
              },
            ],
          },
          {
            type: "req",
            id: "REQ-tags-rename",
            properties: { title: "Tag renaming", status: "active" },
            implementedBy: [{ sourceFile: "src/tags.ts", symbol: "renameTag" }],
          },
        ],
      },
    ]);
  });

  test("names only the causes the staged check reported", () => {
    const [finding] = collectOwnerFindings({
      traceability: [violation("src/a.ts", "run", 3)],
      diagnostics: [
        review("src/a.ts", "other"),
        uncovered("src/b.ts", ["run"]),
      ],
      symbols: [],
      candidatesByFile: new Map(),
      readRequirement,
    });
    expect(finding?.state).toBe("unlinked");
    expect(finding?.causes).toEqual(["symbol-traceability"]);
    expect(finding?.line).toBe(3);
    expect(finding?.candidates).toEqual([]);
    expect(finding?.payloads).toEqual([]);
  });

  test("a manifest gap alone is a new declaration at the manifest's line", () => {
    const [finding] = collectOwnerFindings({
      traceability: [],
      diagnostics: [manifest("src/a.ts", [{ title: "build", line: 9 }])],
      symbols: [
        {
          name: "build",
          location: { file: "src/a.ts", startLine: 7 },
          role: "behavioral",
        },
      ],
      candidatesByFile: new Map(),
      readRequirement,
    });
    expect(finding?.state).toBe("new");
    expect(finding?.line).toBe(9);
    expect(finding?.typeShape).toBe(false);
    expect(finding?.causes).toEqual(["symbols_manifest_stale"]);
  });

  test("slugs the record id like implementedBy does", () => {
    const [finding] = collectOwnerFindings({
      traceability: [],
      diagnostics: [manifest(".shapes", [{ title: "_Tag__Record_", line: 1 }])],
      symbols: [
        {
          name: "_Tag__Record_",
          location: { file: ".shapes", startLine: 1 },
          role: "type-shape",
        },
      ],
      candidatesByFile: new Map(),
      readRequirement,
    });
    expect(finding?.payloads[0]?.id).toBe("SYM-shapes-tag-record");
  });

  test("a type's record id is never one the KB or another finding holds", () => {
    const shape = (file: string) => ({
      name: "LIMIT",
      location: { file, startLine: 1 },
      role: "type-shape",
    });
    const findings = collectOwnerFindings({
      traceability: [],
      diagnostics: [
        manifest("lib/newmod.ts", [{ title: "LIMIT", line: 1 }]),
        manifest("src/newmod.ts", [{ title: "LIMIT", line: 1 }]),
      ],
      symbols: [shape("lib/newmod.ts"), shape("src/newmod.ts")],
      candidatesByFile: new Map(),
      readRequirement,
      takenIds: ["SYM-newmod-limit"],
    });
    expect(
      findings.map((finding) => [finding.file, finding.payloads[0]?.id]),
    ).toEqual([
      ["lib/newmod.ts", "SYM-lib-newmod-limit"],
      ["src/newmod.ts", "SYM-src-newmod-limit"],
    ]);
    // A record written for the declaration but not staged is offered again
    // under its own id.
    const again = collectOwnerFindings({
      traceability: [],
      diagnostics: [
        manifest("lib/newmod.ts", [{ title: "LIMIT", line: 1 }]),
        manifest("src/newmod.ts", [{ title: "LIMIT", line: 1 }]),
      ],
      symbols: [shape("lib/newmod.ts"), shape("src/newmod.ts")],
      candidatesByFile: new Map(),
      readRequirement,
      takenIds: ["SYM-newmod-limit"],
      writtenRecords: [
        { id: "SYM-newmod-limit", file: "src/newmod.ts", name: "LIMIT" },
      ],
    });
    expect(
      again.map((finding) => [finding.file, finding.payloads[0]?.id]),
    ).toEqual([
      ["lib/newmod.ts", "SYM-lib-newmod-limit"],
      ["src/newmod.ts", "SYM-newmod-limit"],
    ]);
  });

  test("falls back to the extracted line, then to 0", () => {
    const findings = collectOwnerFindings({
      traceability: [],
      diagnostics: [
        diagnostic("symbols_manifest_stale", ["src/a.ts"], {
          symbolsManifest: [
            {
              path: "src/a.ts",
              missing: [{ title: "known", line: undefined }],
              extra: [],
            },
            {
              path: "src/b.ts",
              missing: [{ title: "unknown", line: undefined }],
              extra: [],
            },
          ],
        }),
      ],
      symbols: [
        {
          name: "known",
          location: { file: "src/a.ts", startLine: 7 },
          role: "behavioral",
        },
      ],
      candidatesByFile: new Map(),
      readRequirement,
    });
    expect(findings.map((f) => [f.symbol, f.line])).toEqual([
      ["known", 7],
      ["unknown", 0],
    ]);
  });

  test("a type gets a type-shape record and no requirement candidates", () => {
    const [finding] = collectOwnerFindings({
      traceability: [violation("src/lib/tag-store.ts", "TagRecord", 2)],
      diagnostics: [
        manifest("src/lib/tag-store.ts", [{ title: "TagRecord", line: 2 }]),
      ],
      symbols: [
        {
          name: "TagRecord",
          location: { file: "src/lib/tag-store.ts", startLine: 2 },
          role: "type-shape",
        },
      ],
      candidatesByFile: new Map([
        ["src/lib/tag-store.ts", ["REQ-tags-create"]],
      ]),
      readRequirement,
    });
    expect(finding?.typeShape).toBe(true);
    expect(finding?.candidates).toEqual([]);
    expect(finding?.payloads).toEqual([
      {
        type: "symbol",
        id: "SYM-tag-store-tag-record",
        properties: {
          title: "TagRecord",
          status: "active",
          sourceFile: "src/lib/tag-store.ts",
          symbol_role: "type-shape",
        },
      },
    ]);
  });

  test("a callable non-behavioral declaration still needs an owner", () => {
    const [finding] = collectOwnerFindings({
      traceability: [violation("src/a.ts", "handler", 1)],
      diagnostics: [],
      symbols: [
        {
          name: "handler",
          location: { file: "src/a.ts", startLine: 1 },
          role: "config",
          callable: true,
        },
      ],
      candidatesByFile: new Map(),
      readRequirement,
    });
    expect(finding?.typeShape).toBe(false);
  });

  test("an unknown requirement shows its id and an open status", () => {
    const [finding] = collectOwnerFindings({
      traceability: [violation("src/a.ts", "run", 1)],
      diagnostics: [],
      symbols: [],
      candidatesByFile: new Map([["src/a.ts", ["REQ-gone"]]]),
      readRequirement: () => ({ title: 3, status: null }),
    });
    expect(finding?.candidates).toEqual([
      { id: "REQ-gone", title: "REQ-gone", status: "open", tests: [] },
    ]);
  });

  test(`writes a payload for the first ${OWNER_PAYLOADS_SHOWN} candidates only`, () => {
    const ids = ["REQ-e", "REQ-d", "REQ-c", "REQ-b", "REQ-a"];
    const [finding] = collectOwnerFindings({
      traceability: [violation("src/a.ts", "run", 1)],
      diagnostics: [],
      symbols: [],
      candidatesByFile: new Map([["src/a.ts", ids]]),
      readRequirement: () => undefined,
    });
    expect(finding?.candidates.map((c) => c.id)).toEqual([
      "REQ-a",
      "REQ-b",
      "REQ-c",
      "REQ-d",
      "REQ-e",
    ]);
    expect(finding?.payloads.map((p) => p.id)).toEqual([
      "REQ-a",
      "REQ-b",
      "REQ-c",
    ]);
  });

  test("orders findings by file, then line", () => {
    const findings = collectOwnerFindings({
      traceability: [
        violation("src/b.ts", "late", 20),
        violation("src/b.ts", "early", 3),
        violation("src/a.ts", "first", 100),
      ],
      diagnostics: [],
      symbols: [],
      candidatesByFile: new Map(),
      readRequirement,
    });
    expect(findings.map((f) => f.symbol)).toEqual(["first", "early", "late"]);
  });

  test("ignores diagnostics without evidence", () => {
    expect(
      collectOwnerFindings({
        traceability: [],
        diagnostics: [
          diagnostic("symbols_manifest_stale", ["src/a.ts"]),
          diagnostic("kibi_impact_evidence_missing", ["src/a.ts"]),
          diagnostic("symbol_semantic_review_needed", []),
          diagnostic("symbol_semantic_review_needed", ["src/a.ts"], {
            symbol: ["run"],
          }),
          diagnostic(
            "firm_edit_unreviewed" as KibiImpactDiagnostic["id"],
            ["src/a.ts"],
            { symbol: "run" },
          ),
        ],
        symbols: [],
        candidatesByFile: new Map(),
        readRequirement,
      }),
    ).toEqual([]);
  });
});

describe("coveringTests", () => {
  const row = (
    id: string,
    sourceFile: string | undefined,
    links: Array<[string, string]>,
  ) => ({
    entity: { id },
    ...(sourceFile !== undefined ? { sourceFile } : {}),
    relationships: links.map(([type, to]) => ({ type, from: id, to })),
  });

  test("lists the covered_by tests of the file's code implementing the requirement", () => {
    const knowledge = [
      row("SYM-a", "src/a.ts", [
        ["implements", "REQ-x"],
        ["covered_by", "TEST-b"],
        ["covered_by", "TEST-a"],
      ]),
      row("SYM-b", "src/a.ts", [
        ["implements", "REQ-x"],
        ["covered_by", "TEST-a"],
      ]),
      row("SYM-c", "src/a.ts", [
        ["implements", "REQ-y"],
        ["covered_by", "TEST-y"],
      ]),
      row("SYM-d", "src/other.ts", [
        ["implements", "REQ-x"],
        ["covered_by", "TEST-other"],
      ]),
      row("SYM-e", "src/a.ts", [
        ["relates_to", "REQ-x"],
        ["covered_by", "TEST-related"],
      ]),
      row("REQ-x", undefined, [["verified_by", "TEST-req"]]),
    ];
    expect(coveringTests(knowledge, "src/a.ts", "REQ-x")).toEqual([
      "TEST-a",
      "TEST-b",
    ]);
    expect(coveringTests(knowledge, "src/a.ts", "REQ-z")).toEqual([]);
  });
});

describe("withoutOwnedCauses", () => {
  // A file named "undefined" keeps a warning without a file from matching.
  const owned: OwnerFinding[] = collectOwnerFindings({
    traceability: [
      violation("src/a.ts", "run", 1),
      violation("undefined", "run", 1),
    ],
    diagnostics: [manifest("src/a.ts", [{ title: "run", line: 1 }])],
    symbols: [],
    candidatesByFile: new Map(),
    readRequirement,
  });

  test("drops the findings every owner finding stands for", () => {
    const result = withoutOwnedCauses(
      owned,
      [
        manifest("src/a.ts", [{ title: "run", line: 1 }]),
        uncovered("src/a.ts", ["run"]),
        review("src/a.ts", "run"),
      ],
      [violation("src/a.ts", "run", 1)],
    );
    expect(result).toEqual({ diagnostics: [], traceability: [] });
  });

  test("keeps findings that name anything an owner finding does not", () => {
    const keptManifest = manifest(
      "src/a.ts",
      [
        { title: "run", line: 1 },
        { title: "stop", line: 9 },
      ],
      [],
    );
    const keptExtra = manifest(
      "src/a.ts",
      [{ title: "run", line: 1 }],
      ["gone"],
    );
    const keptNoEvidence = diagnostic("symbols_manifest_stale", ["src/a.ts"]);
    const keptUncovered = uncovered("src/a.ts", ["run", "stop"]);
    const keptSecondFile = diagnostic(
      "symbols_manifest_stale",
      ["src/a.ts", "src/b.ts"],
      {
        symbolsManifest: [
          { path: "src/a.ts", missing: [{ title: "run", line: 1 }], extra: [] },
          {
            path: "src/b.ts",
            missing: [{ title: "stop", line: 2 }],
            extra: [],
          },
        ],
      },
    );
    const keptSecondUncovered = diagnostic(
      "kibi_impact_evidence_missing",
      ["src/a.ts", "src/b.ts"],
      {
        uncoveredSymbols: [
          { path: "src/a.ts", titles: ["run"] },
          { path: "src/b.ts", titles: ["stop"] },
        ],
      },
    );
    const keptReviewListSymbol = diagnostic(
      "symbol_semantic_review_needed",
      ["src/a.ts"],
      { symbol: ["run"] },
    );
    const keptUndetailedFile = diagnostic(
      "kibi_impact_evidence_missing",
      ["src/a.ts", "src/b.ts"],
      { uncoveredSymbols: [{ path: "src/a.ts", titles: ["run"] }] },
    );
    const keptEmptyTitles = diagnostic(
      "kibi_impact_evidence_missing",
      ["src/a.ts"],
      { uncoveredSymbols: [{ path: "src/a.ts", titles: [] }] },
    );
    const keptReview = review("src/a.ts", "stop");
    const keptReviewNoSymbol = diagnostic("symbol_semantic_review_needed", [
      "src/a.ts",
    ]);
    const keptReviewNoFile = diagnostic("symbol_semantic_review_needed", [], {
      symbol: "run",
    });
    const other = diagnostic(
      "firm_edit_unreviewed" as KibiImpactDiagnostic["id"],
      ["src/a.ts"],
      { symbol: "run" },
    );
    const diagnostics = [
      keptManifest,
      keptExtra,
      keptNoEvidence,
      keptUncovered,
      keptSecondFile,
      keptSecondUncovered,
      keptReviewListSymbol,
      keptUndetailedFile,
      keptEmptyTitles,
      keptReview,
      keptReviewNoSymbol,
      keptReviewNoFile,
      other,
    ];
    const stop = violation("src/a.ts", "stop", 9);
    const result = withoutOwnedCauses(owned, diagnostics, [
      violation("src/a.ts", "run", 1),
      stop,
    ]);
    expect(result.diagnostics).toEqual(diagnostics);
    expect(result.traceability).toEqual([stop]);
  });
});

describe("formatOwnerFindings", () => {
  test("prints nothing without findings", () => {
    expect(formatOwnerFindings([])).toBe("");
  });

  test("prints one blocking block per declaration, then the CLI and commit lines", () => {
    const findings = collectOwnerFindings({
      traceability: [
        violation("src/a.ts", "run", 4),
        violation("src/b.ts", "solo", 2),
      ],
      diagnostics: [
        manifest("src/a.ts", [{ title: "run", line: 4 }]),
        manifest("src/c.ts", [{ title: "Shape", line: 1 }]),
      ],
      symbols: [
        {
          name: "Shape",
          location: { file: "src/c.ts", startLine: 1 },
          role: "type-shape",
        },
      ],
      candidatesByFile: new Map([
        [
          "src/a.ts",
          ["REQ-tags-create", "REQ-tags-rename", "REQ-c", "REQ-d", "REQ-e"],
        ],
      ]),
      readRequirement,
    });
    const text = formatOwnerFindings(findings);
    const payload = (id: string, title: string, status: string) =>
      JSON.stringify({
        type: "req",
        id,
        properties: { title, status },
        implementedBy: [{ sourceFile: "src/a.ts", symbol: "run" }],
      });
    expect(text).toBe(
      [
        [
          "[BLOCKS COMMIT] run (src/a.ts:4) is new and no requirement owns it.",
          "  If one of these already states what it does, link it to that one (never pick one only to pass the gate):",
          "    REQ-c: REQ-c",
          `      kb_upsert ${payload("REQ-c", "REQ-c", "open")}`,
          "    REQ-d: REQ-d",
          `      kb_upsert ${payload("REQ-d", "REQ-d", "open")}`,
          "    REQ-e: REQ-e",
          `      kb_upsert ${payload("REQ-e", "REQ-e", "open")}`,
          "    Also linked from this file: REQ-tags-create, REQ-tags-rename (same input with its id, title and status)",
          "  If it is new behavior, record a requirement for it first (template: kb_skills kibi-commit-review), then link it the same way.",
        ].join("\n"),
        [
          "[BLOCKS COMMIT] solo (src/b.ts:2) has a symbol record but no requirement owns it.",
          "  No requirement owns other code in this file.",
          "  If it is new behavior, record a requirement for it first (template: kb_skills kibi-commit-review), then link it the same way.",
        ].join("\n"),
        [
          "[BLOCKS COMMIT] Shape (src/c.ts:1) is new and has no symbol record. A type, interface, enum or constant needs a record with symbol_role type-shape, not a requirement link:",
          `  kb_upsert ${JSON.stringify({
            type: "symbol",
            id: "SYM-c-shape",
            properties: {
              title: "Shape",
              status: "active",
              sourceFile: "src/c.ts",
              symbol_role: "type-shape",
            },
          })}`,
        ].join("\n"),
        "CLI: pipe a kb_upsert input to npx --no-install kibi upsert --input -. Then: git add .kb && git commit",
      ].join("\n\n"),
    );
  });

  test("names no extra candidates when all have payloads", () => {
    const findings = collectOwnerFindings({
      traceability: [violation("src/a.ts", "run", 4)],
      diagnostics: [],
      symbols: [],
      candidatesByFile: new Map([["src/a.ts", ["REQ-tags-create"]]]),
      readRequirement,
    });
    const text = formatOwnerFindings(findings);
    expect(text).toContain("    REQ-tags-create: Tag creation\n");
    expect(text).not.toContain("Also linked from this file");
  });

  test("marks an extracted symbol with no manifest record as new even without symbols_manifest_stale", () => {
    const [finding] = collectOwnerFindings({
      traceability: [violation("src/pricing.ts", "approveRefundOverride", 7)],
      diagnostics: [],
      symbols: [
        {
          name: "approveRefundOverride",
          location: { file: "src/pricing.ts", startLine: 7 },
          role: "behavioral",
          reqLinks: [],
        },
      ],
      candidatesByFile: new Map(),
      readRequirement,
    });
    expect(finding?.state).toBe("new");
    const text = formatOwnerFindings(finding ? [finding] : []);
    expect(text).toContain(
      "approveRefundOverride (src/pricing.ts:7) is new and no requirement owns it.",
    );
    expect(text).not.toContain("has a symbol record");
  });
});
