import { afterEach, describe, expect, it } from "bun:test";
import path from "node:path";
import type { StagedFile } from "../../src/traceability/git-staged.js";
import {
  assessStagedSymbolsManifest,
  collectStagedAuthoredSymbolsManifestEvidence,
} from "../../src/traceability/staged-symbols-manifest.js";

/**
 * Behavior tests for the staged symbols manifest assessment.
 *
 * Every fixture is an in-memory {path, content} staged file. The manifest
 * lives under a directory git HEAD never contains, so the assessor's internal
 * HEAD lookups deterministically resolve to "missing" and each verdict below
 * is driven purely by the staged set passed in. Coordinates are derived and
 * never staged, so the assessment compares declaration titles only.
 */
const MANIFEST_DIR = "kibi-assessment-fixtures";
const SYMBOLS_PATH = `${MANIFEST_DIR}/symbols.yaml`;

const initialCwd = process.cwd();

afterEach(() => {
  if (process.cwd() !== initialCwd) {
    process.chdir(initialCwd);
  }
});

function staged(filePath: string, content: string | undefined): StagedFile {
  return { path: filePath, status: "M", hunkRanges: [], content };
}

const ALPHA_SOURCE = "export function alpha() {\n  return 1;\n}\n";
const MOVED_ALPHA_SOURCE = `// a comment that moves alpha down\n\n${ALPHA_SOURCE}`;
const TWO_FN_SOURCE = `${ALPHA_SOURCE}\nexport function beta() {\n  return 2;\n}\n`;
const FRESH_SOURCE = "export function freshFn() {\n  return 1;\n}\n";
const STALE_A_SOURCE =
  "export function keepFn() {\n  return 1;\n}\n\nexport function addedFn() {\n  return 2;\n}\n";
const STALE_B_SOURCE = "export function bFn() {\n  return 1;\n}\n";
const MANY_FN_SOURCE = `${Array.from(
  { length: 8 },
  (_, index) =>
    `export function symFn${index + 1}() {\n  return ${index + 1};\n}`,
).join("\n")}\n`;

function manifestOf(records: string[]): string {
  return `symbols:\n${records.join("\n")}\n`;
}

function record(id: string, title: string, sourceFile: string): string {
  return `  - id: ${id}\n    title: ${title}\n    sourceFile: ${sourceFile}`;
}

function coarseRecord(
  id: string,
  title: string,
  sourceFile: string,
  reason = "module-level-behavior",
): string {
  return `${record(id, title, sourceFile)}\n    granularity_reason: ${reason}`;
}

function assess(options: {
  symbolsManifestPath?: string;
  sourceFiles: StagedFile[];
  stagedFiles: StagedFile[];
}) {
  return assessStagedSymbolsManifest({
    symbolsManifestPath: options.symbolsManifestPath ?? SYMBOLS_PATH,
    sourceFiles: options.sourceFiles,
    stagedFiles: options.stagedFiles,
  });
}

describe("assessStagedSymbolsManifest", () => {
  it("is fresh when the manifest covers every staged declaration, with no coordinates staged", () => {
    const source = staged("src/two-fns.ts", TWO_FN_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([
              record("SYM-alpha", "alpha", "src/two-fns.ts"),
              record("SYM-beta", "beta", "src/two-fns.ts"),
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/two-fns.ts"],
      path: SYMBOLS_PATH,
    });
  });

  it("stays fresh when a declaration only moved", () => {
    const source = staged("src/alpha.ts", MOVED_ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([record("SYM-alpha", "alpha", "src/alpha.ts")]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/alpha.ts"],
      path: SYMBOLS_PATH,
    });
  });

  it("uses the committed manifest when the staged change does not touch it", () => {
    const source = staged(`${MANIFEST_DIR}/alpha.ts`, ALPHA_SOURCE);

    const result = assessStagedSymbolsManifest({
      symbolsManifestPath: SYMBOLS_PATH,
      sourceFiles: [source],
      stagedFiles: [source],
      readBaseFile: (filePath) =>
        filePath === SYMBOLS_PATH
          ? manifestOf([record("SYM-alpha", "alpha", source.path)])
          : null,
    });

    expect(result).toEqual({
      state: "fresh",
      sourcePaths: [source.path],
      path: SYMBOLS_PATH,
    });
  });

  it("keeps every missing symbol title in the assessment instead of capping the list", () => {
    const sourcePath = "src/many-fns.ts";
    const source = staged(sourcePath, MANY_FN_SOURCE);

    const result = assess({
      sourceFiles: [source],
      stagedFiles: [
        source,
        staged(
          SYMBOLS_PATH,
          manifestOf([record("SYM-sym-fn-1", "symFn1", sourcePath)]),
        ),
      ],
    });

    expect(result.state).toBe("stale");
    expect(result.fileDetails).toEqual([
      {
        path: sourcePath,
        expectedCount: 8,
        coveredCount: 1,
        missing: [
          { title: "symFn2", line: 4 },
          { title: "symFn3", line: 7 },
          { title: "symFn4", line: 10 },
          { title: "symFn5", line: 13 },
          { title: "symFn6", line: 16 },
          { title: "symFn7", line: 19 },
          { title: "symFn8", line: 22 },
        ],
        extra: [],
      },
    ]);
  });

  it("keeps every extra evidence title and counts only matched symbols as covered", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);
    const ghostTitles = Array.from(
      { length: 8 },
      (_, index) => `ghost${index + 1}`,
    );

    const result = assess({
      sourceFiles: [source],
      stagedFiles: [
        source,
        staged(
          SYMBOLS_PATH,
          manifestOf([
            record("SYM-alpha", "alpha", "src/alpha.ts"),
            ...ghostTitles.map((title) =>
              record(`SYM-${title}`, title, "src/alpha.ts"),
            ),
          ]),
        ),
      ],
    });

    expect(result.state).toBe("stale");
    expect(result.fileDetails).toEqual([
      {
        path: "src/alpha.ts",
        expectedCount: 1,
        coveredCount: 1,
        missing: [],
        extra: ghostTitles,
      },
    ]);
  });

  it("treats a file documented only with coarse records as not required", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([
              coarseRecord("SYM-alpha-module", "alpha", "src/alpha.ts"),
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "not_required",
      sourcePaths: [],
      path: SYMBOLS_PATH,
    });
  });

  it("exempts coarse-anchored titles while checking granular records in the same file", () => {
    const source = staged("src/two-fns.ts", TWO_FN_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([
              record("SYM-alpha", "alpha", "src/two-fns.ts"),
              coarseRecord("SYM-beta-module", "beta", "src/two-fns.ts"),
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/two-fns.ts"],
      path: SYMBOLS_PATH,
    });
  });

  it("collapses duplicate granular records into one covered symbol", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([
              record("SYM-alpha-one", "alpha", "src/alpha.ts"),
              record("SYM-alpha-two", "alpha", "src/alpha.ts"),
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/alpha.ts"],
      path: SYMBOLS_PATH,
    });
  });

  it("fails closed when the staged manifest is unparseable or carries no content", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);
    const expectedStaleAllMissing = {
      state: "stale" as const,
      sourcePaths: ["src/alpha.ts"],
      path: SYMBOLS_PATH,
      fileDetails: [
        {
          path: "src/alpha.ts",
          expectedCount: 1,
          coveredCount: 0,
          missing: [{ title: "alpha", line: 1 }],
          extra: [],
        },
      ],
    };

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [source, staged(SYMBOLS_PATH, "symbols: [\n")],
      }),
    ).toEqual(expectedStaleAllMissing);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [source, staged(SYMBOLS_PATH, undefined)],
      }),
    ).toEqual(expectedStaleAllMissing);
  });

  it("does not count a staged coordinate file as coverage", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            `${MANIFEST_DIR}/symbol-coordinates.yaml`,
            "version: 2\ncoordinates:\n  SYM-alpha:\n    sourceFile: src/alpha.ts\n",
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/alpha.ts"],
      path: SYMBOLS_PATH,
      fileDetails: [
        {
          path: "src/alpha.ts",
          expectedCount: 1,
          coveredCount: 0,
          missing: [{ title: "alpha", line: 1 }],
          extra: [],
        },
      ],
    });
  });

  it("resolves an absolute manifest path relative to the working directory", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        symbolsManifestPath: path.join(
          process.cwd(),
          MANIFEST_DIR,
          "symbols.yaml",
        ),
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([record("SYM-alpha", "alpha", "src/alpha.ts")]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/alpha.ts"],
      path: SYMBOLS_PATH,
    });
  });

  it("skips source files with nothing to extract", () => {
    const source = staged("docs/notes.md", "# Notes\n");

    expect(assess({ sourceFiles: [source], stagedFiles: [source] })).toEqual({
      state: "not_required",
      sourcePaths: [],
      path: SYMBOLS_PATH,
    });
  });

  it("lists only uncovered paths in a stale verdict and sorts per-file details", () => {
    const freshSource = staged("src/fresh-file.ts", FRESH_SOURCE);
    const staleASource = staged("src/stale-a.ts", STALE_A_SOURCE);
    const staleBSource = staged("src/stale-b.ts", STALE_B_SOURCE);

    expect(
      assess({
        sourceFiles: [staleBSource, freshSource, staleASource],
        stagedFiles: [
          staleASource,
          freshSource,
          staleBSource,
          staged(
            SYMBOLS_PATH,
            manifestOf([
              record("SYM-keep-fn", "keepFn", "src/stale-a.ts"),
              record("SYM-fresh-fn", "freshFn", "src/fresh-file.ts"),
              record("SYM-b-fn", "bFn", "src/stale-b.ts"),
              record("SYM-gone-fn", "goneFn", "src/stale-b.ts"),
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/stale-a.ts", "src/stale-b.ts"],
      path: SYMBOLS_PATH,
      fileDetails: [
        {
          path: "src/stale-a.ts",
          expectedCount: 2,
          coveredCount: 1,
          missing: [{ title: "addedFn", line: 5 }],
          extra: [],
        },
        {
          path: "src/stale-b.ts",
          expectedCount: 1,
          coveredCount: 1,
          missing: [],
          extra: ["goneFn"],
        },
      ],
    });
  });
});

describe("collectStagedAuthoredSymbolsManifestEvidence", () => {
  it("returns empty evidence when the symbols manifest is not staged", () => {
    expect(
      collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [],
        stagedFiles: [],
      }),
    ).toEqual({
      path: ".kb/symbols.yaml",
      entries: [],
      changedEntityIds: [],
    });
  });

  it("fails closed to empty evidence when the staged manifest is unparseable", () => {
    const source = staged("src/authored-app.ts", ALPHA_SOURCE);

    expect(
      collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [source],
        stagedFiles: [staged(".kb/symbols.yaml", "symbols: [\n")],
      }),
    ).toEqual({
      path: ".kb/symbols.yaml",
      entries: [],
      changedEntityIds: [],
    });
  });

  it("reports changed authored entities with normalized metadata", () => {
    const manifest = `symbols:
  - id: SYM-AUTH-ALPHA
    title: alpha
    sourceFile: src/authored-app.ts
    status: active
    links:
      - REQ-1
      - type: implements
        target: REQ-1
      - 12
      - type: missing
    relationships:
      - type: implements
        target: REQ-2
      - type: only
      - 4
    tags:
      - zed
      - 1
      - abc
    owner: alice
    priority: must
    severity: high
    text_ref: body
    granularity_reason: exported-function
  - title: noIdentifier
    sourceFile: src/authored-app.ts
    status: active
  - id: SYM-AUTH-LEGACY
    title: legacySource
    source: src/legacy-authored.ts
`;

    expect(
      collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [staged("src/authored-app.ts", ALPHA_SOURCE)],
        stagedFiles: [staged(".kb/symbols.yaml", manifest)],
      }),
    ).toEqual({
      path: ".kb/symbols.yaml",
      entries: [
        { sourcePath: "src/authored-app.ts", entityIds: ["SYM-AUTH-ALPHA"] },
      ],
      changedEntityIds: ["SYM-AUTH-ALPHA", "SYM-AUTH-LEGACY"],
    });
  });

  it("returns no entries for source files without authored changes", () => {
    expect(
      collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [
          staged(
            "src/unrelated.ts",
            "export function other() {\n  return 1;\n}\n",
          ),
        ],
        stagedFiles: [
          staged(
            ".kb/symbols.yaml",
            manifestOf([
              record("SYM-AUTH-ALPHA", "alpha", "src/authored-app.ts"),
            ]),
          ),
        ],
      }),
    ).toEqual({
      path: ".kb/symbols.yaml",
      entries: [],
      changedEntityIds: ["SYM-AUTH-ALPHA"],
    });
  });
});
