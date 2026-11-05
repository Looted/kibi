import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HostSourceAnalysisResultV2 } from "../../src/plugins/source-analysis-service.js";
import type { SourceChangeAnalysis } from "../../src/plugins/source-change-analysis.js";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import type { StagedPath } from "../../src/traceability/git-staged.js";
import {
  fingerprint,
  fingerprintBytes,
} from "../../src/traceability/impact-review.js";
import {
  type ProjectedDiffExec,
  assertAnalysisInput,
  exactPathProjection,
  isKnowledgeMarkdown,
  isReceiptOnlyChange,
  projectedPathEvidence,
  sideEvidence,
} from "../../src/traceability/impact-side-evidence.js";

// implements REQ-impact-policy-stage-e-content-bound-review

const WITH_RECEIPT = (receipt: string, body = "Body\n") =>
  `---\nid: A\nproof_receipts:\n  - ${receipt}\n---\n${body}`;
const STRIPPED = (body = "Body\n") => `---\nid: A\n---\n${body}`;

function staged(path: string, extra: Partial<StagedPath> = {}): StagedPath {
  return {
    path,
    status: "M",
    hunkRanges: [],
    analysisDepth: "symbol",
    disposition: "checked",
    ...extra,
  } as StagedPath;
}

describe("isKnowledgeMarkdown", () => {
  test("is markdown under .kb only", () => {
    expect(
      [".kb/a.md", ".kb/a.mdx", "docs/.kb/a.md", "kb/a.md", ".kb/x/y.md"].map(
        isKnowledgeMarkdown,
      ),
    ).toStrictEqual([true, false, false, false, true]);
  });
});

describe("isReceiptOnlyChange", () => {
  const receiptOnly = staged(".kb/a.md", {
    previousContent: WITH_RECEIPT("r1"),
    content: WITH_RECEIPT("r2"),
    previousMode: "100644",
    gitMode: "100644",
  });

  test("is a modified knowledge file whose bytes differ only in receipts", () => {
    expect(isReceiptOnlyChange(receiptOnly)).toBe(true);
    expect(
      isReceiptOnlyChange({
        ...receiptOnly,
        previousMode: "100755",
        gitMode: "100755",
      }),
    ).toBe(true);
  });

  test("is not for any other change", () => {
    const variants: Partial<StagedPath>[] = [
      { path: "docs/a.md" },
      { status: "A" },
      { oldPath: ".kb/b.md" },
      { copyFromPath: ".kb/b.md" },
      { skipReason: "binary" },
      { previousContent: undefined },
      { content: undefined },
      { previousMode: "120000", gitMode: "120000" },
      { previousMode: undefined, gitMode: undefined },
      { gitMode: "100755" },
      { content: WITH_RECEIPT("r1") },
      { content: WITH_RECEIPT("r2", "Changed\n") },
    ];
    expect(
      variants.map((variant) =>
        isReceiptOnlyChange({ ...receiptOnly, ...variant }),
      ),
    ).toStrictEqual(variants.map(() => false));
  });
});

type ExecCall = {
  command: string;
  args: readonly string[];
  options: unknown;
  before: string;
  after: string;
};

function fakeDiff(result: string | { status: unknown; stdout?: string }) {
  const calls: ExecCall[] = [];
  const exec: ProjectedDiffExec = (command, args, options) => {
    calls.push({
      command,
      args,
      options,
      before: readFileSync(args.at(-2) as string, "utf8"),
      after: readFileSync(args.at(-1) as string, "utf8"),
    });
    if (typeof result === "string") return result;
    throw Object.assign(new Error("git diff failed"), result);
  };
  return { exec, calls };
}

describe("projectedPathEvidence", () => {
  test("leaves a change that touches no knowledge markdown alone", () => {
    const { exec, calls } = fakeDiff("");
    for (const file of [
      staged("src/a.ts", { content: "x" }),
      staged("docs/n.md", { oldPath: "docs/o.md", copyFromPath: ".kb/c.md" }),
    ])
      expect(projectedPathEvidence(file, exec)).toBe(file);
    expect(calls).toStrictEqual([]);
  });

  test("diffs the projected sides in a removed temporary directory", () => {
    const { exec, calls } = fakeDiff({
      status: 1,
      stdout: [
        "diff --git a/x b/x",
        "@@ -12,12 +12,11 @@ context",
        "+@@ -1 +1 @@ not a header",
        "@@ -30 +29 @@",
        "@@ -40,0 +40,2 @@",
        "@@ -50,3 +51,0 @@",
        "",
      ].join("\n"),
    });
    const file = staged(".kb/a.md", {
      previousContent: WITH_RECEIPT("r1"),
      content: WITH_RECEIPT("r2", "Other\n"),
      diffText: "raw diff",
      hunkRanges: [{ start: 1, end: 9 }],
      oldHunkRanges: [{ start: 1, end: 9 }],
      gitMode: "100644",
    });
    expect(projectedPathEvidence(file, exec)).toStrictEqual({
      path: ".kb/a.md",
      status: "M",
      analysisDepth: "symbol",
      disposition: "checked",
      gitMode: "100644",
      previousContent: STRIPPED(),
      content: STRIPPED("Other\n"),
      oldHunkRanges: [
        { start: 12, end: 23 },
        { start: 30, end: 30 },
        { start: 50, end: 52 },
      ],
      hunkRanges: [
        { start: 12, end: 22 },
        { start: 29, end: 29 },
        { start: 40, end: 41 },
      ],
    });
    const [call] = calls;
    expect(calls.length).toBe(1);
    const directory = (call?.args.at(-1) as string).slice(
      0,
      -"/after.md".length,
    );
    expect(
      directory.startsWith(join(tmpdir(), "kibi-impact-projected-diff-")),
    ).toBe(true);
    expect(call).toStrictEqual({
      command: "git",
      args: [
        "diff",
        "--no-index",
        "--no-ext-diff",
        "--no-textconv",
        "--no-color",
        "--unified=0",
        "--",
        join(directory, "before.md"),
        join(directory, "after.md"),
      ],
      options: {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      },
      before: STRIPPED(),
      after: STRIPPED("Other\n"),
    });
    expect(existsSync(directory)).toBe(false);
  });

  test("projects only the knowledge side of a rename or copy, and an absent side as empty", () => {
    const { exec, calls } = fakeDiff("");
    expect(
      projectedPathEvidence(
        staged(".kb/n.md", {
          status: "R",
          oldPath: "docs/o.md",
          previousContent: WITH_RECEIPT("r1"),
          content: WITH_RECEIPT("r2"),
        }),
        exec,
      ),
    ).toStrictEqual({
      ...staged(".kb/n.md", { status: "R", oldPath: "docs/o.md" }),
      previousContent: WITH_RECEIPT("r1"),
      content: STRIPPED(),
      oldHunkRanges: [],
      hunkRanges: [],
    });
    expect(
      projectedPathEvidence(
        staged("docs/out.md", {
          status: "C",
          copyFromPath: ".kb/src.md",
          previousContent: WITH_RECEIPT("r1"),
        }),
        exec,
      ),
    ).toStrictEqual({
      ...staged("docs/out.md", { status: "C", copyFromPath: ".kb/src.md" }),
      previousContent: STRIPPED(),
      oldHunkRanges: [],
      hunkRanges: [],
    });
    expect(
      projectedPathEvidence(
        staged(".kb/new.md", { status: "A", content: WITH_RECEIPT("r") }),
        exec,
      ),
    ).toStrictEqual({
      ...staged(".kb/new.md", { status: "A" }),
      content: STRIPPED(),
      oldHunkRanges: [],
      hunkRanges: [],
    });
    expect(
      projectedPathEvidence(
        staged(".kb/gone.md", { status: "D", previousContent: "gone\n" }),
        exec,
      ),
    ).toStrictEqual({
      ...staged(".kb/gone.md", { status: "D" }),
      previousContent: "gone\n",
      oldHunkRanges: [],
      hunkRanges: [],
    });
    expect(calls.map(({ before, after }) => [before, after])).toStrictEqual([
      [WITH_RECEIPT("r1"), STRIPPED()],
      [STRIPPED(), ""],
      ["", STRIPPED()],
      ["gone\n", ""],
    ]);
  });

  test("rethrows a diff failure other than a difference, still cleaning up", () => {
    const { exec, calls } = fakeDiff({ status: 2, stdout: "@@ -1 +1 @@" });
    expect(() =>
      projectedPathEvidence(staged(".kb/a.md", { content: "x" }), exec),
    ).toThrow(new Error("git diff failed"));
    const directory = (calls[0]?.args.at(-1) as string).slice(
      0,
      -"/after.md".length,
    );
    expect(existsSync(directory)).toBe(false);
  });

  test("reads hunks from the real git diff", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`);
    const changed = [...lines];
    changed.splice(11, 12, "replacement");
    const result = projectedPathEvidence(
      staged(".kb/a.md", {
        previousContent: STRIPPED(`${lines.join("\n")}\n`),
        content: STRIPPED(`${changed.join("\n")}\n`),
      }),
    );
    expect([result.oldHunkRanges, result.hunkRanges]).toStrictEqual([
      [{ start: 15, end: 26 }],
      [{ start: 15, end: 15 }],
    ]);
    const same = projectedPathEvidence(
      staged(".kb/a.md", {
        previousContent: WITH_RECEIPT("r1"),
        content: WITH_RECEIPT("r2"),
      }),
    );
    expect([same.oldHunkRanges, same.hunkRanges]).toStrictEqual([[], []]);
  });
});

type Tree = Record<
  string,
  { mode?: string; type?: string; content?: string; oid?: string }
>;

function snapshot(tree: Tree): GitChangeSnapshot {
  const oid = (path: string) =>
    tree[path]?.oid ??
    Buffer.from(path).toString("hex").padEnd(40, "0").slice(0, 40);
  return {
    readGit: (args: readonly string[]) => {
      const path = (args[4] as string).slice(":(literal)".length);
      const entry = tree[path];
      return Buffer.from(
        entry
          ? `${entry.mode ?? "100644"} ${entry.type ?? "blob"} ${oid(path)}\t${path}\0`
          : "",
      );
    },
    readBlobs: (oids: readonly string[]) =>
      new Map(
        Object.entries(tree).flatMap(([path, entry]) =>
          entry.content !== undefined && oids.includes(oid(path))
            ? [[oid(path), Buffer.from(entry.content)] as const]
            : [],
        ),
      ),
  } as unknown as GitChangeSnapshot;
}

const HEX = "a".repeat(64);
const PROVIDER = "b".repeat(64);

function analysis(
  extra: Partial<Record<string, unknown>> = {},
): HostSourceAnalysisResultV2 {
  return {
    contractVersion: "kibi.symbol-extractor.v2",
    status: "partial",
    language: "typescript",
    sourceFile: "src/a.ts",
    symbols: [],
    diagnostics: [
      { code: "Z", message: "z" },
      { code: "A", message: "a" },
    ],
    uncoveredRanges: [
      {
        startLine: 1,
        startColumn: 2,
        endLine: 3,
        endColumn: 4,
        reason: "macro",
        extra: true,
      },
    ],
    providerId: "provider",
    stamp: { pluginId: "p" },
    inputFingerprint: HEX,
    providerFingerprint: PROVIDER,
    shadowComparisons: [],
    ...extra,
  } as unknown as HostSourceAnalysisResultV2;
}

describe("sideEvidence", () => {
  const tree = snapshot({
    "src/a.ts": { content: "abc" },
    "bin/run": { mode: "100755", content: "#!" },
    link: { mode: "120000", content: "target" },
    ".kb/sub.md": { mode: "160000", type: "commit", oid: "c".repeat(40) },
    ".kb/a.md": { content: WITH_RECEIPT("r") },
    "odd-mode": { mode: "100600" },
    "gitlink-blob": { mode: "160000", type: "blob" },
    "file-commit": { type: "commit" },
    "file-tree": { type: "tree" },
    "link-tree": { mode: "120000", type: "tree" },
  });
  const oid = (path: string) =>
    Buffer.from(path).toString("hex").padEnd(40, "0").slice(0, 40);

  test("is null for a path the tree does not have", () => {
    expect(sideEvidence(tree, "T", "missing", null, undefined)).toBeNull();
  });

  test("refuses unsupported modes and mode/type mismatches", () => {
    expect(() => sideEvidence(tree, "T", "odd-mode", null, "x")).toThrow(
      new Error("Unsupported Git mode 100600 for odd-mode"),
    );
    for (const path of [
      "gitlink-blob",
      "file-commit",
      "file-tree",
      "link-tree",
    ])
      expect(() => sideEvidence(tree, "T", path, null, "x")).toThrow(
        new Error(`Git mode/object type mismatch for ${path}`),
      );
  });

  test("binds the bytes and kind of regular files, executables, symlinks and gitlinks", () => {
    expect(sideEvidence(tree, "T", "src/a.ts", null, "abc")).toStrictEqual({
      mode: "100644",
      objectId: oid("src/a.ts"),
      byteFingerprint: fingerprintBytes(Buffer.from("abc")),
      kind: "regular",
      analysis: null,
    });
    expect(sideEvidence(tree, "T", "bin/run", null, "#!")?.kind).toBe(
      "regular",
    );
    expect(sideEvidence(tree, "T", "link", null, "target")).toStrictEqual({
      mode: "120000",
      objectId: oid("link"),
      byteFingerprint: fingerprintBytes(Buffer.from("target")),
      kind: "symlink",
      analysis: null,
    });
    expect(
      sideEvidence(tree, "T", ".kb/sub.md", null, undefined),
    ).toStrictEqual({
      mode: "160000",
      objectId: "c".repeat(40),
      byteFingerprint: fingerprint({
        mode: "160000",
        type: "commit",
        objectId: "c".repeat(40),
      }),
      kind: "gitlink",
      analysis: null,
    });
  });

  test("binds knowledge markdown by its receipt-stripped bytes", () => {
    expect(
      sideEvidence(tree, "T", ".kb/a.md", null, WITH_RECEIPT("r")),
    ).toStrictEqual({
      mode: "100644",
      objectId: null,
      byteFingerprint: fingerprintBytes(Buffer.from(STRIPPED())),
      kind: "regular",
      contentProjection: "proof_receipts_stripped",
      analysis: null,
    });
  });

  test("binds a host analysis of the captured bytes", () => {
    const result = analysis();
    expect(
      sideEvidence(tree, "T", "src/a.ts", result, "abc")?.analysis,
    ).toStrictEqual({
      contractVersion: "kibi.symbol-extractor.v2",
      status: "partial",
      language: "typescript",
      sourceFile: "src/a.ts",
      providerId: "provider",
      providerStamp: { pluginId: "p" },
      providerFingerprint: `sha256:${PROVIDER}`,
      inputFingerprint: `sha256:${HEX}`,
      resultFingerprint: fingerprint(result),
      diagnosticCodes: ["A", "Z"],
      uncoveredRanges: [
        {
          startLine: 1,
          startColumn: 2,
          endLine: 3,
          endColumn: 4,
          reason: "macro",
        },
      ],
    });
    const plain = sideEvidence(
      tree,
      "T",
      "src/a.ts",
      analysis({
        status: "ok",
        uncoveredRanges: [],
        providerFingerprint: null,
      }),
      "abc",
    )?.analysis;
    expect([plain?.status, plain?.providerFingerprint]).toStrictEqual([
      "ok",
      null,
    ]);
    expect(
      sideEvidence(
        tree,
        "T",
        "src/a.ts",
        analysis({ status: "unsupported" }),
        "abc",
      )?.analysis?.status,
    ).toBe("unsupported");
  });

  test("refuses an analysis that does not bind the captured path", () => {
    const refuse = (
      extra: Partial<Record<string, unknown>>,
      message: string,
      content: string | null = "abc",
    ) =>
      expect(() =>
        sideEvidence(
          tree,
          "T",
          "src/a.ts",
          analysis(extra),
          content ?? undefined,
        ),
      ).toThrow(new Error(message));
    refuse(
      { sourceFile: "src/b.ts" },
      "Analysis source path mismatch for src/a.ts",
    );
    const noInput =
      "Host analysis lacks a valid input fingerprint for captured path src/a.ts";
    refuse({}, noInput, null);
    for (const inputFingerprint of [
      "A".repeat(64),
      "a".repeat(63),
      "a".repeat(65),
      `x${"a".repeat(64)}`,
      `${"a".repeat(64)}x`,
      "g".repeat(64),
    ])
      refuse({ inputFingerprint }, noInput);
    refuse(
      { providerFingerprint: "zz" },
      "Provider fingerprint for src/a.ts must be a sha256 fingerprint",
    );
    const mismatch = "Source analysis status/range mismatch for src/a.ts";
    refuse({ uncoveredRanges: [] }, mismatch);
    refuse({ status: "ok" }, mismatch);
  });
});

describe("assertAnalysisInput", () => {
  const change = (
    path: string,
    before: unknown,
    after: unknown,
  ): SourceChangeAnalysis => ({ path, before, after }) as SourceChangeAnalysis;

  test("needs an analysis of each captured side, under the same path", () => {
    const file = staged("a.ts", { previousContent: "p", content: "c" });
    expect(() =>
      assertAnalysisInput(file, change("a.ts", {}, {})),
    ).not.toThrow();
    expect(() => assertAnalysisInput(file, undefined)).toThrow(
      new Error("Missing before-side source analysis for a.ts"),
    );
    expect(() => assertAnalysisInput(file, change("a.ts", {}, null))).toThrow(
      new Error("Missing after-side source analysis for a.ts"),
    );
    expect(() =>
      assertAnalysisInput(staged("a.ts", { content: "c" }), undefined),
    ).toThrow(new Error("Missing after-side source analysis for a.ts"));
    expect(() => assertAnalysisInput(file, change("b.ts", {}, {}))).toThrow(
      new Error("Analysis path mismatch for a.ts"),
    );
  });

  test("needs nothing for absent sides, metadata or skipped files", () => {
    expect(() => assertAnalysisInput(staged("a.ts"), undefined)).not.toThrow();
    for (const extra of [
      { analysisDepth: "metadata" as const },
      { skipReason: "binary" as const },
    ])
      expect(() =>
        assertAnalysisInput(
          staged("a.ts", { content: "c", ...extra }),
          change("b.ts", null, null),
        ),
      ).not.toThrow();
  });
});

describe("exactPathProjection", () => {
  const before = { mode: "100644" } as never;
  const after = { mode: "100755" } as never;

  test("projects the minimal path record with each optional field", () => {
    expect(
      exactPathProjection(
        staged("a.ts", { hunkRanges: [{ start: 1, end: 2 }] }),
        null,
        null,
      ),
    ).toStrictEqual({
      path: "a.ts",
      status: "M",
      analysisDepth: "symbol",
      disposition: "checked",
      oldHunkRanges: [],
      newHunkRanges: [{ start: 1, end: 2 }],
      before: null,
      after: null,
    });
    expect(
      exactPathProjection(
        staged("a.ts", {
          status: "R",
          oldPath: "o.ts",
          copyFromPath: "c.ts",
          skipReason: "symlink",
          gitMode: "120000",
          previousMode: "100644",
          oldHunkRanges: [{ start: 3, end: 4 }],
          content: "ignored",
        }),
        before,
        after,
      ),
    ).toStrictEqual({
      path: "a.ts",
      status: "R",
      oldPath: "o.ts",
      copyFromPath: "c.ts",
      analysisDepth: "symbol",
      disposition: "checked",
      skipReason: "symlink",
      gitMode: "120000",
      previousMode: "100644",
      oldHunkRanges: [{ start: 3, end: 4 }],
      newHunkRanges: [],
      before,
      after,
    });
  });
});
