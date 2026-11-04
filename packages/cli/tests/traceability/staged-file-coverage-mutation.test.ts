import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StagedPath } from "../../src/traceability/git-staged.js";
import {
  STAGED_FILE_COVERAGE_RESULT_VERSION,
  type StagedFileCoverageDiagnostic,
  type StagedFileCoverageRecord,
  analyzeStagedFileCoverage,
} from "../../src/traceability/staged-file-coverage.js";

const SYMBOLS = ".kb/symbols.yaml";
const LS_TREE = ["ls-tree", "-r", "--name-only", "-z", "HEAD", "--", ".kb"];

function req(id: string, body = "Behavior.", type = "req"): string {
  return `---\nid: ${id}\ntype: ${type}\ntitle: ${id}\nstatus: open\ncreated_at: 2026-09-14T00:00:00Z\nupdated_at: 2026-09-14T00:00:00Z\n---\n${body}\n`;
}

function manifest(
  ...symbols: Array<{ id: string; source?: string; links?: string[] }>
): string {
  return `symbols:\n${symbols
    .map(
      ({ id, source, links }) =>
        `  - id: ${id}\n    title: ${id}\n${source ? `    sourceFile: ${JSON.stringify(source)}\n` : ""}${links ? `    links: [${links.join(", ")}]\n` : ""}`,
    )
    .join("")}`;
}

function relationships(...rows: Array<[string, string, string]>): string {
  return `relationships:\n${rows
    .map(
      ([type, from, to]) =>
        `  - type: ${type}\n    from: ${from}\n    to: ${to}\n`,
    )
    .join("")}`;
}

/** A git reader over a committed HEAD tree (null: unborn branch). */
function reader(head: Record<string, string> | null, calls: string[][] = []) {
  return (args: readonly string[]): Buffer => {
    calls.push([...args]);
    if (head === null) throw new Error("unborn");
    if (args[0] === "rev-parse") return Buffer.from("abc123\n");
    if (JSON.stringify(args) === JSON.stringify(LS_TREE))
      return Buffer.from(
        Object.keys(head)
          .map((path) => `${path}\0`)
          .join(""),
      );
    if (args[0] === "show" && args.length === 2) {
      const content = head[(args[1] as string).replace(/^HEAD:/, "")];
      if (content !== undefined) return Buffer.from(content);
    }
    throw new Error(`unexpected git ${args.join(" ")}`);
  };
}

function staged(path: string, options: Partial<StagedPath> = {}): StagedPath {
  return {
    path,
    status: "M",
    hunkRanges: [],
    analysisDepth: "file",
    disposition: "advisory",
    ...options,
  };
}

const MISSING = (path: string): StagedFileCoverageDiagnostic => ({
  id: "staged_file_ownership_missing",
  severity: "warning",
  blocking: false,
  path,
  message: `Staged text file has no source-linked requirement ownership: ${path}`,
  suggestion:
    "Review the change and add an authored file/module symbol with an implements relationship when it affects product behavior.",
  requirementIds: [],
  evidencePaths: [],
});

const REVIEW = (
  path: string,
  requirementIds: string[],
): StagedFileCoverageDiagnostic => ({
  id: "staged_file_impact_review_needed",
  severity: "warning",
  blocking: false,
  path,
  message: `Review staged impact for ${path}; existing ownership links to ${requirementIds.join(", ")} but no matching KB evidence changed.`,
  suggestion:
    "Confirm the linked requirements still describe the behavior, then stage the relevant requirement or ownership evidence when semantics changed.",
  requirementIds,
  evidencePaths: [],
});

function record(
  path: string,
  extra: Partial<StagedFileCoverageRecord> = {},
): StagedFileCoverageRecord {
  return {
    path,
    status: "M",
    analysisDepth: "file",
    disposition: "advisory",
    requirementIds: [],
    evidencePaths: [],
    providerId: null,
    ...extra,
  };
}

describe("analyzeStagedFileCoverage", () => {
  test("reads committed knowledge with exact git commands", () => {
    const calls: string[][] = [];
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/relationships/r.yaml": relationships(),
      ".kb/tests/T.md": req("TEST-a", "x", "test"),
    };
    const result = analyzeStagedFileCoverage(
      [staged("src/a.py")],
      reader(head, calls),
    );
    expect(calls).toStrictEqual([
      ["rev-parse", "--verify", "HEAD"],
      LS_TREE,
      ["show", `HEAD:${SYMBOLS}`],
      ["show", "HEAD:.kb/relationships/r.yaml"],
      ["show", "HEAD:.kb/requirements/REQ-a.md"],
    ]);
    expect(result).toStrictEqual({
      version: STAGED_FILE_COVERAGE_RESULT_VERSION,
      files: [record("src/a.py", { requirementIds: ["REQ-a"] })],
      diagnostics: [REVIEW("src/a.py", ["REQ-a"])],
    });
    expect(STAGED_FILE_COVERAGE_RESULT_VERSION).toBe(
      "kibi.staged-file-coverage.v1",
    );
  });

  test("treats an unborn branch as having no committed knowledge", () => {
    const calls: string[][] = [];
    const result = analyzeStagedFileCoverage(
      [
        staged("first.py", {
          status: "A",
          oldPath: "old.py",
          skipReason: "binary",
        }),
      ],
      reader(null, calls),
    );
    expect(calls).toStrictEqual([["rev-parse", "--verify", "HEAD"]]);
    expect(result.files).toStrictEqual([
      record("first.py", { status: "A", oldPath: "old.py", reason: "binary" }),
    ]);
    expect(result.diagnostics).toStrictEqual([MISSING("first.py")]);
  });

  test("reports a failing committed read with its command", () => {
    const failing = (args: readonly string[]): Buffer => {
      if (args[0] === "rev-parse") return Buffer.from("abc\n");
      throw new Error("tree gone");
    };
    expect(() => analyzeStagedFileCoverage([], failing)).toThrow(
      "git command failed: git ls-tree -r --name-only -z HEAD -- .kb -> tree gone",
    );
    const raw = (args: readonly string[]): Buffer => {
      if (args[0] === "rev-parse") return Buffer.from("abc\n");
      throw "raw";
    };
    expect(() => analyzeStagedFileCoverage([], raw)).toThrow(
      "git command failed: git ls-tree -r --name-only -z HEAD -- .kb -> raw",
    );
  });

  test("skips Kibi-managed, non-file and generated unowned paths", () => {
    const result = analyzeStagedFileCoverage(
      [
        staged(".kb/schema/entities.pl"),
        staged(".kb\\manifest.json"),
        staged("src/a.ts", { analysisDepth: "symbol", disposition: "checked" }),
        staged("src/meta.json", { analysisDepth: "metadata" }),
        staged("gen/out.py"),
        staged("docs.kb/a.md"),
      ],
      reader({}),
      (path) => path.startsWith("gen/"),
    );
    expect(result.files.map((file) => file.providerId)).toStrictEqual([
      null,
      null,
      "ts-morph",
      null,
      null,
      null,
    ]);
    expect(result.diagnostics).toStrictEqual([MISSING("docs.kb/a.md")]);
  });

  test("still reviews an owned generated file", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-g",
        source: "gen/out.py",
        links: ["REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
    };
    const result = analyzeStagedFileCoverage(
      [staged("gen/out.py")],
      reader(head),
      () => true,
    );
    expect(result.diagnostics).toStrictEqual([REVIEW("gen/out.py", ["REQ-a"])]);
  });

  test("links only implements edges from owning symbols to real requirements", () => {
    const head = {
      [SYMBOLS]: manifest(
        { id: "SYM-a", source: "src\\a.py", links: ["REQ-b", "REQ-a"] },
        { id: "SYM-x", source: "src/x.py", links: ["REQ-c", "REQ-d"] },
        { id: "SYM-none", links: ["REQ-c"] },
      ),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/requirements/REQ-b.md": req("REQ-b"),
      ".kb/requirements/REQ-c.md": req("REQ-c"),
      ".kb/requirements/notes.txt": req("REQ-d"),
      ".kb/requirements/TEST-t.md": req("TEST-t", "x", "test"),
      ".kb/requirements/broken.md": "---\nnot: [valid\n",
      ".kb/relationships/r.yaml": relationships(
        ["implements", "SYM-a", "REQ-c"],
        ["implements", "SYM-a", "REQ-missing"],
        ["implements", "SYM-a", "TEST-t"],
        ["covered_by", "SYM-a", "REQ-b"],
        ["implements", "SYM-x", "REQ-a"],
        ["implements", "SYM-a", "REQ-d"],
      ),
    };
    const result = analyzeStagedFileCoverage(
      [staged("src/a.py")],
      reader(head),
    );
    expect(result.files[0]?.requirementIds).toStrictEqual([
      "REQ-a",
      "REQ-b",
      "REQ-c",
    ]);
  });

  test("owns a renamed file through its old path", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/old.py",
        links: ["REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
    };
    const result = analyzeStagedFileCoverage(
      [staged("src/new.py", { status: "R", oldPath: "src/old.py" })],
      reader(head),
    );
    expect(result.files[0]?.requirementIds).toStrictEqual(["REQ-a"]);
  });

  test("matches a manifest symbol without a source file by the manifest path", () => {
    const head = {
      [SYMBOLS]: manifest({ id: "SYM-m", links: ["REQ-a"] }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
    };
    const result = analyzeStagedFileCoverage(
      [staged(SYMBOLS, { analysisDepth: "metadata" })],
      reader(head),
    );
    expect(result.files[0]?.requirementIds).toStrictEqual(["REQ-a"]);
  });

  test("uses staged requirements and drops deleted or renamed ones", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-a", "REQ-b", "REQ-c", "REQ-new", "REQ-keep"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/requirements/REQ-b.md": req("REQ-b"),
      ".kb/requirements/REQ-keep.md": req("REQ-keep"),
    };
    const result = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(".kb/requirements/REQ-a.md", { status: "D" }),
        staged(".kb/archive/REQ-b.md", {
          status: "R",
          oldPath: ".kb/requirements/REQ-b.md",
          content: req("REQ-b"),
        }),
        staged(".kb/requirements/REQ-new.md", {
          status: "A",
          content: req("REQ-new"),
        }),
        staged(".kb/requirements/REQ-c.txt", { content: req("REQ-c") }),
        staged(".kb/requirements/REQ-keep.md", { status: "M" }),
      ],
      reader(head),
    );
    expect(result.files[0]).toStrictEqual(
      record("src/a.py", {
        requirementIds: ["REQ-keep", "REQ-new"],
        evidencePaths: [".kb/requirements/REQ-new.md"],
      }),
    );
  });

  test("uses staged relationship shards over committed ones", () => {
    const head = {
      [SYMBOLS]: manifest({ id: "SYM-a", source: "src/a.py" }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/requirements/REQ-b.md": req("REQ-b"),
      ".kb/requirements/REQ-c.md": req("REQ-c"),
      ".kb/requirements/REQ-d.md": req("REQ-d"),
      ".kb/relationships/gone.yaml": relationships([
        "implements",
        "SYM-a",
        "REQ-a",
      ]),
      ".kb/relationships/moved.yaml": relationships([
        "implements",
        "SYM-a",
        "REQ-b",
      ]),
      ".kb/relationships/kept.yaml": relationships([
        "implements",
        "SYM-a",
        "REQ-c",
      ]),
    };
    const result = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(".kb/relationships/gone.yaml", { status: "D" }),
        staged(".kb/relationships/new.yaml", {
          status: "R",
          oldPath: ".kb/relationships/moved.yaml",
          content: relationships(["implements", "SYM-a", "REQ-d"]),
        }),
        staged(".kb/relationships/kept.yaml", { status: "M" }),
        staged("docs/.kb/relationships/x.yaml", {
          content: relationships(["implements", "SYM-a", "REQ-a"]),
        }),
      ],
      reader(head),
    );
    expect(result.files[0]).toStrictEqual(
      record("src/a.py", {
        requirementIds: ["REQ-a", "REQ-b", "REQ-c", "REQ-d"],
        evidencePaths: [
          ".kb/relationships/gone.yaml",
          ".kb/relationships/moved.yaml",
          ".kb/relationships/new.yaml",
        ],
      }),
    );
  });

  test("tolerates malformed relationship shards and rows", () => {
    const head = {
      [SYMBOLS]: manifest({ id: "SYM-a", source: "src/a.py" }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/relationships/a.yaml":
        "relationships:\n  - null\n  - 7\n  - type: implements\n    from: SYM-a\n    to: REQ-a\n",
      ".kb/relationships/b.yaml": "relationships: [\n",
      ".kb/relationships/c.yaml": "~\n",
      ".kb/relationships/d.yaml": "relationships: none\n",
      ".kb/relationships/e.yaml":
        "relationships:\n  - type: implements\n    from: SYM-a\n  - type: implements\n    to: REQ-a\n  - from: SYM-a\n    to: REQ-a\n",
      ".kb/relationships/f.yaml": "",
    };
    const result = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(".kb/relationships/g.yaml", { status: "A", content: "  " }),
      ],
      reader(head),
    );
    expect(result.files[0]?.requirementIds).toStrictEqual(["REQ-a"]);
    expect(result.files[0]?.evidencePaths).toStrictEqual([]);
  });

  test("names the manifest as evidence only when this file's symbols changed", () => {
    const head = {
      [SYMBOLS]: manifest(
        { id: "SYM-a", source: "src/a.py", links: ["REQ-a"] },
        { id: "SYM-b", source: "src/b.py", links: ["REQ-a"] },
      ),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
    };
    const unrelated = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(SYMBOLS, {
          analysisDepth: "metadata",
          content: manifest(
            { id: "SYM-b", source: "src/b.py", links: ["REQ-a"] },
            { id: "SYM-a", source: "src/a.py", links: ["REQ-a"] },
            { id: "SYM-c", source: "src/c.py" },
          ),
        }),
      ],
      reader(head),
    );
    expect(unrelated.files[0]?.evidencePaths).toStrictEqual([]);
    const retitled = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(".kb/symbols.yml", {
          analysisDepth: "metadata",
          content: manifest(
            { id: "SYM-b", source: "src/b.py", links: ["REQ-a"] },
            { id: "SYM-a", source: "src/a.py", links: ["REQ-b"] },
          ),
        }),
      ],
      reader(head),
    );
    expect(retitled.files[0]?.evidencePaths).toStrictEqual([SYMBOLS]);
  });

  test("compares a file's symbols in any manifest order", () => {
    const two = (first: string, second: string) =>
      manifest(
        { id: first, source: "src/a.py", links: ["REQ-a"] },
        { id: second, source: "src/a.py", links: ["REQ-a"] },
      );
    const run = (headOrder: string, stagedOrder: string) =>
      analyzeStagedFileCoverage(
        [
          staged("src/a.py"),
          staged(SYMBOLS, { analysisDepth: "metadata", content: stagedOrder }),
        ],
        reader({
          [SYMBOLS]: headOrder,
          ".kb/requirements/REQ-a.md": req("REQ-a"),
        }),
      ).files[0]?.evidencePaths;
    expect(run(two("SYM-b", "SYM-a"), two("SYM-a", "SYM-b"))).toStrictEqual([]);
    expect(run(two("SYM-a", "SYM-b"), two("SYM-b", "SYM-a"))).toStrictEqual([]);
  });

  test("names staged shards whose owned implements edges changed", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/requirements/REQ-b.md": req("REQ-b"),
      ".kb/relationships/a.yaml": relationships([
        "implements",
        "SYM-a",
        "REQ-a",
      ]),
      ".kb/relationships/b.yaml": "relationships: [\n",
      ".kb/relationships/c.yaml": relationships([
        "implements",
        "SYM-a",
        "REQ-a",
      ]),
      ".kb/relationships/d.yaml": relationships([
        "implements",
        "SYM-a",
        "REQ-a",
      ]),
    };
    const result = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        // Only rows without a target or source are added: no owned change.
        staged(".kb/relationships/a.yaml", {
          content: `${relationships(["implements", "SYM-a", "REQ-a"])}  - type: implements\n    from: SYM-a\n  - type: implements\n    to: REQ-b\n`,
        }),
        // Malformed before, empty after: neither has edges.
        staged(".kb/relationships/b.yaml", { content: "relationships: []\n" }),
        // An edge of another symbol or type is not this file's evidence.
        staged(".kb/relationships/c.yaml", {
          content: relationships(
            ["implements", "SYM-a", "REQ-a"],
            ["implements", "SYM-z", "REQ-b"],
            ["covered_by", "SYM-a", "REQ-b"],
          ),
        }),
        staged(".kb/relationships/d.yaml", {
          content: relationships(["implements", "SYM-a", "REQ-b"]),
        }),
      ],
      reader(head),
    );
    expect(result.files[0]).toStrictEqual(
      record("src/a.py", {
        requirementIds: ["REQ-a", "REQ-b"],
        evidencePaths: [".kb/relationships/d.yaml"],
      }),
    );
  });

  test("counts only implements links inline in the manifest", () => {
    const head = {
      [SYMBOLS]:
        'symbols:\n  - id: SYM-a\n    title: SYM-a\n    sourceFile: "src/a.py"\n    links:\n      - REQ-a\n      - type: covered_by\n        target: TEST-x\n',
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      // A requirement whose id looks like a test's.
      ".kb/requirements/TEST-x.md": req("TEST-x"),
    };
    expect(
      analyzeStagedFileCoverage([staged("src/a.py")], reader(head)).files[0]
        ?.requirementIds,
    ).toStrictEqual(["REQ-a"]);
  });

  test("compares a shard's edges in any order and sorts all evidence", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/requirements/REQ-b.md": req("REQ-b"),
      ".kb/relationships/a.yaml": relationships(
        ["implements", "SYM-a", "REQ-a"],
        ["implements", "SYM-a", "REQ-b"],
      ),
      ".kb/relationships/b.yaml": relationships(),
    };
    const result = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(".kb/relationships/a.yaml", {
          content: relationships(
            ["implements", "SYM-a", "REQ-b"],
            ["implements", "SYM-a", "REQ-a"],
          ),
        }),
        staged(".kb/relationships/b.yaml", {
          content: relationships(["implements", "SYM-a", "REQ-b"]),
        }),
        staged(SYMBOLS, {
          analysisDepth: "metadata",
          content: manifest({ id: "SYM-a", source: "src/a.py" }),
        }),
        staged(".kb/requirements/REQ-b.md", { content: req("REQ-b", "New.") }),
      ],
      reader(head),
    );
    expect(result.files[0]?.evidencePaths).toStrictEqual([
      ".kb/relationships/b.yaml",
      ".kb/requirements/REQ-b.md",
      SYMBOLS,
    ]);
  });

  test("lists every linked requirement in a review diagnostic", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-b", "REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/requirements/REQ-b.md": req("REQ-b"),
    };
    expect(
      analyzeStagedFileCoverage([staged("src/a.py")], reader(head)).diagnostics,
    ).toStrictEqual([REVIEW("src/a.py", ["REQ-a", "REQ-b"])]);
  });

  test("compares a symbol's relationships in any order", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-a", "REQ-b"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
    };
    const reordered = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(SYMBOLS, {
          analysisDepth: "metadata",
          content: manifest({
            id: "SYM-a",
            source: "src/a.py",
            links: ["REQ-b", "REQ-a"],
          }),
        }),
      ],
      reader(head),
    );
    expect(reordered.files[0]?.evidencePaths).toStrictEqual([]);
  });

  test("treats a deleted or contentless staged manifest as empty", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
    };
    for (const change of [
      { status: "D" as const },
      // A deleted manifest counts as removed even if content is reported.
      { status: "D" as const, content: head[SYMBOLS] },
      { status: "M" as const },
    ]) {
      const result = analyzeStagedFileCoverage(
        [
          staged("src/a.py"),
          staged(SYMBOLS, { analysisDepth: "metadata", ...change }),
        ],
        reader(head),
      );
      // Head ownership still counts; the manifest change is the evidence.
      expect(result.files[0]).toStrictEqual(
        record("src/a.py", {
          requirementIds: ["REQ-a"],
          evidencePaths: [SYMBOLS],
        }),
      );
    }
  });

  test("owns a file through a symbol added by the staged manifest", () => {
    const head = { ".kb/requirements/REQ-a.md": req("REQ-a") };
    const result = analyzeStagedFileCoverage(
      [
        staged("src/a.py", { status: "A" }),
        staged(SYMBOLS, {
          status: "A",
          analysisDepth: "metadata",
          content: manifest({
            id: "SYM-a",
            source: "src/a.py",
            links: ["REQ-a"],
          }),
        }),
      ],
      reader(head),
    );
    expect(result.files[0]?.requirementIds).toStrictEqual(["REQ-a"]);
    expect(result.files[0]?.evidencePaths).toStrictEqual([SYMBOLS]);
    expect(result.diagnostics).toStrictEqual([]);
  });

  test("names staged requirement documents of linked requirements only", () => {
    const head = {
      [SYMBOLS]: manifest({
        id: "SYM-a",
        source: "src/a.py",
        links: ["REQ-a"],
      }),
      ".kb/requirements/REQ-a.md": req("REQ-a"),
      ".kb/requirements/REQ-b.md": req("REQ-b"),
    };
    const result = analyzeStagedFileCoverage(
      [
        staged("src/a.py"),
        staged(".kb/requirements/REQ-a.md", {
          content: req("REQ-a", "Changed."),
        }),
        staged(".kb/requirements/REQ-b.md", {
          content: req("REQ-b", "Changed."),
        }),
        staged(".kb/requirements/REQ-a.txt", { content: req("REQ-a") }),
        staged("docs/REQ-a.md", { content: req("REQ-a") }),
        staged(".kb/tests/TEST-a.md", { content: req("REQ-a") }),
        staged(".kb/scenarios/S.md", {
          content: req("SCEN-a", "x", "scenario"),
        }),
        staged(".kb/scenarios/REQ-a.md", {
          content: req("REQ-a", "x", "scenario"),
        }),
        staged(".kb/facts/bad.md", { content: "---\n[\n" }),
        staged(".kb/facts/none.md"),
        staged(".kb/facts/gone.md", { status: "D", content: req("REQ-a") }),
      ],
      reader(head),
    );
    expect(result.files[0]?.evidencePaths).toStrictEqual([
      ".kb/requirements/REQ-a.md",
      ".kb/tests/TEST-a.md",
    ]);
  });
});

describe("analyzeStagedFileCoverage default git reader", () => {
  const originalCwd = process.cwd();
  const roots: string[] = [];
  afterEach(() => {
    process.chdir(originalCwd);
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  test("reads the committed tree of the current repository", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-staged-file-cov-"));
    roots.push(root);
    const git = (...args: string[]) =>
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
        { cwd: root, stdio: "ignore" },
      );
    git("init", "-q", "-b", "main");
    mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
    // Over 1 MiB, so the committed manifest needs the raised output limit.
    writeFileSync(
      join(root, ".kb", "symbols.yaml"),
      manifest(
        { id: "SYM-a", source: "src/a.py", links: ["REQ-a"] },
        ...Array.from({ length: 12000 }, (_, index) => ({
          id: `SYM-padding-${index}`,
          source: `src/padding/module-${index}.py`,
        })),
      ),
    );
    writeFileSync(join(root, ".kb", "requirements", "REQ-a.md"), req("REQ-a"));
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    process.chdir(root);
    const result = analyzeStagedFileCoverage([staged("src/a.py")]);
    expect(result.files[0]?.requirementIds).toStrictEqual(["REQ-a"]);
    expect(result.diagnostics).toStrictEqual([REVIEW("src/a.py", ["REQ-a"])]);
  });
});
