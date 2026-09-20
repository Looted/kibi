import { afterEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import path from "node:path";
import type { StagedFile } from "../../src/traceability/git-staged.js";
import {
  assessStagedSymbolsManifest,
  collectStagedAuthoredSymbolsManifestEvidence,
} from "../../src/traceability/staged-symbols-manifest.js";

/**
 * Behavior tests for the staged symbols manifest assessment.
 *
 * Every fixture is an in-memory {path, content} staged file. The manifest and
 * coordinate artifacts live under a directory git HEAD never contains, so the
 * assessor's internal HEAD lookups deterministically resolve to "missing" and
 * each verdict below is driven purely by the staged set passed in. A staged
 * three-line `export function name()` declaration always extracts as
 * startLine L, startColumn 16, endLine L+2, endColumn 1.
 */
const MANIFEST_DIR = "kibi-assessment-fixtures";
const SYMBOLS_PATH = `${MANIFEST_DIR}/symbols.yaml`;
const COORDINATES_PATH = `${MANIFEST_DIR}/symbol-coordinates.yaml`;

const initialCwd = process.cwd();

afterEach(() => {
  if (process.cwd() !== initialCwd) {
    process.chdir(initialCwd);
  }
});

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function staged(filePath: string, content: string | undefined): StagedFile {
  return { path: filePath, status: "M", hunkRanges: [], content };
}

const ALPHA_SOURCE = `export function alpha() {\n  return 1;\n}\n`;
const TWO_FN_SOURCE = `${ALPHA_SOURCE}\nexport function beta() {\n  return 2;\n}\n`;
const FRESH_SOURCE = `export function freshFn() {\n  return 1;\n}\n`;
const STALE_A_SOURCE = `export function keepFn() {\n  return 1;\n}\n\nexport function addedFn() {\n  return 2;\n}\n`;
const STALE_B_SOURCE = `export function bFn() {\n  return 1;\n}\n`;
const MANY_FN_SOURCE = `${Array.from(
  { length: 8 },
  (_, index) =>
    `export function symFn${index + 1}() {\n  return ${index + 1};\n}`,
).join("\n")}\n`;

interface CoordinateSpan {
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
}

function spanAt(line: number): CoordinateSpan {
  return {
    sourceLine: line,
    sourceColumn: 16,
    sourceEndLine: line + 2,
    sourceEndColumn: 1,
  };
}

interface CoordinateBinding {
  id: string;
  title: string;
  sourceFile: string;
  granularityReason?: string;
  sourceText: string;
  span?: CoordinateSpan;
}

function coordinateArtifact(bindings: CoordinateBinding[]): string {
  const lines = ["version: 2", "coordinates:"];
  for (const binding of bindings) {
    const identityHash = sha256(
      [
        binding.id,
        binding.title,
        binding.sourceFile,
        binding.granularityReason ?? "",
      ].join("\u0000"),
    );
    const span = binding.span ?? spanAt(1);
    lines.push(
      `  ${binding.id}:`,
      `    identityHash: ${identityHash}`,
      `    sourceHash: ${sha256(binding.sourceText)}`,
      `    sourceFile: ${binding.sourceFile}`,
      `    sourceLine: ${span.sourceLine}`,
      `    sourceColumn: ${span.sourceColumn}`,
      `    sourceEndLine: ${span.sourceEndLine}`,
      `    sourceEndColumn: ${span.sourceEndColumn}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function manifestOf(records: string[]): string {
  return `symbols:\n${records.join("\n")}\n`;
}

function record(id: string, title: string, sourceFile: string): string {
  return `  - id: ${id}\n    title: ${title}\n    sourceFile: ${sourceFile}`;
}

function recordWithSourceKey(
  id: string,
  title: string,
  source: string,
): string {
  return `  - id: ${id}\n    title: ${title}\n    source: ${source}`;
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
  it("reports every extracted symbol as uncovered when no coordinates artifact is staged", () => {
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
      state: "missing",
      sourcePaths: ["src/two-fns.ts"],
      path: COORDINATES_PATH,
      fileDetails: [
        {
          path: "src/two-fns.ts",
          expectedCount: 2,
          coveredCount: 0,
          missing: [
            { title: "alpha", line: 1 },
            { title: "beta", line: 5 },
          ],
          extra: [],
        },
      ],
    });
  });

  it("marks the refresh fresh when staged coordinates match the staged extraction", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([record("SYM-alpha", "alpha", "src/alpha.ts")]),
          ),
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
    });
  });

  it("reports pure coordinate drift as stale without per-symbol details", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([record("SYM-alpha", "alpha", "src/alpha.ts")]),
          ),
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                // Hash of different bytes: the binding no longer matches the
                // staged source, so the overlay is dropped while the title
                // stays covered. There is no symbol-level remedy to name.
                sourceText: `${ALPHA_SOURCE}// drifted bytes`,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
    });
  });

  it("lists manifest records absent from the staged extraction as extra symbols", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([
              record("SYM-alpha", "alpha", "src/alpha.ts"),
              recordWithSourceKey("SYM-ghost", "ghost", "src/alpha.ts"),
            ]),
          ),
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
              {
                id: "SYM-ghost",
                title: "ghost",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
      fileDetails: [
        {
          path: "src/alpha.ts",
          expectedCount: 1,
          coveredCount: 2,
          missing: [],
          extra: ["ghost"],
        },
      ],
    });
  });

  it("caps missing-symbol details at six titles per file", () => {
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
        staged(
          COORDINATES_PATH,
          coordinateArtifact([
            {
              id: "SYM-sym-fn-1",
              title: "symFn1",
              sourceFile: sourcePath,
              sourceText: MANY_FN_SOURCE,
            },
          ]),
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
        ],
        extra: [],
      },
    ]);
  });

  it("treats a file documented only with coarse records as not requiring coordinates", () => {
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
      path: COORDINATES_PATH,
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
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha",
                title: "alpha",
                sourceFile: "src/two-fns.ts",
                sourceText: TWO_FN_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/two-fns.ts"],
      path: COORDINATES_PATH,
    });
  });

  it("keeps a title checked when a granular record shares it with a coarse anchor", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS_PATH,
            manifestOf([
              record("SYM-alpha", "alpha", "src/alpha.ts"),
              coarseRecord("SYM-alpha-module", "alpha", "src/alpha.ts"),
            ]),
          ),
          staged(COORDINATES_PATH, "version: 2\ncoordinates: {}\n"),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
    });
  });

  it("collapses identical duplicate granular records into one covered symbol", () => {
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
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha-one",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
              {
                id: "SYM-alpha-two",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
    });
  });

  it("keeps divergent duplicate granular records visible to the equality check", () => {
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
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha-one",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
              {
                id: "SYM-alpha-two",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                // Identity and source hashes bind correctly, but the recorded
                // span points somewhere else: the duplicate must not collapse
                // onto the validated one.
                sourceText: ALPHA_SOURCE,
                span: spanAt(9),
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
    });
  });

  it("fails closed when the staged manifest is unparseable or carries no content", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);
    const coordinates = staged(
      COORDINATES_PATH,
      coordinateArtifact([
        {
          id: "SYM-alpha",
          title: "alpha",
          sourceFile: "src/alpha.ts",
          sourceText: ALPHA_SOURCE,
        },
      ]),
    );

    const expectedStaleAllMissing = {
      state: "stale" as const,
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
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
        stagedFiles: [
          source,
          staged(SYMBOLS_PATH, "symbols: [\n"),
          coordinates,
        ],
      }),
    ).toEqual(expectedStaleAllMissing);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [source, staged(SYMBOLS_PATH, undefined), coordinates],
      }),
    ).toEqual(expectedStaleAllMissing);
  });

  it("does not count coordinate bindings as coverage without manifest authoring", () => {
    const source = staged("src/alpha.ts", ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
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
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha",
                title: "alpha",
                sourceFile: "src/alpha.ts",
                sourceText: ALPHA_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "fresh",
      sourcePaths: ["src/alpha.ts"],
      path: COORDINATES_PATH,
    });
  });

  it("falls back to HEAD for source files absent from the staged set", () => {
    // The fixture directory never exists in git HEAD, so the HEAD fallback for
    // the unstaged source resolves to "missing": identity-bound coordinates
    // computed from the claimed bytes must not validate against text the
    // assessment cannot see. The second record's lookup reuses the
    // per-assessment HEAD cache.
    const unstagedPath = `${MANIFEST_DIR}/unstaged-app.ts`;
    const sourceFileEntry = staged(unstagedPath, ALPHA_SOURCE);

    expect(
      assess({
        sourceFiles: [sourceFileEntry],
        stagedFiles: [
          staged(
            SYMBOLS_PATH,
            manifestOf([
              record("SYM-alpha-one", "alpha", unstagedPath),
              record("SYM-alpha-two", "alpha", unstagedPath),
            ]),
          ),
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-alpha-one",
                title: "alpha",
                sourceFile: unstagedPath,
                sourceText: ALPHA_SOURCE,
              },
              {
                id: "SYM-alpha-two",
                title: "alpha",
                sourceFile: unstagedPath,
                sourceText: ALPHA_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: [unstagedPath],
      path: COORDINATES_PATH,
    });
  });

  it("skips source files with nothing to extract", () => {
    const source = staged("docs/notes.md", "# Notes\n");

    expect(assess({ sourceFiles: [source], stagedFiles: [source] })).toEqual({
      state: "not_required",
      sourcePaths: [],
      path: COORDINATES_PATH,
    });
  });

  it("filters fresh paths out of a stale verdict and sorts per-file details", () => {
    const freshSource = staged("src/fresh-file.ts", FRESH_SOURCE);
    const staleASource = staged("src/stale-a.ts", STALE_A_SOURCE);
    const staleBSource = staged("src/stale-b.ts", STALE_B_SOURCE);

    expect(
      assess({
        sourceFiles: [staleASource, freshSource, staleBSource],
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
          staged(
            COORDINATES_PATH,
            coordinateArtifact([
              {
                id: "SYM-keep-fn",
                title: "keepFn",
                sourceFile: "src/stale-a.ts",
                sourceText: STALE_A_SOURCE,
              },
              {
                id: "SYM-fresh-fn",
                title: "freshFn",
                sourceFile: "src/fresh-file.ts",
                sourceText: FRESH_SOURCE,
              },
              {
                id: "SYM-b-fn",
                title: "bFn",
                sourceFile: "src/stale-b.ts",
                sourceText: STALE_B_SOURCE,
              },
              {
                id: "SYM-gone-fn",
                title: "goneFn",
                sourceFile: "src/stale-b.ts",
                sourceText: STALE_B_SOURCE,
              },
            ]),
          ),
        ],
      }),
    ).toEqual({
      state: "stale",
      sourcePaths: ["src/stale-a.ts", "src/stale-b.ts"],
      path: COORDINATES_PATH,
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
          coveredCount: 2,
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
