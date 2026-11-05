import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  buildManifestLookup,
  clearResolvedImpactReviewAdvisories,
  formatQualityDiagnostics,
  formatStagedCoverage,
  formatStagedKibiDiagnostics,
  hasYamlFrontmatter,
  isKibiEntityType,
  isTestOnlySourcePath,
  migrationOnlyNote,
  noValidatedSymbolsMessage,
  printStagedResult,
  printStructuredCheckResult,
  requireActiveProlog,
} from "../../../src/commands/check.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import type { SourceChangeAnalysis } from "../../../src/plugins/source-change-analysis.js";
import type { QualityDiagnostic } from "../../../src/public/impact-diagnostics.js";
import type { StagedFile } from "../../../src/traceability/git-staged.js";
import { IMPACT_REVIEW_PATH } from "../../../src/traceability/impact-review.js";
import type { KibiImpactDiagnostic } from "../../../src/traceability/staged-diagnostics.js";
import type { StagedFileCoverageResult } from "../../../src/traceability/staged-file-coverage.js";
import { createManifestLookupSentinelKey } from "../../../src/traceability/symbol-extract.js";
import { CANONICAL_ENTITY_PATHS } from "../../../src/utils/kb-paths.js";

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function captureConsole() {
  const log = spyOn(console, "log").mockImplementation(() => {});
  const error = spyOn(console, "error").mockImplementation(() => {});
  restores.push(() => {
    log.mockRestore();
    error.mockRestore();
  });
  return {
    logs: () => log.mock.calls.map((call) => String(call[0])),
    errors: () => error.mock.calls.map((call) => String(call[0])),
  };
}

describe("source path classification", () => {
  test.each([
    "tests/a.ts",
    "packages/x/tests/a.ts",
    "src/a.test.ts",
    "src/a.test.tsx",
    "src/a.test.js",
    "src/a.test.jsx",
    "src/a.spec.ts",
    "src/a.spec.tsx",
    "src/a.spec.js",
    "src/a.spec.jsx",
  ])("%s is test-only", (file) => {
    expect(isTestOnlySourcePath(file)).toBe(true);
  });

  test.each([
    "src/a.ts",
    "src/tests.ts",
    "src/latests/a.ts",
    "src/a.test.ts.bak",
    "src/a.testx.ts",
    "src/atest.ts",
    "src/a.test.py",
    "src/a.test.tsxx",
    "xtests/a.ts",
  ])("%s is not test-only", (file) => {
    expect(isTestOnlySourcePath(file)).toBe(false);
  });

  test("the eight entity types are known", () => {
    for (const type of [
      "req",
      "scenario",
      "test",
      "adr",
      "flag",
      "event",
      "symbol",
      "fact",
    ]) {
      expect(isKibiEntityType(type)).toBe(true);
    }
    expect(isKibiEntityType("")).toBe(false);
    expect(isKibiEntityType("Stryker was here!")).toBe(false);
  });

  test("front matter needs an opening and a closing fence", () => {
    expect(hasYamlFrontmatter("  \n---\nid: a\n---\nbody")).toBe(true);
    expect(hasYamlFrontmatter("---\n---")).toBe(true);
    expect(hasYamlFrontmatter("---id: a")).toBe(false);
    expect(hasYamlFrontmatter("body\n---\nid: a\n---")).toBe(false);
    expect(hasYamlFrontmatter("--\n---")).toBe(false);
    expect(hasYamlFrontmatter("---\n--")).toBe(false);
    expect(hasYamlFrontmatter("---")).toBe(false);
  });

  test("the prolog runtime is the engine, else the process", () => {
    const engine = { kind: "engine" };
    const prolog = { kind: "prolog" };
    expect(requireActiveProlog(engine, prolog)).toBe(engine);
    expect(requireActiveProlog(null, prolog)).toBe(prolog);
    expect(requireActiveProlog(undefined, prolog)).toBe(prolog);
    expect(() => requireActiveProlog(null, undefined)).toThrow(
      "Prolog runtime not initialized",
    );
    expect(() => requireActiveProlog(undefined, null)).toThrow(
      "Prolog runtime not initialized",
    );
  });
});

describe("migration note", () => {
  test("up to five ids are listed", () => {
    expect(migrationOnlyNote(["S1", "S2"])).toBe(
      "Migration commit: 2 symbol record(s) changed only by kibi migrate (legacy-link marks, review:context-missing tags) are not judged as changed by this commit: S1, S2. Run kibi check for the full report.",
    );
    expect(migrationOnlyNote(["1", "2", "3", "4", "5"])).toContain(
      ": 1, 2, 3, 4, 5. Run",
    );
  });

  test("more than five ids are counted", () => {
    expect(migrationOnlyNote(["1", "2", "3", "4", "5", "6", "7"])).toContain(
      "7 symbol record(s) changed only by kibi migrate (legacy-link marks, review:context-missing tags) are not judged as changed by this commit: 1, 2, 3, 4, 5 and 2 more. Run",
    );
  });
});

describe("diagnostic rendering", () => {
  test("staged impact diagnostics list their optional parts", () => {
    const full = {
      severity: "error",
      id: "kibi_impact_missing",
      message: "Missing",
      files: ["a.ts", "b.ts"],
      details: ["d1", "d2"],
      docs: ["docs/x.md", "docs/y.md"],
      suggestion: "Fix it",
    };
    const bare = {
      severity: "warning",
      id: "kibi_other",
      message: "Bare",
      files: [],
      docs: [],
      suggestion: "Nothing",
    };
    expect(
      formatStagedKibiDiagnostics([
        full,
        bare,
      ] as unknown as KibiImpactDiagnostic[]),
    ).toBe(
      [
        "[ERROR kibi_impact_missing] Missing",
        "  Files: a.ts, b.ts",
        "  Detail: d1",
        "  Detail: d2",
        "  Docs: docs/x.md, docs/y.md",
        "  Suggestion: Fix it",
        "",
        "[WARNING kibi_other] Bare",
        "  Suggestion: Nothing",
      ].join("\n"),
    );
  });

  test("quality diagnostics list their optional parts", () => {
    expect(formatQualityDiagnostics([])).toBe("");
    const diagnostics = [
      {
        severity: "warning",
        id: "q1",
        message: "First",
        entityId: "REQ-1",
        files: ["a.ts", "b.ts"],
        docs: ["d.md", "e.md"],
        blocking: true,
        suggestion: "Do",
      },
      {
        severity: "info",
        id: "q2",
        message: "Second",
        files: [],
        docs: [],
        blocking: false,
        suggestion: "Skip",
      },
      {
        severity: "info",
        id: "q3",
        message: "Third",
        blocking: false,
        suggestion: "None",
      },
    ] as unknown as QualityDiagnostic[];
    expect(formatQualityDiagnostics(diagnostics)).toBe(
      [
        "Quality diagnostics (3):",
        "[WARNING q1] First",
        "  Entity: REQ-1",
        "  Files: a.ts, b.ts",
        "  Docs: d.md, e.md",
        "  Blocking: yes",
        "  Suggestion: Do",
        "",
        "[INFO q2] Second",
        "  Blocking: no",
        "  Suggestion: Skip",
        "",
        "[INFO q3] Third",
        "  Blocking: no",
        "  Suggestion: None",
      ].join("\n"),
    );
  });

  test("a structured result carries violations and quality diagnostics", () => {
    const io = captureConsole();
    printStructuredCheckResult({
      violations: [
        { rule: "r", entityId: "e", description: "d", suggestion: "s" },
      ],
      qualityDiagnostics: [{ id: "q" } as unknown as QualityDiagnostic],
    });
    expect(io.logs().map((line) => JSON.parse(line))).toEqual([
      {
        structuredContent: {
          violations: [
            { rule: "r", entityId: "e", description: "d", suggestion: "s" },
          ],
          count: 1,
          diagnostics: [],
          qualityDiagnostics: [{ id: "q" }],
        },
      },
    ]);
  });
});

function coverage(
  files: Array<Record<string, unknown>>,
  diagnostics: Array<Record<string, unknown>> = [],
): StagedFileCoverageResult {
  return {
    version: 1,
    files: files.map((file) => ({
      status: "M",
      analysisDepth: "file",
      disposition: "checked",
      requirementIds: [],
      evidencePaths: [],
      ...file,
    })),
    diagnostics,
  } as unknown as StagedFileCoverageResult;
}

describe("staged coverage rendering", () => {
  test("files are counted by depth and listed with their details", () => {
    const result = coverage(
      [
        {
          path: "src/a.ts",
          status: "A",
          analysisDepth: "symbol",
          requirementIds: ["REQ-1", "REQ-2"],
          evidencePaths: ["docs/a.md", "docs/b.md"],
        },
        { path: "src/b.ts", analysisDepth: "symbol" },
        { path: "docs/c.md", analysisDepth: "metadata" },
        {
          path: "img.png",
          analysisDepth: "none",
          disposition: "skipped",
          reason: "binary",
        },
        { path: "x.txt", disposition: "advisory" },
      ],
      [
        { id: "d1", message: "M1", suggestion: "S1" },
        { id: "d2", message: "M2", suggestion: "S2" },
      ],
    );
    expect(formatStagedCoverage(result)).toBe(
      [
        "Staged files: 5 total; 2 symbol-level; 1 metadata; 1 file-level; 1 skipped.",
        "  A src/a.ts [symbol; checked; requirements: REQ-1, REQ-2; evidence: docs/a.md, docs/b.md]",
        "  M src/b.ts [symbol; checked]",
        "  M docs/c.md [metadata; checked]",
        "  M img.png [none; skipped; binary]",
        "  M x.txt [file; advisory]",
        "",
        "Advisory staged-file diagnostics (2):",
        "  [d1] M1",
        "    Suggestion: S1",
        "  [d2] M2",
        "    Suggestion: S2",
      ].join("\n"),
    );
  });

  test("no diagnostics means no advisory section", () => {
    expect(formatStagedCoverage(coverage([]))).toBe(
      "Staged files: 0 total; 0 symbol-level; 0 metadata; 0 file-level; 0 skipped.",
    );
  });

  test("json output carries every part", () => {
    const io = captureConsole();
    const staged = coverage([{ path: "a.ts" }], [{ id: "d" }]);
    printStagedResult({
      format: "json",
      coverage: staged,
      violations: [{ v: 1 }],
      qualityDiagnostics: [{ q: 1 }],
      messages: ["m"],
      operationalError: "boom",
    });
    printStagedResult({ format: "json", coverage: null });
    const [first, second] = io.logs().map((line) => JSON.parse(line));
    expect(first).toEqual({
      structuredContent: {
        violations: [{ v: 1 }],
        count: 1,
        diagnostics: [{ id: "d" }],
        qualityDiagnostics: [{ q: 1 }],
        staged: JSON.parse(JSON.stringify(staged)),
        messages: ["m"],
        operationalError: "boom",
      },
    });
    expect(second).toEqual({
      structuredContent: {
        violations: [],
        count: 0,
        diagnostics: [],
        qualityDiagnostics: [],
        staged: null,
        messages: [],
      },
    });
    expect(io.errors()).toEqual([]);
  });

  test("text output prints coverage, messages and the error", () => {
    const io = captureConsole();
    printStagedResult({
      format: "text",
      coverage: coverage([]),
      messages: ["one", "two"],
      operationalError: "boom",
    });
    expect(io.logs()).toEqual([
      "Staged files: 0 total; 0 symbol-level; 0 metadata; 0 file-level; 0 skipped.",
      "one",
      "two",
    ]);
    expect(io.errors()).toEqual(["boom"]);
  });

  test("text output without parts prints nothing", () => {
    const io = captureConsole();
    printStagedResult({ format: undefined, coverage: null });
    expect(io.logs()).toEqual([]);
    expect(io.errors()).toEqual([]);
  });
});

describe("impact review advisories", () => {
  const needed = (path: string) => ({
    id: "staged_file_impact_review_needed",
    path,
  });
  const ownership = (path: string) => ({
    id: "staged_file_ownership_missing",
    path,
  });

  test("review requests for staged files are cleared", () => {
    const result = coverage(
      [{ path: "src/a.ts" }],
      [
        needed("src/a.ts"),
        needed("src/other.ts"),
        ownership("src/a.ts"),
        needed(IMPACT_REVIEW_PATH),
      ],
    );
    clearResolvedImpactReviewAdvisories(result);
    expect(result.diagnostics).toEqual([
      needed("src/other.ts"),
      ownership("src/a.ts"),
      needed(IMPACT_REVIEW_PATH),
    ] as never);
  });

  test("a staged review file is not reviewed by itself", () => {
    const result = coverage(
      [{ path: IMPACT_REVIEW_PATH, status: "R", oldPath: "old.yaml" }],
      [needed(IMPACT_REVIEW_PATH)],
    );
    clearResolvedImpactReviewAdvisories(result);
    expect(result.diagnostics).toEqual([needed(IMPACT_REVIEW_PATH)] as never);
  });

  test.each([
    ["A", undefined, true],
    ["M", undefined, true],
    ["D", undefined, false],
    ["R", undefined, false],
    ["M", "old.yaml", false],
  ])(
    "a review file staged %s from %p clears its ownership advisory: %p",
    (status, oldPath, cleared) => {
      const result = coverage(
        [
          {
            path: IMPACT_REVIEW_PATH,
            status,
            ...(oldPath ? { oldPath } : {}),
          },
        ],
        [
          ownership(IMPACT_REVIEW_PATH),
          ownership("src/a.ts"),
          needed(IMPACT_REVIEW_PATH),
        ],
      );
      clearResolvedImpactReviewAdvisories(result);
      expect(result.diagnostics).toEqual(
        (cleared
          ? [ownership("src/a.ts"), needed(IMPACT_REVIEW_PATH)]
          : [
              ownership(IMPACT_REVIEW_PATH),
              ownership("src/a.ts"),
              needed(IMPACT_REVIEW_PATH),
            ]) as never,
      );
    },
  );

  test("without a review file every ownership advisory stays", () => {
    const result = coverage(
      [{ path: "src/a.ts" }],
      [ownership(IMPACT_REVIEW_PATH)],
    );
    clearResolvedImpactReviewAdvisories(result);
    expect(result.diagnostics).toEqual([
      ownership(IMPACT_REVIEW_PATH),
    ] as never);
  });
});

describe("no validated symbols message", () => {
  const side = (status: string, providerId?: string) => ({
    status,
    ...(providerId ? { providerId } : {}),
  });
  const analysis = (entries: Array<[string, unknown, unknown]>) =>
    new Map(
      entries.map(([path, before, after]) => [path, { path, before, after }]),
    ) as unknown as Map<string, SourceChangeAnalysis>;

  test("without partial analysis the plain message is used", () => {
    const expected =
      "No exported symbols or staged entities found in staged files.";
    expect(noValidatedSymbolsMessage(new Map())).toBe(expected);
    expect(
      noValidatedSymbolsMessage(analysis([["a.ts", side("complete"), null]])),
    ).toBe(expected);
  });

  test("partial sides are named with their provider", () => {
    expect(
      noValidatedSymbolsMessage(
        analysis([
          ["a.ts", side("partial", "ts-provider"), side("complete")],
          ["b.ts", null, side("partial")],
          ["c.ts", side("complete"), side("complete")],
          ["d.ts", undefined, side("partial", "py")],
        ]),
      ),
    ).toBe(
      "Partial source analysis was reviewed for a.ts via ts-provider, b.ts, d.ts via py; the staged change touches no declaration the analyzer placed and no staged entity.",
    );
  });
});

function symbol(
  id: string,
  title: string,
  extra: Partial<ExtractionResult> & { source?: string } = {},
): ExtractionResult {
  const { source, ...rest } = extra;
  return {
    entity: {
      id,
      type: "symbol",
      title,
      ...(source ? { source } : {}),
    },
    relationships: [],
    ...rest,
  } as unknown as ExtractionResult;
}

const SENTINEL = createManifestLookupSentinelKey(
  CANONICAL_ENTITY_PATHS.symbols,
);

describe("manifest lookup", () => {
  test("snapshot symbols are indexed by source and title", () => {
    const linked = symbol("SYM-1", "one", {
      sourceFile: "src/a.ts",
      relationships: [
        { type: "implements", from: "SYM-1", to: "REQ-1" },
        { type: "covered_by", from: "SYM-1", to: "TEST-1" },
        { type: "executable_for", from: "SYM-1", to: "SCN-1" },
        { type: "relates_to", from: "SYM-1", to: "ADR-1" },
      ],
    });
    const bySource = symbol("SYM-2", "two", { source: "src/b.ts" });
    const unplaced = symbol("SYM-3", "three");
    const req = {
      entity: { id: "REQ-1", type: "req", title: "r", source: "docs/r.md" },
      relationships: [],
    } as unknown as ExtractionResult;
    const result = buildManifestLookup([], [linked, bySource, unplaced, req]);
    expect([...result.manifestLookup.entries()]).toEqual([
      [SENTINEL, { id: CANONICAL_ENTITY_PATHS.symbols }],
      [
        "src/a.ts:one",
        {
          id: "SYM-1",
          relationships: [
            { type: "implements", to: "REQ-1" },
            { type: "covered_by", to: "TEST-1" },
            { type: "executable_for", to: "SCN-1" },
          ],
        },
      ],
      ["src/b.ts:two", { id: "SYM-2", relationships: [] }],
    ]);
    expect(result.authoredSymbolResults).toEqual([linked, bySource, unplaced]);
    expect(result.manifestResults).toEqual([]);
    expect(result.stagedAuthoredSymbolResults).toEqual([]);
  });

  test("a locator two symbols share is dropped for good", () => {
    const result = buildManifestLookup(
      [],
      [
        symbol("SYM-1", "same", { sourceFile: "src/a.ts" }),
        symbol("SYM-2", "same", { sourceFile: "src/a.ts" }),
        symbol("SYM-3", "same", { sourceFile: "src/a.ts" }),
        symbol("SYM-4", "other", { sourceFile: "src/a.ts" }),
      ],
    );
    expect([...result.manifestLookup.keys()]).toEqual([
      SENTINEL,
      "src/a.ts:other",
    ]);
    expect(result.authoredSymbolResults).toHaveLength(4);
  });

  test("results are keyed by id, else by source and title", () => {
    const first = symbol("SYM-1", "one", { sourceFile: "src/a.ts" });
    const again = symbol("SYM-1", "renamed", { sourceFile: "src/c.ts" });
    const anonA = symbol("", "anon", { sourceFile: "src/a.ts" });
    const anonB = symbol("", "anon", { sourceFile: "src/b.ts" });
    const anonSourced = symbol("", "anon", { source: "src/b.ts" });
    const anonBare = symbol("", "anon");
    const anonBareAgain = symbol("", "anon");
    const anonOtherTitle = symbol("", "other");
    const result = buildManifestLookup(
      [],
      [
        first,
        again,
        anonA,
        anonB,
        anonSourced,
        anonBare,
        anonBareAgain,
        anonOtherTitle,
      ],
    );
    expect(result.authoredSymbolResults).toEqual([
      first,
      anonA,
      anonB,
      anonBare,
      anonOtherTitle,
    ]);
  });

  const MANIFEST = `symbols:
  - id: SYM-1
    title: one
    sourceFile: src/a.ts
    links:
      - REQ-1
    status: active
  - id: SYM-1
    title: one again
    sourceFile: src/a.ts
    status: active
  - id: SYM-9
    title: nine
    status: active
`;

  function staged(path: string, content?: string): StagedFile {
    return {
      path,
      status: "M",
      hunkRanges: [],
      ...(content === undefined ? {} : { content }),
    };
  }

  test.each([[CANONICAL_ENTITY_PATHS.symbols], [".kb/symbols.yml"]])(
    "a staged manifest at %s replaces snapshot symbols",
    (manifestPath) => {
      const snapshot = symbol("SYM-1", "old", { sourceFile: "src/a.ts" });
      const keep = symbol("SYM-2", "two", { sourceFile: "src/b.ts" });
      const result = buildManifestLookup(
        [
          staged(manifestPath, MANIFEST),
          staged("docs/other.yaml", MANIFEST),
          staged(".kb/symbols.yml"),
        ],
        [snapshot, keep],
      );
      expect(
        result.manifestLookup.get(
          createManifestLookupSentinelKey(manifestPath),
        ),
      ).toEqual({ id: manifestPath, relationships: [] });
      expect([...result.manifestLookup.keys()]).toEqual(
        manifestPath === CANONICAL_ENTITY_PATHS.symbols
          ? [SENTINEL, "src/a.ts:old", "src/b.ts:two"]
          : [
              SENTINEL,
              "src/a.ts:old",
              "src/b.ts:two",
              createManifestLookupSentinelKey(manifestPath),
            ],
      );
      for (const results of [
        result.manifestResults,
        result.authoredSymbolResults,
        result.stagedAuthoredSymbolResults,
      ]) {
        const nineResult = results.find((r) => r.entity.id === "SYM-9");
        expect(nineResult !== undefined && "sourceFile" in nineResult).toBe(
          false,
        );
        expect(results.find((r) => r.entity.id === "SYM-1")?.sourceFile).toBe(
          "src/a.ts",
        );
      }
      expect(result.manifestResults.map((r) => r.entity.title)).toEqual([
        "one again",
        "nine",
      ]);
      expect(result.authoredSymbolResults.map((r) => r.entity.title)).toEqual([
        "one again",
        "two",
        "nine",
      ]);
      expect(
        result.stagedAuthoredSymbolResults.map((r) => r.entity.title),
      ).toEqual(["one", "nine"]);
      const [one, nine] = result.manifestResults;
      expect(one?.sourceFile).toBe("src/a.ts");
      expect(one?.entity.id).toBe("SYM-1");
      expect(nine !== undefined && "sourceFile" in nine).toBe(false);
      expect(result.stagedAuthoredSymbolResults[0]?.relationships).toEqual([
        { type: "implements", from: "SYM-1", to: "REQ-1" },
      ]);
    },
  );

  test("a manifest that does not parse adds only its sentinel", () => {
    const result = buildManifestLookup(
      [staged(".kb/symbols.yml", "symbols: [unclosed")],
      [],
    );
    expect([...result.manifestLookup.entries()]).toEqual([
      [SENTINEL, { id: CANONICAL_ENTITY_PATHS.symbols }],
      [
        createManifestLookupSentinelKey(".kb/symbols.yml"),
        { id: ".kb/symbols.yml", relationships: [] },
      ],
    ]);
    expect(result.manifestResults).toEqual([]);
  });

  test("an empty staged manifest is still read", () => {
    const result = buildManifestLookup(
      [staged(CANONICAL_ENTITY_PATHS.symbols, "")],
      [],
    );
    expect(result.manifestLookup.size).toBe(1);
    expect(result.manifestLookup.get(SENTINEL)).toEqual({
      id: CANONICAL_ENTITY_PATHS.symbols,
      relationships: [],
    });
  });
});
