import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  classifySupersedesHistory,
  firstGitAdditionCommit,
  validateSupersedesSourceHistory,
} from "../../src/operations/mutation/relationships.js";
import type { PrologPort } from "../../src/public/operations/runtime-types.js";

const commits = {
  legacy: "1111111111111111111111111111111111111111",
  exact: "2222222222222222222222222222222222222222",
} as const;

const ancestry = {
  firstAdditionCommit: (_workspaceRoot: string, source: string) =>
    source.includes("legacy")
      ? commits.legacy
      : source.includes("exact")
        ? commits.exact
        : null,
  isAncestor: (_workspaceRoot: string, ancestor: string, descendant: string) =>
    ancestor === descendant ||
    (ancestor === commits.legacy && descendant === commits.exact),
};

const prolog = {
  query: async () => ({
    success: true,
    bindings: { TargetSource: "documentation/requirements/exact.md" },
  }),
} as unknown as PrologPort;

describe("supersedes source-history direction", () => {
  test("finds the first Git commit that added a tracked source", () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-supersedes-history-"),
    );
    try {
      execFileSync("git", ["init", "--quiet"], { cwd: root });
      execFileSync("git", ["config", "user.email", "kibi@example.test"], {
        cwd: root,
      });
      execFileSync("git", ["config", "user.name", "Kibi Test"], {
        cwd: root,
      });
      writeFileSync(path.join(root, "legacy.md"), "legacy\n");
      execFileSync("git", ["add", "legacy.md"], { cwd: root });
      execFileSync("git", ["commit", "--quiet", "-m", "add legacy"], {
        cwd: root,
      });
      const addition = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim();

      expect(firstGitAdditionCommit(root, "legacy.md")).toBe(addition);
      expect(
        firstGitAdditionCommit(root, "https://example.test/legacy.md"),
      ).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("classifies a newer tracked source pointing to an older source as valid", () => {
    expect(
      classifySupersedesHistory(
        "/repo",
        commits.exact,
        commits.legacy,
        ancestry,
      ),
    ).toBe("valid");
  });

  test("keeps incomparable or unavailable history explicit", () => {
    expect(
      classifySupersedesHistory("/repo", null, commits.legacy, ancestry),
    ).toBe("unknown");
  });

  test("rejects an older tracked requirement pointing to a newer one", async () => {
    await expect(
      validateSupersedesSourceHistory(
        prolog,
        {
          id: "REQ-LEGACY",
          source: "documentation/requirements/legacy.md",
        },
        [
          {
            type: "supersedes",
            from: "REQ-LEGACY",
            to: "REQ-EXACT",
          },
        ],
        "/repo",
        ancestry,
      ),
    ).rejects.toThrow("new -> old");
  });

  test("uses the journaled engine entity projection for target provenance", async () => {
    const indexedProlog = {
      query: async () => {
        throw new Error("raw Prolog query should not be used");
      },
      queryEntities: async () => ({
        entities: [
          {
            id: "REQ-EXACT",
            source: "documentation/requirements/exact.md",
          },
        ],
        count: 1,
      }),
    } as unknown as PrologPort;

    await expect(
      validateSupersedesSourceHistory(
        indexedProlog,
        {
          id: "REQ-LEGACY",
          source: "documentation/requirements/legacy.md",
        },
        [
          {
            type: "supersedes",
            from: "REQ-LEGACY",
            to: "REQ-EXACT",
          },
        ],
        "/repo",
        ancestry,
      ),
    ).rejects.toThrow("new -> old");
  });
});
