import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SourceAnalysisResult } from "kibi-plugin-sdk";
import type { StagedFile } from "../../src/traceability/git-staged.js";
import {
  assessStagedSymbolsManifest,
  collectStagedAuthoredSymbolsManifestEvidence,
  manifestRecordSourcePath,
} from "../../src/traceability/staged-symbols-manifest.js";

const SYMBOLS = "kb/symbols.yaml";
const DEFAULT_SYMBOLS = ".kb/symbols.yaml";
const initialCwd = process.cwd();
const workspaces: string[] = [];

afterEach(() => {
  process.chdir(initialCwd);
  for (const dir of workspaces.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function staged(filePath: string, content?: string): StagedFile {
  return { path: filePath, status: "M", hunkRanges: [], content };
}

function manifest(...records: unknown[]): string {
  return JSON.stringify({ symbols: records });
}

function rec(title: unknown, sourceFile: string, extra: object = {}) {
  return { title, sourceFile, ...extra };
}

function sym(name: string, startLine: number, extra: object = {}) {
  return {
    name,
    kind: "function",
    startLine,
    startColumn: 0,
    endLine: startLine + 1,
    endColumn: 1,
    ...extra,
  };
}

function analyzer(symbolsByPath: Record<string, object[]>) {
  const calls: string[][] = [];
  const analyze = (filePath: string, content: string) => {
    calls.push([filePath, content]);
    return {
      symbols: symbolsByPath[filePath] ?? [],
    } as unknown as SourceAnalysisResult;
  };
  return { analyze, calls };
}

function assess(
  sources: StagedFile[],
  symbolsByPath: Record<string, object[]>,
  manifestText: string | undefined,
) {
  return assessStagedSymbolsManifest({
    symbolsManifestPath: SYMBOLS,
    sourceFiles: sources,
    stagedFiles: [...sources, staged(SYMBOLS, manifestText)],
    analyzeSource: analyzer(symbolsByPath).analyze,
  });
}

function workspace(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-ssm-"));
  workspaces.push(dir);
  return dir;
}

function git(cwd: string, ...args: string[]): void {
  execFileSync(
    "git",
    [
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd, stdio: "ignore" },
  );
}

function repoWith(files: Record<string, string>): string {
  const dir = workspace();
  git(dir, "init", "-q");
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), content);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  return dir;
}

describe("manifestRecordSourcePath", () => {
  test("prefers sourceFile, then source", () => {
    expect(manifestRecordSourcePath({ sourceFile: "a", source: "b" })).toBe(
      "a",
    );
    expect(manifestRecordSourcePath({ sourceFile: 1, source: "b" })).toBe("b");
    expect(manifestRecordSourcePath({ source: 1 })).toBeNull();
  });
});

describe("assessStagedSymbolsManifest", () => {
  test("is fresh when every extracted title has a granular record", () => {
    const source = staged("src/a.ts", "code");
    const { analyze, calls } = analyzer({
      "src/a.ts": [sym("beta", 5), sym("alpha", 1)],
    });
    expect(
      assessStagedSymbolsManifest({
        symbolsManifestPath: SYMBOLS,
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(
            SYMBOLS,
            manifest(
              rec("alpha", "src/a.ts"),
              { title: "beta", source: "src/a.ts" },
              { title: "beta", sourceFile: 1, source: "src/a.ts" },
            ),
          ),
        ],
        analyzeSource: analyze,
      }),
    ).toStrictEqual({
      state: "fresh",
      sourcePaths: ["src/a.ts"],
      path: SYMBOLS,
    });
    expect(calls).toStrictEqual([["src/a.ts", "code"]]);
  });

  test("passes empty text for a source without staged content", () => {
    const { analyze, calls } = analyzer({});
    assessStagedSymbolsManifest({
      symbolsManifestPath: SYMBOLS,
      sourceFiles: [staged("src/a.ts")],
      stagedFiles: [],
      readBaseFile: () => null,
      analyzeSource: analyze,
    });
    expect(calls).toStrictEqual([["src/a.ts", ""]]);
  });

  test("names missing and orphaned titles in sorted order", () => {
    const sources = [staged("src/z.ts", "z"), staged("src/b.ts", "b")];
    expect(
      assess(
        [...sources, staged("src/fresh.ts", "f")],
        {
          "src/z.ts": [
            sym("a_b", 9),
            sym("a", 3),
            sym("kept", 1),
            sym("other", 4),
          ],
          "src/b.ts": [sym("gone", 2)],
          "src/fresh.ts": [sym("f", 1)],
        },
        manifest(
          rec("kept", "src/z.ts"),
          rec("other", "src/z.ts"),
          rec("B", "src/z.ts"),
          rec("a", "src/elsewhere.ts"),
          rec("c", "src/z.ts"),
          rec("c", "src/z.ts", { id: "SYM-c2" }),
          rec("d", "src/z.ts", { sourceLine: 4 }),
          rec("d", "src/z.ts", { sourceLine: 5 }),
          rec("e", "src/z.ts", { sourceLine: "4" }),
          rec("e", "src/z.ts"),
          rec(7, "src/z.ts"),
          rec("f", "src/fresh.ts"),
        ),
      ),
    ).toStrictEqual({
      state: "stale",
      sourcePaths: ["src/b.ts", "src/z.ts"],
      path: SYMBOLS,
      fileDetails: [
        {
          path: "src/b.ts",
          expectedCount: 1,
          coveredCount: 0,
          missing: [{ title: "gone", line: 2 }],
          extra: [],
        },
        {
          path: "src/z.ts",
          expectedCount: 4,
          coveredCount: 2,
          missing: [
            { title: "a", line: 3 },
            { title: "a_b", line: 9 },
          ],
          extra: ["B", "c", "d", "d", "e"],
        },
      ],
    });
  });

  test("compares every coordinate when collapsing records", () => {
    for (const field of ["sourceColumn", "sourceEndLine", "sourceEndColumn"])
      expect(
        assess(
          [staged("src/a.ts", "a")],
          {},
          manifest(
            rec("x", "src/a.ts", { [field]: 1 }),
            rec("x", "src/a.ts", { [field]: 2 }),
          ),
        ).fileDetails?.[0]?.extra,
      ).toStrictEqual(["x", "x"]);
  });

  test("lets coarse records stand in for their declarations", () => {
    const coarse = { granularity_reason: "module-level-behavior" };
    expect(
      assess(
        [staged("src/a.ts", "a"), staged("src/empty.ts", "")],
        { "src/a.ts": [sym("whole", 1)] },
        manifest(
          rec("whole", "src/a.ts", coarse),
          rec("x", "src/a.ts", coarse),
        ),
      ),
    ).toStrictEqual({ state: "not_required", sourcePaths: [], path: SYMBOLS });
    expect(
      assess(
        [staged("src/a.ts", "a")],
        {
          "src/a.ts": [
            sym("whole", 1),
            sym("mixed", 2),
            sym("legacy", 3),
            sym("plain", 4),
          ],
        },
        manifest(
          rec("whole", "src/a.ts", coarse),
          rec("mixed", "src/a.ts", coarse),
          rec("mixed", "src/a.ts", { id: "SYM-mixed" }),
          rec("legacy", "src/a.ts", { granularity_reason: "legacy-link" }),
          rec(3, "src/a.ts", coarse),
        ),
      ),
    ).toStrictEqual({
      state: "stale",
      sourcePaths: ["src/a.ts"],
      path: SYMBOLS,
      fileDetails: [
        {
          path: "src/a.ts",
          expectedCount: 3,
          coveredCount: 2,
          missing: [{ title: "plain", line: 4 }],
          extra: [],
        },
      ],
    });
  });

  test("qualifies titles unless one authored record names a unique symbol", () => {
    const result = assess(
      [staged("src/a.ts", "a")],
      {
        "src/a.ts": [
          sym("run", 1, { qualifiedName: "A.run" }),
          sym("run", 2, { qualifiedName: "B.run" }),
          sym("solo", 3, { qualifiedName: "C.solo" }),
          sym("free", 4, { qualifiedName: "D.free" }),
          sym("plain", 5),
          sym("blank", 6, { qualifiedName: "" }),
        ],
      },
      manifest(rec("run", "src/a.ts"), rec("solo", "src/a.ts")),
    );
    expect(result.fileDetails).toStrictEqual([
      {
        path: "src/a.ts",
        expectedCount: 6,
        coveredCount: 1,
        missing: [
          { title: "A.run", line: 1 },
          { title: "B.run", line: 2 },
          { title: "blank", line: 6 },
          { title: "D.free", line: 4 },
          { title: "plain", line: 5 },
        ],
        extra: ["run"],
      },
    ]);
  });

  test("looks only at the records of each source file", () => {
    const coarse = { granularity_reason: "module-level-behavior" };
    expect(
      assess(
        [staged("src/a.ts", "a")],
        { "src/a.ts": [sym("alpha", 1)] },
        manifest(rec("alpha", "src/b.ts", coarse)),
      ).state,
    ).toBe("stale");
    expect(
      assess(
        [staged("src/a.ts", "a")],
        { "src/a.ts": [sym("other", 1)] },
        manifest(rec("whole", "src/a.ts", coarse)),
      ).state,
    ).toBe("not_required");
  });

  test("lists orphaned titles once each in code point order", () => {
    expect(
      assess(
        [staged("src/a.ts", "a")],
        {},
        manifest(
          rec("z", "src/a.ts"),
          rec("x", "src/a.ts"),
          rec("B", "src/a.ts"),
          rec("x", "src/a.ts"),
          rec("a", "src/a.ts"),
        ),
      ).fileDetails?.[0]?.extra,
    ).toStrictEqual(["B", "a", "x", "z"]);
  });

  test("is not required without source files or declarations", () => {
    expect(assess([], {}, manifest())).toStrictEqual({
      state: "not_required",
      sourcePaths: [],
      path: SYMBOLS,
    });
    expect(assess([staged("src/a.ts", "a")], {}, undefined)).toStrictEqual({
      state: "not_required",
      sourcePaths: [],
      path: SYMBOLS,
    });
  });

  test("treats an unreadable staged manifest as empty", () => {
    expect(
      assess([staged("src/a.ts", "a")], { "src/a.ts": [sym("x", 1)] }, "[1"),
    ).toStrictEqual({
      state: "stale",
      sourcePaths: ["src/a.ts"],
      path: SYMBOLS,
      fileDetails: [
        {
          path: "src/a.ts",
          expectedCount: 1,
          coveredCount: 0,
          missing: [{ title: "x", line: 1 }],
          extra: [],
        },
      ],
    });
  });

  test("normalizes the manifest path to the repository root", () => {
    const run = (symbolsManifestPath: string) => {
      const reads: string[] = [];
      const result = assessStagedSymbolsManifest({
        symbolsManifestPath,
        sourceFiles: [],
        stagedFiles: [],
        readBaseFile: (filePath) => {
          reads.push(filePath);
          return null;
        },
      });
      return [result.path, reads];
    };
    expect(run("kb\\symbols.yaml")).toStrictEqual([
      SYMBOLS,
      ["kb/symbols.yaml"],
    ]);
    expect(run(path.join(process.cwd(), "kb", "symbols.yaml"))).toStrictEqual([
      SYMBOLS,
      [SYMBOLS],
    ]);
    expect(run("")).toStrictEqual([DEFAULT_SYMBOLS, [DEFAULT_SYMBOLS]]);
  });

  test("reads the base manifest only when the change does not stage it", () => {
    const reads: string[] = [];
    const readBaseFile = (filePath: string) => {
      reads.push(filePath);
      return manifest(rec("x", "src/a.ts"));
    };
    const { analyze } = analyzer({ "src/a.ts": [sym("x", 1)] });
    const source = staged("src/a.ts", "a");
    expect(
      assessStagedSymbolsManifest({
        symbolsManifestPath: SYMBOLS,
        sourceFiles: [source],
        stagedFiles: [source],
        readBaseFile,
        analyzeSource: analyze,
      }).state,
    ).toBe("fresh");
    expect(reads).toStrictEqual([SYMBOLS]);
    expect(
      assessStagedSymbolsManifest({
        symbolsManifestPath: SYMBOLS,
        sourceFiles: [source],
        stagedFiles: [source, staged(SYMBOLS, manifest())],
        readBaseFile,
        analyzeSource: analyze,
      }).state,
    ).toBe("stale");
    expect(reads).toStrictEqual([SYMBOLS]);
  });

  test("reads the committed manifest from Git HEAD", () => {
    // Larger than the default exec buffer.
    const padding = Array.from({ length: 12000 }, (_, i) =>
      rec(`pad${i}`.padEnd(100, "x"), "src/other.ts"),
    );
    const dir = repoWith({
      [SYMBOLS]: manifest(rec("x", "src/a.ts"), ...padding),
    });
    process.chdir(dir);
    const { analyze } = analyzer({ "src/a.ts": [sym("x", 1)] });
    const source = staged("src/a.ts", "a");
    const run = () =>
      assessStagedSymbolsManifest({
        symbolsManifestPath: SYMBOLS,
        sourceFiles: [source],
        stagedFiles: [source],
        analyzeSource: analyze,
      }).state;
    expect(run()).toBe("fresh");
    process.chdir(workspace());
    expect(run()).toBe("stale");
  });

  test("extracts declarations with the built-in analyzer by default", () => {
    const source = staged("src/a.ts", "export function alpha() {}\n");
    expect(
      assessStagedSymbolsManifest({
        symbolsManifestPath: SYMBOLS,
        sourceFiles: [source],
        stagedFiles: [
          source,
          staged(SYMBOLS, manifest(rec("alpha", "src/a.ts"))),
        ],
      }),
    ).toStrictEqual({
      state: "fresh",
      sourcePaths: ["src/a.ts"],
      path: SYMBOLS,
    });
  });
});

describe("collectStagedAuthoredSymbolsManifestEvidence", () => {
  const base = {
    id: "SYM-a",
    title: "a",
    sourceFile: "src/a.ts",
    status: "active",
    links: ["REQ-1", { type: "covered_by", target: "TEST-1" }],
    relationships: [{ type: "implements", target: "REQ-2" }],
    tags: ["t1", "t2"],
    owner: "o",
    priority: "p",
    severity: "s",
    text_ref: "r",
    granularity_reason: null,
  };

  function collect(
    head: string | null,
    stagedManifest: string | undefined,
    options: { sources?: string[]; ignoreMigrationOwnedEdits?: boolean } = {},
  ) {
    const sourceFiles = (options.sources ?? ["src/a.ts"]).map((file) =>
      staged(file, ""),
    );
    return collectStagedAuthoredSymbolsManifestEvidence({
      sourceFiles,
      stagedFiles:
        stagedManifest === undefined
          ? sourceFiles
          : [...sourceFiles, staged(DEFAULT_SYMBOLS, stagedManifest)],
      readBaseFile: (filePath) => (filePath === DEFAULT_SYMBOLS ? head : "x"),
      ...(options.ignoreMigrationOwnedEdits === undefined
        ? {}
        : { ignoreMigrationOwnedEdits: options.ignoreMigrationOwnedEdits }),
    });
  }

  const changed = (edit: object, headEdit: object = {}) =>
    collect(
      manifest({ ...base, ...headEdit }),
      manifest({ ...base, ...headEdit, ...edit }),
    ).changedEntityIds;

  test("reports nothing without a readable staged manifest", () => {
    const empty = { path: DEFAULT_SYMBOLS, entries: [], changedEntityIds: [] };
    expect(collect(manifest(base), undefined)).toStrictEqual(empty);
    expect(collect(manifest(base), "[1")).toStrictEqual(empty);
    let reads = 0;
    const source = staged("src/a.ts", "");
    collectStagedAuthoredSymbolsManifestEvidence({
      sourceFiles: [source],
      stagedFiles: [source],
      readBaseFile: () => {
        reads += 1;
        return null;
      },
    });
    expect(reads).toBe(0);
  });

  test("lists changed records under each staged source path", () => {
    expect(
      collect(
        manifest(
          base,
          { ...base, id: "SYM-b", title: "b", sourceFile: "src/b.ts" },
          { ...base, id: "SYM-c", title: "c", sourceFile: "src/c.ts" },
        ),
        manifest(
          { ...base, id: "SYM-z", title: "z", source: "src/a.ts" },
          { ...base, status: "deprecated" },
          { ...base, id: "SYM-b", title: "b", sourceFile: "src/b.ts" },
          { ...base, id: "SYM-c", title: "c2", sourceFile: "src/c.ts" },
          { ...base, id: undefined, title: "anon" },
          { ...base, id: "SYM-a", title: "a", sourceFile: "src/a.ts" },
          { title: "untitled-source" },
        ),
        { sources: ["src/b.ts", "src/a.ts", "src/d.ts"] },
      ),
    ).toStrictEqual({
      path: DEFAULT_SYMBOLS,
      entries: [{ sourcePath: "src/a.ts", entityIds: ["SYM-a", "SYM-z"] }],
      changedEntityIds: ["SYM-a", "SYM-c", "SYM-z"],
    });
  });

  test("treats a missing or unreadable base as empty", () => {
    for (const head of [null, "[1"])
      expect(collect(head, manifest(base)).changedEntityIds).toStrictEqual([
        "SYM-a",
      ]);
  });

  test("reads the base manifest from Git HEAD by default", () => {
    const dir = repoWith({ [DEFAULT_SYMBOLS]: manifest(base) });
    process.chdir(dir);
    const source = staged("src/a.ts", "");
    const run = () =>
      collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [source],
        stagedFiles: [source, staged(DEFAULT_SYMBOLS, manifest(base))],
      }).changedEntityIds;
    expect(run()).toStrictEqual([]);
    process.chdir(workspace());
    expect(run()).toStrictEqual(["SYM-a"]);
  });

  test("ignores what only a malformed value changes", () => {
    for (const field of [
      "status",
      "owner",
      "priority",
      "severity",
      "text_ref",
      "granularity_reason",
    ])
      expect([field, changed({ [field]: 2 }, { [field]: 1 })]).toStrictEqual([
        field,
        [],
      ]);
    expect(changed({ title: 6 }, { title: 5 })).toStrictEqual([]);
    expect(
      collect(
        manifest({ id: "SYM-x", title: "x", status: "a" }),
        manifest({ id: "SYM-x", title: "x", status: "b" }),
      ).changedEntityIds,
    ).toStrictEqual([]);
  });

  test("compares string links, typed link targets and relationship targets", () => {
    expect(changed({ links: ["REQ-2"] }, { links: ["REQ-1"] })).toStrictEqual([
      "SYM-a",
    ]);
    expect(
      changed(
        { links: [{ type: "a", target: "y" }] },
        { links: [{ type: "a", target: "x" }] },
      ),
    ).toStrictEqual(["SYM-a"]);
    expect(
      changed(
        { relationships: [{ type: "a", target: "y" }] },
        { relationships: [{ type: "a", target: "x" }] },
      ),
    ).toStrictEqual(["SYM-a"]);
  });

  test("compares every authored field", () => {
    for (const edit of [
      { title: "b" },
      { status: "x" },
      { status: 1 },
      { links: ["REQ-9"] },
      { relationships: [] },
      { tags: ["t1"] },
      { owner: "x" },
      { owner: 1 },
      { priority: "x" },
      { priority: 1 },
      { severity: "x" },
      { severity: 1 },
      { text_ref: "x" },
      { text_ref: 1 },
      { granularity_reason: "legacy-link" },
    ])
      expect([edit, changed(edit)]).toStrictEqual([edit, ["SYM-a"]]);
  });

  test("ignores order and malformed entries in lists", () => {
    for (const edit of [
      { links: [{ target: "TEST-1", type: "covered_by" }, 3, "REQ-1"] },
      {
        links: [
          null,
          "REQ-1",
          { type: 1, target: "x" },
          { type: "x", target: 1 },
          { type: "covered_by", target: "TEST-1", note: "n" },
        ],
      },
      {
        relationships: [
          null,
          { type: 1, target: "x" },
          { type: "x", target: 1 },
          { type: "implements", target: "REQ-2", note: "n" },
        ],
      },
      { tags: ["t2", 4, "t1"] },
      { sourceLine: 9 },
    ])
      expect([edit, changed(edit)]).toStrictEqual([edit, []]);
    for (const [edit, headEdit] of [
      [{ links: "x" }, { links: [] }],
      [{ relationships: "x" }, { relationships: [] }],
      [{ tags: "x" }, { tags: [] }],
    ])
      expect([edit, changed(edit as object, headEdit)]).toStrictEqual([
        edit,
        [],
      ]);
  });

  test("sorts links and relationships by their JSON text", () => {
    const links = ["b", { type: "a", target: "z" }, "a"];
    const relationships = [
      { type: "b", target: "a" },
      { type: "a", target: "b" },
    ];
    expect(
      changed(
        {
          links: [...links].reverse(),
          relationships: [...relationships].reverse(),
        },
        { links, relationships },
      ),
    ).toStrictEqual([]);
  });

  test("treats a new record with migration edits as changed", () => {
    expect(
      collect(
        manifest(),
        manifest({
          ...base,
          tags: ["review:context-missing"],
          granularity_reason: "legacy-link",
        }),
        { ignoreMigrationOwnedEdits: true },
      ).changedEntityIds,
    ).toStrictEqual(["SYM-a"]);
  });

  test("separates migration-only edits when asked", () => {
    const run = (
      edit: object,
      headEdit: object = {},
      ignoreMigrationOwnedEdits?: boolean,
    ) =>
      collect(
        manifest({ ...base, ...headEdit }),
        manifest({ ...base, ...headEdit, ...edit }),
        { ignoreMigrationOwnedEdits },
      );
    const legacy = { granularity_reason: "legacy-link" };
    const context = { tags: ["review:context-missing", "t1", "t2"] };
    const migration = {
      path: DEFAULT_SYMBOLS,
      entries: [],
      changedEntityIds: [],
      migrationOnlyEntityIds: ["SYM-a"],
    };
    expect(run(legacy, {}, true)).toStrictEqual(migration);
    expect(run(context, {}, true)).toStrictEqual(migration);
    expect(run({ ...legacy, ...context }, {}, true)).toStrictEqual(migration);
    const changedA = {
      path: DEFAULT_SYMBOLS,
      entries: [{ sourcePath: "src/a.ts", entityIds: ["SYM-a"] }],
      changedEntityIds: ["SYM-a"],
    };
    expect(run(legacy, {}, false)).toStrictEqual(changedA);
    expect(run(legacy)).toStrictEqual(changedA);
    expect(
      run(legacy, { granularity_reason: "module-level-behavior" }, true),
    ).toStrictEqual(changedA);
    expect(
      run({ granularity_reason: "module-level-behavior" }, {}, true),
    ).toStrictEqual(changedA);
    expect(run({ tags: ["t1", "t2", "x"] }, {}, true)).toStrictEqual(changedA);
    expect(
      run({ ...context, owner: "x" }, { tags: ["t1", "t2"] }, true),
    ).toStrictEqual(changedA);
    expect(
      run(
        { tags: ["review:context-missing", "t1"] },
        { tags: ["review:context-missing", "t1", "t2"] },
        true,
      ),
    ).toStrictEqual(changedA);
    expect(
      collect(
        manifest(base),
        manifest({ ...base, ...legacy }, { ...base, id: "SYM-n", title: "n" }),
        { ignoreMigrationOwnedEdits: true },
      ),
    ).toStrictEqual({
      path: DEFAULT_SYMBOLS,
      entries: [{ sourcePath: "src/a.ts", entityIds: ["SYM-n"] }],
      changedEntityIds: ["SYM-n"],
      migrationOnlyEntityIds: ["SYM-a"],
    });
  });
});
