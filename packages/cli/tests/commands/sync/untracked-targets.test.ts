import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { findUntrackedDocumentMatches } from "../../../src/commands/sync/untracked-targets.js";
import {
  createGitWorkspace,
  createTempDir,
  git,
  removeTempDir,
} from "../../helpers/in-process-workspace";

const tempDirs: string[] = [];

afterEach(() => {
  for (const directory of tempDirs.splice(0)) removeTempDir(directory);
});

function depsWith(
  overrides: Partial<{
    execFileSync: (file: string, args: readonly string[]) => string;
    existsSync: (path: string) => boolean;
    readFileSync: (path: string) => string;
  }>,
) {
  const files = new Map<string, string>([
    [
      "/ws/.kb/tests/test-untracked.md",
      "---\nid: TEST-UNTRACKED\ntitle: Untracked test\n---\n\nbody\n",
    ],
    [
      "/ws/.kb/requirements/REQ-OTHER.md",
      "---\nid: REQ-OTHER\ntitle: Other\n---\n\nbody\n",
    ],
  ]);
  return {
    execFileSync:
      overrides.execFileSync ??
      (() =>
        [
          "/ws/.kb/tests/test-untracked.md",
          "/ws/.kb/requirements/REQ-OTHER.md",
        ].join("\0")),
    existsSync: overrides.existsSync ?? ((file: string) => files.has(file)),
    readFileSync:
      overrides.readFileSync ??
      ((file: string) => {
        const content = files.get(file);
        if (content === undefined) throw new Error("missing file");
        return content;
      }),
  };
}

describe("findUntrackedDocumentMatches", () => {
  test("matches missing ids to untracked .kb documents by frontmatter id", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({}),
    });
    expect(matches.get("TEST-UNTRACKED")).toBe(".kb/tests/test-untracked.md");
  });

  test("returns no match for ids that are not on disk untracked", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-ABSENT"], {
      ...depsWith({}),
    });
    expect(matches.size).toBe(0);
  });

  test("normalizes windows separators in reported paths", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        execFileSync: () => "\\ws\\.kb\\tests\\test-untracked.md",
        existsSync: () => true,
        readFileSync: () =>
          "---\nid: TEST-UNTRACKED\ntitle: Untracked test\n---\nbody\n",
      }),
    });
    expect(matches.get("TEST-UNTRACKED")).toBe(".kb/tests/test-untracked.md");
  });

  test("survives git failures and returns no matches", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        execFileSync: () => {
          throw new Error("git not found");
        },
      }),
    });
    expect(matches.size).toBe(0);
  });

  test("survives unreadable documents", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: () => {
          throw new Error("EACCES");
        },
      }),
    });
    expect(matches.size).toBe(0);
  });

  test("ignores non-markdown untracked files", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        execFileSync: () => "/ws/.kb/tests/test-untracked.yaml",
      }),
    });
    expect(matches.size).toBe(0);
  });

  test("returns no matches when the missing list is empty", () => {
    const matches = findUntrackedDocumentMatches("/ws", [], depsWith({}));
    expect(matches.size).toBe(0);
  });

  test("requires the id inside frontmatter", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: () => "body with id: TEST-UNTRACKED but no frontmatter\n",
      }),
    });
    expect(matches.size).toBe(0);
  });
});

describe("findUntrackedDocumentMatches frontmatter id parsing", () => {
  test("accepts a double-quoted frontmatter id", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: () => '---\nid: "TEST-UNTRACKED"\ntitle: t\n---\n',
      }),
    });
    expect(matches.get("TEST-UNTRACKED")).toBe(".kb/tests/test-untracked.md");
  });

  test("accepts a single-quoted frontmatter id", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: () => "---\nid: 'TEST-UNTRACKED'\ntitle: t\n---\n",
      }),
    });
    expect(matches.get("TEST-UNTRACKED")).toBe(".kb/tests/test-untracked.md");
  });

  test("ignores an id that appears after the frontmatter closes", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: () => "---\ntitle: t\n---\nid: TEST-UNTRACKED\n",
      }),
    });
    expect(matches.size).toBe(0);
  });

  test("ignores an empty id value", () => {
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: () => "---\nid:\ntitle: t\n---\n",
      }),
    });
    expect(matches.size).toBe(0);
  });

  test("gives up when no id appears within the scanned frontmatter window", () => {
    const filler = `${"filler: value\n".repeat(100)}`;
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: () => `---\n${filler}id: TEST-UNTRACKED\n`,
      }),
    });
    expect(matches.size).toBe(0);
  });

  test("stops scanning additional files once every missing id matched", () => {
    const reads: string[] = [];
    const matches = findUntrackedDocumentMatches("/ws", ["TEST-UNTRACKED"], {
      ...depsWith({
        readFileSync: (file: string) => {
          reads.push(file);
          const files = new Map<string, string>([
            [
              "/ws/.kb/tests/test-untracked.md",
              "---\nid: TEST-UNTRACKED\ntitle: t\n---\n",
            ],
            [
              "/ws/.kb/requirements/REQ-OTHER.md",
              "---\nid: REQ-OTHER\ntitle: t\n---\n",
            ],
          ]);
          const content = files.get(file);
          if (content === undefined) throw new Error("missing file");
          return content;
        },
      }),
    });
    expect(matches.get("TEST-UNTRACKED")).toBe(".kb/tests/test-untracked.md");
    // The untracked listing order puts the matching document first, so the
    // second candidate is never opened once every missing id has matched.
    expect(reads).toEqual(["/ws/.kb/tests/test-untracked.md"]);
  });
});

describe("findUntrackedDocumentMatches against a real git workspace", () => {
  test("matches unstaged .kb documents and reports workspace-relative paths", () => {
    const workspace = createGitWorkspace();
    tempDirs.push(workspace);
    const docDir = path.join(workspace, ".kb", "requirements");
    mkdirSync(docDir, { recursive: true });
    writeFileSync(
      path.join(docDir, "REQ-REAL.md"),
      "---\nid: REQ-REAL\ntitle: Real\n---\n\nbody\n",
      "utf8",
    );

    const matches = findUntrackedDocumentMatches(workspace, ["REQ-REAL"]);
    expect(matches.get("REQ-REAL")).toBe(".kb/requirements/REQ-REAL.md");
  });

  test("ignores documents once they are staged", () => {
    const workspace = createGitWorkspace();
    tempDirs.push(workspace);
    const docDir = path.join(workspace, ".kb", "requirements");
    mkdirSync(docDir, { recursive: true });
    writeFileSync(
      path.join(docDir, "REQ-STAGED.md"),
      "---\nid: REQ-STAGED\ntitle: Staged\n---\n\nbody\n",
      "utf8",
    );
    git(workspace, "add .kb/requirements/REQ-STAGED.md");

    const matches = findUntrackedDocumentMatches(workspace, ["REQ-STAGED"]);
    expect(matches.size).toBe(0);
  });

  test("returns no matches outside a git repository", () => {
    const workspace = createTempDir("kibi-untracked-nogit-");
    tempDirs.push(workspace);

    const matches = findUntrackedDocumentMatches(workspace, ["REQ-REAL"]);
    expect(matches.size).toBe(0);
  });

  test("skips untracked .md entries that cannot be read as files", () => {
    const workspace = createGitWorkspace();
    tempDirs.push(workspace);
    // A directory named like a markdown file passes the existsSync check but
    // cannot be read as a document, so it must never break the scan.
    const oddDir = path.join(workspace, ".kb", "notes.md");
    mkdirSync(oddDir, { recursive: true });

    const matches = findUntrackedDocumentMatches(workspace, ["REQ-REAL"]);
    expect(matches.size).toBe(0);
  });
});
