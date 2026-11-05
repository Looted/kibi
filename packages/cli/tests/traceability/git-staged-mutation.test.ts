import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as changeSnapshot from "../../src/traceability/git-change-snapshot.js";
import {
  type StagedPath,
  getStagedFiles,
  getStagedInventory,
  parseHunksFromDiff,
  parseNameStatusNull,
  supportedStagedFiles,
} from "../../src/traceability/git-staged.js";

const ENV_KEYS = ["KIBI_TRACE", "KIBI_DEBUG"] as const;
const savedEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);
const originalCwd = process.cwd();
const roots: string[] = [];

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
  process.chdir(originalCwd);
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function quiet(): void {
  for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
}

/** A git reader answering exact argument lists; anything else fails. */
function scripted(responses: Record<string, string | Buffer | Error>) {
  const calls: string[] = [];
  const exec = (args: readonly string[]): Buffer => {
    const key = args.join(" ");
    calls.push(key);
    const response = responses[key];
    if (response === undefined) throw new Error(`unexpected git ${key}`);
    if (response instanceof Error) throw response;
    return Buffer.isBuffer(response) ? response : Buffer.from(response);
  };
  return { exec, calls };
}

const NAME_STATUS = "diff --cached --name-status -z --diff-filter=ACMRTDC";
const mode = (value: string) => `${value} ${"a".repeat(40)} 0\tx\0`;

/** Responses for one non-deleted, non-link staged path. */
function textPath(
  path: string,
  content: string | Buffer,
  diff = "@@ -1 +1 @@\n",
  gitMode = "100644",
): Record<string, string | Buffer> {
  return {
    [`ls-files --stage -z -- ${path}`]: mode(gitMode),
    [`diff --cached -U0 -- ${path}`]: diff,
    [`show :${path}`]: content,
  };
}

describe("parseNameStatusNull", () => {
  test("parses tab, NUL, rename and copy rows", () => {
    expect(parseNameStatusNull("")).toStrictEqual([]);
    expect(
      parseNameStatusNull(
        "A\tone.ts\0R90\told\tnew\0M\0two.ts\0R100\0a\0b\0C75\0c\0d\0R\0e\0f\0D\0g\0",
      ),
    ).toStrictEqual([
      { status: "A", parts: ["one.ts"] },
      { status: "R90", parts: ["old", "new"] },
      { status: "M", parts: ["two.ts"] },
      { status: "R100", parts: ["a", "b"] },
      { status: "C75", parts: ["c", "d"] },
      { status: "R", parts: ["e", "f"] },
      { status: "D", parts: ["g"] },
    ]);
  });

  test("only treats a whole R or C status as a two-path row", () => {
    expect(parseNameStatusNull("XR\0a\0b\0c\0")).toStrictEqual([
      { status: "XR", parts: ["a"] },
      { status: "b", parts: ["c"] },
    ]);
    expect(parseNameStatusNull("R1x\0a\0b\0c\0")).toStrictEqual([
      { status: "R1x", parts: ["a"] },
      { status: "b", parts: ["c"] },
    ]);
  });

  test("drops a status cut off from its paths", () => {
    expect(parseNameStatusNull("M\0a\0D")).toStrictEqual([
      { status: "M", parts: ["a"] },
    ]);
    expect(parseNameStatusNull("R100\0")).toStrictEqual([]);
  });
});

describe("parseHunksFromDiff", () => {
  test("reads new-file ranges of every hunk header", () => {
    expect(
      parseHunksFromDiff(
        "x @@ -1 +9 @@\n@@ -1,2 +3,4 @@ ctx\n@@  -10,1  +12,0  @@\n@@  -10,1  +12,2  @@\n@@ -1,10 +30,12 @@\n@@ -20 +22 @@\n@@ -5 +7,1 @@",
      ),
    ).toStrictEqual([
      { start: 3, end: 6 },
      { start: 12, end: 13 },
      { start: 30, end: 41 },
      { start: 22, end: 22 },
      { start: 7, end: 7 },
    ]);
  });

  test("ignores malformed headers", () => {
    expect(
      parseHunksFromDiff(
        "@@ -a +1 @@\n@@ -1 +b @@\n@@ -1 + 2 @@\n@@-1 +2 @@\n",
      ),
    ).toStrictEqual([]);
  });

  test("marks a new file without hunks as wholly changed", () => {
    expect(parseHunksFromDiff("", true)).toStrictEqual([]);
    expect(parseHunksFromDiff("no hunks", true)).toStrictEqual([
      { start: 1, end: Number.MAX_SAFE_INTEGER },
    ]);
    expect(parseHunksFromDiff("no hunks")).toStrictEqual([]);
    expect(parseHunksFromDiff("@@ -1 +1,0 @@", true)).toStrictEqual([
      { start: 1, end: Number.MAX_SAFE_INTEGER },
    ]);
    expect(parseHunksFromDiff("@@ -0,0 +1,2 @@", true)).toStrictEqual([
      { start: 1, end: 2 },
    ]);
  });
});

describe("getStagedInventory with a git reader", () => {
  test("wraps a failing listing with the command", () => {
    const { exec } = scripted({ [NAME_STATUS]: new Error("boom") });
    expect(() => getStagedInventory(exec)).toThrow(
      `failed to list staged files: Error: git command failed: git ${NAME_STATUS} -> boom`,
    );
    for (const [thrown, text] of [
      ["raw", "raw"],
      [{ message: "" }, "[object Object]"],
      [undefined, "undefined"],
      [null, "null"],
    ] as const) {
      const exec = () => {
        throw thrown;
      };
      expect(() => getStagedInventory(exec)).toThrow(
        `failed to list staged files: Error: git command failed: git ${NAME_STATUS} -> ${text}`,
      );
    }
  });

  test("classifies text paths by kind and reads them from the index", () => {
    quiet();
    const { exec, calls } = scripted({
      [NAME_STATUS]:
        "A\0src/a.ts\0M\0.kb/requirements/REQ-1.md\0M\0notes.txt\0\tblank.cjs\0",
      ...textPath("src/a.ts", "one\ntwo\nthree", "--- /dev/null\n"),
      ...textPath(".kb/requirements/REQ-1.md", "# r\n", "@@ -1 +1,2 @@\n"),
      ...textPath("notes.txt", "n\r\nm\r\n", "--- a/dev/nullx\n@@ -1 +2 @@\n"),
      ...textPath("blank.cjs", "x", "", "100755"),
    });
    expect(getStagedInventory(exec)).toStrictEqual([
      {
        path: "src/a.ts",
        status: "A",
        hunkRanges: [{ start: 1, end: 3 }],
        diffText: "--- /dev/null\n",
        content: "one\ntwo\nthree",
        gitMode: "100644",
        analysisDepth: "symbol",
        disposition: "checked",
      },
      {
        path: ".kb/requirements/REQ-1.md",
        status: "M",
        hunkRanges: [{ start: 1, end: 2 }],
        diffText: "@@ -1 +1,2 @@\n",
        content: "# r\n",
        gitMode: "100644",
        analysisDepth: "metadata",
        disposition: "checked",
      },
      {
        path: "notes.txt",
        status: "M",
        hunkRanges: [{ start: 2, end: 2 }],
        diffText: "--- a/dev/nullx\n@@ -1 +2 @@\n",
        content: "n\r\nm\r\n",
        gitMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "blank.cjs",
        status: "M",
        hunkRanges: [],
        diffText: "",
        content: "x",
        gitMode: "100755",
        analysisDepth: "symbol",
        disposition: "checked",
      },
    ]);
    expect(calls).toStrictEqual([
      NAME_STATUS,
      "ls-files --stage -z -- src/a.ts",
      "diff --cached -U0 -- src/a.ts",
      "show :src/a.ts",
      "ls-files --stage -z -- .kb/requirements/REQ-1.md",
      "diff --cached -U0 -- .kb/requirements/REQ-1.md",
      "show :.kb/requirements/REQ-1.md",
      "ls-files --stage -z -- notes.txt",
      "diff --cached -U0 -- notes.txt",
      "show :notes.txt",
      "ls-files --stage -z -- blank.cjs",
      "diff --cached -U0 -- blank.cjs",
      "show :blank.cjs",
    ]);
  });

  test("normalizes a whole-file hunk to at least one line", () => {
    quiet();
    const { exec } = scripted({
      [NAME_STATUS]:
        "A\0empty.ts\0A\0crlf.ts\0A\0plain.ts\0M\0same.ts\0M\0moved.ts\0",
      ...textPath("empty.ts", "", "--- /dev/null\n"),
      ...textPath("crlf.ts", "a\r\nb\r\nc", "--- /dev/null\n"),
      ...textPath("plain.ts", "a\nb", "index 1..2\n"),
      ...textPath("same.ts", "a\nb", "index 1..2\n"),
      ...textPath("moved.ts", "a\nb", "--- /dev/null\n"),
    });
    expect(
      getStagedInventory(exec).map((file) => file.hunkRanges),
    ).toStrictEqual([
      [{ start: 1, end: 1 }],
      [{ start: 1, end: 3 }],
      [{ start: 1, end: 2 }],
      [],
      [{ start: 1, end: 2 }],
    ]);
  });

  test("reads renames, copies and deletions from the right tree", () => {
    quiet();
    const { exec, calls } = scripted({
      [NAME_STATUS]: "R100\0old.py\0new.py\0C80\0src.py\0copy.py\0D\0gone.py\0",
      ...textPath("new.py", "r\n"),
      ...textPath("copy.py", "c\n"),
      "ls-tree -z HEAD -- gone.py": `100644 blob ${"b".repeat(40)}\tgone.py\0`,
      "diff --cached -U0 -- gone.py": "@@ -1,2 +0,0 @@\n",
      "show HEAD:gone.py": "def gone():\n    pass\n",
    });
    expect(getStagedInventory(exec)).toStrictEqual([
      {
        path: "new.py",
        status: "R",
        oldPath: "old.py",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "@@ -1 +1 @@\n",
        content: "r\n",
        gitMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "copy.py",
        status: "C",
        copyFromPath: "src.py",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "@@ -1 +1 @@\n",
        content: "c\n",
        gitMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "gone.py",
        status: "D",
        hunkRanges: [],
        diffText: "@@ -1,2 +0,0 @@\n",
        previousContent: "def gone():\n    pass\n",
        gitMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
    ]);
    expect(calls).toContain("show HEAD:gone.py");
  });

  test("reads a deleted supported file as file-level evidence", () => {
    quiet();
    const { exec } = scripted({
      [NAME_STATUS]: "D\0gone.ts\0",
      "ls-tree -z HEAD -- gone.ts": "garbage",
      "diff --cached -U0 -- gone.ts": "",
      "show HEAD:gone.ts": "x\n",
    });
    expect(getStagedInventory(exec)).toStrictEqual([
      {
        path: "gone.ts",
        status: "D",
        hunkRanges: [],
        diffText: "",
        previousContent: "x\n",
        analysisDepth: "file",
        disposition: "advisory",
      },
    ]);
  });

  test("uses the only path of a truncated rename or copy row", () => {
    quiet();
    const { exec } = scripted({
      [NAME_STATUS]: "R\0lonely.txt",
      ...textPath("lonely.txt", "l"),
    });
    expect(getStagedInventory(exec)[0]).toMatchObject({
      path: "lonely.txt",
      oldPath: "lonely.txt",
    });
    const copy = scripted({
      [NAME_STATUS]: "C\tonly.txt",
      ...textPath("only.txt", "o"),
    });
    expect(getStagedInventory(copy.exec)[0]).toMatchObject({
      path: "only.txt",
      copyFromPath: "only.txt",
    });
  });

  test("skips links and submodules without reading their blobs", () => {
    quiet();
    const { exec, calls } = scripted({
      [NAME_STATUS]: "M\0link\0R100\0sub-old\0sub\0C50\0from\0link2\0",
      "ls-files --stage -z -- link": mode("120000"),
      "ls-files --stage -z -- sub": mode("160000"),
      "ls-files --stage -z -- link2": mode("120000"),
    });
    expect(getStagedInventory(exec)).toStrictEqual([
      {
        path: "link",
        status: "M",
        hunkRanges: [],
        gitMode: "120000",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "symlink",
      },
      {
        path: "sub",
        status: "R",
        oldPath: "sub-old",
        hunkRanges: [],
        gitMode: "160000",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "submodule",
      },
      {
        path: "link2",
        status: "C",
        copyFromPath: "from",
        hunkRanges: [],
        gitMode: "120000",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "symlink",
      },
    ]);
    expect(calls).toHaveLength(4);
  });

  test("skips binary and undecodable blobs", () => {
    quiet();
    const { exec } = scripted({
      [NAME_STATUS]: "R100\0a.bin\0b.bin\0C1\0c\0bad.txt\0M\0raw\0",
      ...textPath("b.bin", Buffer.from([1, 0, 2])),
      ...textPath("bad.txt", Buffer.from([0xc3, 0x28]), "--- /dev/null\n"),
      "ls-files --stage -z -- raw": "x100644 \0",
      "diff --cached -U0 -- raw": "",
      "show :raw": Buffer.from([0xff]),
    });
    expect(getStagedInventory(exec)).toStrictEqual([
      {
        path: "b.bin",
        status: "R",
        oldPath: "a.bin",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "@@ -1 +1 @@\n",
        gitMode: "100644",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "binary",
      },
      {
        path: "bad.txt",
        status: "C",
        copyFromPath: "c",
        hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
        diffText: "--- /dev/null\n",
        gitMode: "100644",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "unsupported_encoding",
      },
      {
        path: "raw",
        status: "M",
        hunkRanges: [],
        diffText: "",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "unsupported_encoding",
      },
    ]);
  });

  test("recognizes every source extension and Kibi metadata path", () => {
    quiet();
    const sources = [
      "a.ts",
      "a.tsx",
      "a.js",
      "a.jsx",
      "a.mts",
      "a.cts",
      "a.mjs",
      "a.cjs",
    ];
    const metadata = [
      ".kb/symbols.yaml",
      ".kb/symbols.yml",
      ".kb/symbol-coordinates.yaml",
      ".kb\\symbols.yml",
      ".kb/manifest.json",
      ".kb\\manifest.json",
      ".kb/relationships/r.yaml",
      ".kb/relationships/r.yml",
      ".kb\\relationships\\r.yml",
      ".kb/tests/T.md",
      ".kb\\facts\\F.md",
    ];
    const files = [
      "a.ts.txt",
      "a.d",
      ".kb/relationships/r.json",
      ".kb/relationships.yaml",
      "x/.kb/relationships/r.yaml",
      ".kb/requirements/R.txt",
      "docs/R.md",
      ".kb/manifest.json.bak",
      "x/.kb/symbols.yml",
    ];
    const all = [...sources, ...metadata, ...files];
    const { exec } = scripted({
      [NAME_STATUS]: all.map((path) => `M\0${path}\0`).join(""),
      ...Object.assign({}, ...all.map((path) => textPath(path, "t"))),
    });
    expect(
      getStagedInventory(exec).map((file) => [file.path, file.analysisDepth]),
    ).toStrictEqual([
      ...sources.map((path) => [path, "symbol"]),
      ...metadata.map((path) => [path, "metadata"]),
      ...files.map((path) => [path, "file"]),
    ]);
  });
});

describe("supportedStagedFiles", () => {
  test("keeps checked symbol and metadata files without inventory fields", () => {
    const base = {
      status: "M" as const,
      hunkRanges: [{ start: 1, end: 1 }],
      diffText: "d",
      content: "c",
      gitMode: "100644",
      previousContent: "p",
      disposition: "checked" as const,
    };
    const inventory: StagedPath[] = [
      { ...base, path: "a.ts", oldPath: "o.ts", analysisDepth: "symbol" },
      { ...base, path: ".kb/symbols.yaml", analysisDepth: "metadata" },
      { ...base, path: "gone.ts", status: "D", analysisDepth: "symbol" },
      {
        ...base,
        path: "bin.ts",
        analysisDepth: "symbol",
        disposition: "skipped",
        skipReason: "binary",
      },
      { ...base, path: "x.py", analysisDepth: "file", disposition: "advisory" },
      { ...base, path: "l", analysisDepth: "none" },
    ];
    expect(supportedStagedFiles(inventory)).toStrictEqual([
      {
        path: "a.ts",
        status: "M",
        oldPath: "o.ts",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "d",
        content: "c",
      },
      {
        path: ".kb/symbols.yaml",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "d",
        content: "c",
      },
    ]);
  });
});

/** A string-command git runner answering exact commands. */
function commands(responses: Record<string, string | Error>) {
  const calls: Array<[string, unknown]> = [];
  const exec = (cmd: string, opts: { encoding: "utf8" }): string => {
    calls.push([cmd, opts]);
    const response = responses[cmd];
    if (response === undefined) throw new Error(`unexpected ${cmd}`);
    if (response instanceof Error) throw response;
    return response;
  };
  return { exec, calls };
}

const LIST = "git diff --cached --name-status -z --diff-filter=ACMRD";

describe("getStagedFiles with a command runner", () => {
  test("wraps a failing listing with the command", () => {
    for (const [thrown, text] of [
      [new Error("boom"), "boom"],
      ["raw", "raw"],
      [undefined, "undefined"],
    ] as const) {
      const exec = () => {
        throw thrown;
      };
      expect(() => getStagedFiles(exec)).toThrow(
        `failed to list staged files: Error: git command failed: ${LIST} -> ${text}`,
      );
    }
  });

  test("reads supported files with quoted paths", () => {
    quiet();
    const { exec, calls } = commands({
      [LIST]:
        'A\0src/new "q" \\x.ts\0R100\0old.ts\0renamed.ts\0M\0.kb\\symbols.yml\0\tblank.js\0R\0solo.ts',
      'git diff --cached -U0 -- "src/new \\"q\\" \\\\x.ts"': "",
      'git show :"src/new \\"q\\" \\\\x.ts"': "a\r\nb",
      'git diff --cached -U0 -- "renamed.ts"': "@@ -1 +1,2 @@\n",
      'git show :"renamed.ts"': "r\n",
      'git diff --cached -U0 -- ".kb\\\\symbols.yml"': "--- /dev/null",
      'git show :".kb\\\\symbols.yml"': "",
      'git diff --cached -U0 -- "solo.ts"': "@@ -1 +1 @@",
      'git show :"solo.ts"': "s",
      'git diff --cached -U0 -- "blank.js"': "@@ -1 +1 @@",
      'git show :"blank.js"': "b",
    });
    expect(getStagedFiles(exec)).toStrictEqual([
      {
        path: 'src/new "q" \\x.ts',
        status: "A",
        // An empty diff has no hunks, even for a new file.
        hunkRanges: [],
        diffText: "",
        content: "a\r\nb",
      },
      {
        path: "renamed.ts",
        status: "R",
        oldPath: "old.ts",
        hunkRanges: [{ start: 1, end: 2 }],
        diffText: "@@ -1 +1,2 @@\n",
        content: "r\n",
      },
      {
        path: ".kb\\symbols.yml",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "--- /dev/null",
        content: "",
      },
      {
        path: "blank.js",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "@@ -1 +1 @@",
        content: "b",
      },
      {
        path: "solo.ts",
        status: "R",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "@@ -1 +1 @@",
        content: "s",
      },
    ]);
    expect(
      calls.every(([, opts]) => JSON.stringify(opts) === '{"encoding":"utf8"}'),
    ).toBe(true);
  });

  test("keeps a file whose diff fails with no hunks", () => {
    quiet();
    const { exec } = commands({
      [LIST]: "M\0a.ts\0",
      'git diff --cached -U0 -- "a.ts"': new Error("no diff"),
      'git show :"a.ts"': "x",
    });
    expect(getStagedFiles(exec)).toStrictEqual([
      { path: "a.ts", status: "M", hunkRanges: [], diffText: "", content: "x" },
    ]);
  });

  test("skips deletions, unsupported paths and unreadable blobs, logging when tracing", () => {
    const { exec } = commands({
      [LIST]:
        "D\0gone.ts\0M\0notes.txt\0M\0README.md\0M\0bin.ts\0M\0raw.ts\0M\0nil.ts\0D",
      'git diff --cached -U0 -- "bin.ts"': new Error("diff failed"),
      'git show :"bin.ts"': new Error("binary"),
      'git diff --cached -U0 -- "raw.ts"': "",
      'git show :"raw.ts"': "raw" as unknown as Error,
      'git diff --cached -U0 -- "nil.ts"': "",
    });
    const rawExec = (cmd: string, opts: { encoding: "utf8" }) => {
      if (cmd === 'git show :"raw.ts"') throw "raw failure";
      if (cmd === 'git show :"nil.ts"') throw undefined;
      return exec(cmd, opts);
    };
    quiet();
    const debug = spyOn(console, "debug").mockImplementation(() => {});
    try {
      expect(getStagedFiles(rawExec)).toStrictEqual([]);
      expect(debug).not.toHaveBeenCalled();
      process.env.KIBI_DEBUG = "1";
      expect(getStagedFiles(rawExec)).toStrictEqual([]);
      expect(debug.mock.calls.map((call) => call[0])).toStrictEqual([
        "Skipping deleted file (staged): gone.ts",
        "Skipping unsupported extension: notes.txt",
        "Skipping unsupported extension: README.md",
        'Failed to get diff for bin.ts: Error: git command failed: git diff --cached -U0 -- "bin.ts" -> diff failed',
        'Skipping binary/deleted or unreadable staged file bin.ts: git command failed: git show :"bin.ts" -> binary',
        'Skipping binary/deleted or unreadable staged file raw.ts: git command failed: git show :"raw.ts" -> raw failure',
        'Skipping binary/deleted or unreadable staged file nil.ts: git command failed: git show :"nil.ts" -> undefined',
      ]);
    } finally {
      debug.mockRestore();
    }
  });
});

describe("getStagedInventory without a reader", () => {
  test("rejects an index that moved after capture", () => {
    const capture = spyOn(
      changeSnapshot,
      "captureStagedSnapshot",
    ).mockImplementation(
      (root) =>
        ({
          inventory: [],
          assertUnchanged: () => {
            throw new Error(`index moved in ${root}`);
          },
        }) as unknown as ReturnType<
          typeof changeSnapshot.captureStagedSnapshot
        >,
    );
    try {
      expect(() => getStagedInventory()).toThrow(
        `index moved in ${process.cwd()}`,
      );
    } finally {
      capture.mockRestore();
    }
  });
});

describe("getStagedFiles copies and whole-file hunks", () => {
  test("reads a copy at its destination without an old path", () => {
    quiet();
    const { exec } = commands({
      [LIST]: "C75\0src.ts\0copy.ts\0",
      'git diff --cached -U0 -- "copy.ts"': "@@ -0,0 +1 @@",
      'git show :"copy.ts"': "c",
    });
    expect(getStagedFiles(exec)).toStrictEqual([
      {
        path: "copy.ts",
        status: "C",
        hunkRanges: [{ start: 1, end: 1 }],
        diffText: "@@ -0,0 +1 @@",
        content: "c",
      },
    ]);
  });

  test("sizes only the whole-file sentinel from the staged lines", () => {
    quiet();
    const { exec } = commands({
      [LIST]: "A\0new.ts\0M\0dev.ts\0M\0plain.ts\0M\0hunk.ts\0",
      'git diff --cached -U0 -- "new.ts"': "index 1..2",
      'git show :"new.ts"': "a\nb\nc",
      'git diff --cached -U0 -- "dev.ts"': "--- /dev/null",
      'git show :"dev.ts"': "a\r\nb",
      'git diff --cached -U0 -- "plain.ts"': "index 1..2",
      'git show :"plain.ts"': "a\nb",
      'git diff --cached -U0 -- "hunk.ts"': "@@ -1 +5,2 @@",
      'git show :"hunk.ts"': "x",
    });
    expect(
      getStagedFiles(exec).map((file) => [file.path, file.hunkRanges]),
    ).toStrictEqual([
      ["new.ts", [{ start: 1, end: 3 }]],
      ["dev.ts", [{ start: 1, end: 2 }]],
      ["plain.ts", []],
      ["hunk.ts", [{ start: 5, end: 6 }]],
    ]);
  });
});

describe("default git readers", () => {
  function repo(): string {
    const root = mkdtempSync(join(tmpdir(), "kibi-git-staged-m-"));
    roots.push(root);
    git(root, "init", "-q", "-b", "main");
    return root;
  }
  function git(root: string, ...args: string[]): void {
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
  }

  test("getStagedInventory reads the index of the current repository", () => {
    quiet();
    const root = repo();
    writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
    git(root, "add", "a.ts");
    process.chdir(root);
    expect(getStagedInventory()).toMatchObject([
      { path: "a.ts", status: "A", analysisDepth: "symbol" },
    ]);
  });

  test("getStagedFiles reads staged output beyond the default buffer", () => {
    quiet();
    const root = repo();
    const big = `export const a = ${JSON.stringify("x".repeat(1_100_000))};\n`;
    writeFileSync(join(root, "big.ts"), big);
    git(root, "add", "big.ts");
    process.chdir(root);
    const files = getStagedFiles();
    expect(files.map((file) => [file.path, file.content])).toStrictEqual([
      ["big.ts", big],
    ]);
  });
});
