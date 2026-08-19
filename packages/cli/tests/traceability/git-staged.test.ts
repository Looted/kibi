import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { execSync } from "../helpers/isolated-env.js";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  getStagedFiles,
  parseHunksFromDiff,
  parseNameStatusNull,
} from "../../src/traceability/git-staged";

function makeExec(
  responses: Record<string, string>,
  throws: Record<string, unknown> = {},
) {
  return (cmd: string) => {
    for (const [needle, error] of Object.entries(throws)) {
      if (cmd.includes(needle)) throw error;
    }

    for (const [needle, output] of Object.entries(responses)) {
      if (cmd.includes(needle)) return output;
    }

    throw new Error(`unexpected command: ${cmd}`);
  };
}

function createTempRepo(): string {
  const repoDir = mkdtempSync(join(tmpdir(), "kibi-git-staged-"));
  execSync("git init -b main", { cwd: repoDir, stdio: "pipe" });
  execSync('git config user.name "Test User"', { cwd: repoDir, stdio: "pipe" });
  execSync('git config user.email "test@example.com"', {
    cwd: repoDir,
    stdio: "pipe",
  });
  return repoDir;
}

describe("git-staged", () => {
  const originalCwd = process.cwd();
  const originalTrace = process.env.KIBI_TRACE;
  const originalDebug = process.env.KIBI_DEBUG;

  beforeEach(() => {
    mock.restore();
    process.env.KIBI_TRACE = undefined;
    process.env.KIBI_DEBUG = undefined;
    process.chdir(originalCwd);
  });

  afterEach(() => {
    process.chdir(originalCwd);

    if (originalTrace === undefined) process.env.KIBI_TRACE = undefined;
    else process.env.KIBI_TRACE = originalTrace;

    if (originalDebug === undefined) process.env.KIBI_DEBUG = undefined;
    else process.env.KIBI_DEBUG = originalDebug;
  });

  describe("parseNameStatusNull", () => {
    it("returns an empty array for empty input", () => {
      expect(parseNameStatusNull("")).toEqual([]);
    });

    it("parses tab-separated and null-delimited git status output", () => {
      expect(
        parseNameStatusNull(
          "A\tfile.ts\0M\0file.js\0R100\0old.ts\0new.ts\0C50\0a.ts\0b.ts\0",
        ),
      ).toEqual([
        { status: "A", parts: ["file.ts"] },
        { status: "M", parts: ["file.js"] },
        { status: "R100", parts: ["old.ts", "new.ts"] },
        { status: "C50", parts: ["a.ts", "b.ts"] },
      ]);
    });
  });

  describe("parseHunksFromDiff", () => {
    it("parses added ranges and ignores zero-length hunks", () => {
      expect(
        parseHunksFromDiff(
          "@@ -1,2 +3,4 @@\n@@ -10,1 +12,0 @@\n@@ -20 +22 @@\n",
        ),
      ).toEqual([
        { start: 3, end: 6 },
        { start: 22, end: 22 },
      ]);
    });

    it("uses a sentinel range for new files without hunk headers", () => {
      expect(
        parseHunksFromDiff(
          "diff --git a/new.ts b/new.ts\n--- /dev/null\n+++ b/new.ts\n",
          true,
        ),
      ).toEqual([{ start: 1, end: Number.MAX_SAFE_INTEGER }]);
    });
  });

  describe("getStagedFiles", () => {
    it("wraps git listing failures", () => {
      const exec = makeExec({}, { "--name-status": new Error("boom") });
      expect(() => getStagedFiles(exec)).toThrow(
        "failed to list staged files: Error: git command failed: git diff --cached --name-status -z --diff-filter=ACMRD -> boom",
      );
    });

    it("collects supported staged files, handles renames, and normalizes sentinel hunks", () => {
      const exec = makeExec({
        "--name-status":
          "A\0src/new file.ts\0R100\0src/old.ts\0src/renamed.ts\0M\0.kb/requirements/REQ-123.md\0M\0.kb/symbols.yaml\0\tblank-status.js\0",
        'git diff --cached -U0 -- "src/new file.ts"':
          "diff --git a/src/new file.ts b/src/new file.ts\n--- /dev/null\n+++ b/src/new file.ts\n",
        'git diff --cached -U0 -- "src/renamed.ts"':
          "@@ -1 +1,2 @@\n+renamed\n",
        'git diff --cached -U0 -- ".kb/requirements/REQ-123.md"':
          "@@ -1 +1 @@\n-title\n+title\n",
        'git diff --cached -U0 -- ".kb/symbols.yaml"':
          "diff --git a/.kb/symbols.yaml b/.kb/symbols.yaml\n--- /dev/null\n+++ b/.kb/symbols.yaml\n",
        'git diff --cached -U0 -- "blank-status.js"': "@@ -0,0 +1 @@\n+ok\n",
        'git show :"src/new file.ts"':
          "export const created = true;\nconsole.log(created);\n",
        'git show :"src/renamed.ts"':
          "export function renamed() {}\nsecond line\n",
        'git show :".kb/requirements/REQ-123.md"': "---\nid: REQ-123\n---\n",
        'git show :".kb/symbols.yaml"': "symbols:\n  - id: SYM-1\n",
        'git show :"blank-status.js"': "export default 1;\n",
      });

      expect(getStagedFiles(exec)).toEqual([
        {
          path: "src/new file.ts",
          status: "A",
          hunkRanges: [{ start: 1, end: 3 }],
          diffText:
            "diff --git a/src/new file.ts b/src/new file.ts\n--- /dev/null\n+++ b/src/new file.ts\n",
          content: "export const created = true;\nconsole.log(created);\n",
        },
        {
          path: "src/renamed.ts",
          status: "R",
          oldPath: "src/old.ts",
          hunkRanges: [{ start: 1, end: 2 }],
          diffText: "@@ -1 +1,2 @@\n+renamed\n",
          content: "export function renamed() {}\nsecond line\n",
        },
        {
          path: ".kb/requirements/REQ-123.md",
          status: "M",
          hunkRanges: [{ start: 1, end: 1 }],
          diffText: "@@ -1 +1 @@\n-title\n+title\n",
          content: "---\nid: REQ-123\n---\n",
        },
        {
          path: ".kb/symbols.yaml",
          status: "M",
          hunkRanges: [{ start: 1, end: 3 }],
          diffText:
            "diff --git a/.kb/symbols.yaml b/.kb/symbols.yaml\n--- /dev/null\n+++ b/.kb/symbols.yaml\n",
          content: "symbols:\n  - id: SYM-1\n",
        },
        {
          path: "blank-status.js",
          status: "M",
          hunkRanges: [{ start: 1, end: 1 }],
          diffText: "@@ -0,0 +1 @@\n+ok\n",
          content: "export default 1;\n",
        },
      ]);
    });

    it("skips deleted, unsupported, and unreadable files while logging debug details", () => {
      process.env.KIBI_DEBUG = "1";
      const debug = mock(() => {});
      const originalConsoleDebug = console.debug;
      console.debug = debug;

      try {
        const exec = makeExec(
          {
            "--name-status": "D\0gone.ts\0M\0notes.txt\0M\0broken.ts\0",
          },
          {
            'git diff --cached -U0 -- "broken.ts"': new Error("diff failed"),
            'git show :"broken.ts"': new Error("binary file"),
          },
        );

        expect(getStagedFiles(exec)).toEqual([]);
        expect(
          debug.mock.calls.map((call) => String((call as unknown[])[0])),
        ).toEqual([
          "Skipping deleted file (staged): gone.ts",
          "Skipping unsupported extension: notes.txt",
          expect.stringContaining("Failed to get diff for broken.ts"),
          expect.stringContaining(
            'Skipping binary/deleted or unreadable staged file broken.ts: git command failed: git show :"broken.ts" -> binary file',
          ),
        ]);
      } finally {
        console.debug = originalConsoleDebug;
      }
    });

    it("treats markdown outside entity directories as unsupported", () => {
      const exec = makeExec({
        "--name-status": "M\0README.md\0",
      });

      expect(getStagedFiles(exec)).toEqual([]);
    });

    it("reads staged files from a real temporary git repository", () => {
      const repoDir = createTempRepo();

      try {
        process.chdir(repoDir);
        mkdirSync(join(repoDir, "src"), { recursive: true });
        writeFileSync(
          join(repoDir, "src", "tracked.ts"),
          "export function tracked() {} // implements REQ-014\n",
        );

        execSync("git add src/tracked.ts", { cwd: repoDir, stdio: "pipe" });

        const files = getStagedFiles();
        expect(files).toHaveLength(1);
        expect(files[0]).toMatchObject({
          path: "src/tracked.ts",
          status: "A",
          hunkRanges: [{ start: 1, end: 1 }],
        });
        expect(files[0]?.diffText).toContain("tracked.ts");
        expect(files[0]?.content).toContain("tracked");
      } finally {
        process.chdir(originalCwd);
        rmSync(repoDir, { recursive: true, force: true });
      }
    });
  });
});
