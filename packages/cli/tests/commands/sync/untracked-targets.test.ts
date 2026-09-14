import { describe, expect, test } from "bun:test";
import { findUntrackedDocumentMatches } from "../../../src/commands/sync/untracked-targets.js";

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
