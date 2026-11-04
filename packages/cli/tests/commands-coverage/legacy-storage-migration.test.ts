import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  applyLegacyStorageMigration,
  planLegacyStorageMigration,
  writeMovedSourceReceipts,
} from "../../src/commands/legacy-storage-migration.js";
import {
  createGitWorkspace,
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function dir(): string {
  const root = createTempDir("kibi-legacy-storage-");
  roots.push(root);
  return root;
}

function write(root: string, relative: string, content: string): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

describe("legacy symbols manifest destination classification", () => {
  test("an unreadable destination is a conflict, not an empty stub", () => {
    const root = dir();
    write(root, "documentation/symbols.yaml", "symbols:\n  - id: SYM-A\n");
    mkdirSync(path.join(root, ".kb", "symbols.yaml"), { recursive: true });
    const plan = planLegacyStorageMigration(root);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]?.kind).toBe("conflict");
    expect(plan.conflicts[0]?.from).toBe("documentation/symbols.yaml");
  });

  test("a legacy manifest whose symbols are all present is a stale subset", () => {
    const root = dir();
    write(
      root,
      "documentation/symbols.yaml",
      "symbols:\n  - plain\n  - null\n  - id: 3\n  - id: SYM-A\n",
    );
    write(root, ".kb/symbols.yaml", "symbols:\n  - id: SYM-A\n  - id: SYM-B\n");
    const plan = planLegacyStorageMigration(root);
    expect(plan.conflicts.map((conflict) => conflict.kind)).toStrictEqual([
      "stale_subset",
    ]);
    expect(plan.conflicts[0]?.resolution).toContain(
      "every symbol it declares (1) is already there",
    );
  });
});

describe("applyLegacyStorageMigration removals", () => {
  test("refuses a removal whose legacy copy changed since planning", () => {
    const root = dir();
    write(root, "documentation/requirements/REQ-1.md", "changed\n");
    write(root, ".kb/requirements/REQ-1.md", "original\n");
    expect(() =>
      applyLegacyStorageMigration(root, {
        moves: [],
        legacyConfig: "absent",
        schemaVersion: null,
        semanticAdvisorBackfill: null,
        removals: [
          {
            path: "documentation/requirements/REQ-1.md",
            duplicateOf: ".kb/requirements/REQ-1.md",
          },
        ],
        conflicts: [],
        blockers: [],
      }),
    ).toThrow(
      "Legacy storage migration is blocked: documentation/requirements/REQ-1.md changed since planning and no longer matches .kb/requirements/REQ-1.md.",
    );
  });
});

describe("writeMovedSourceReceipts", () => {
  test("skips an untracked destination that no longer exists", () => {
    const root = createGitWorkspace("main");
    roots.push(root);
    expect(
      writeMovedSourceReceipts(root, [
        {
          from: "documentation/requirements/REQ-1.md",
          to: ".kb/requirements/REQ-1.md",
          lane: "requirements",
        } as never,
      ]),
    ).toStrictEqual([]);
  });
});
