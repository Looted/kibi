import { describe, expect, test } from "bun:test";
import { describeWorkspaceDrift } from "../../src/commands/prove.js";

describe("describeWorkspaceDrift", () => {
  test("lists snapshot-relevant changes first, capped at ten", () => {
    const changes = [
      {
        path: ".kb/tests/receipt-only.md",
        status: " M",
        snapshotRelevant: false,
      },
      ...Array.from({ length: 14 }, (_, index) => ({
        path: `src/file-${index}.ts`,
        status: "M",
        snapshotRelevant: true,
      })),
    ];
    const drift = describeWorkspaceDrift({
      available: true,
      snapshot: {
        hash: "hash",
        version: "kibi.workspace-snapshot.v2",
        dirty: true,
        fileCount: changes.length,
        changes,
        changeCount: changes.length,
        changesTruncated: false,
      },
    } as never);
    expect(drift).toContain("; changed: ");
    expect(drift).toContain("M src/file-0.ts");
    expect(drift).toContain("(+4 more)");
    expect(drift).not.toContain("receipt-only");
  });

  test("falls back to non-relevant changes when nothing is snapshot-relevant", () => {
    const drift = describeWorkspaceDrift({
      available: true,
      snapshot: {
        hash: "hash",
        version: "kibi.workspace-snapshot.v2",
        dirty: false,
        fileCount: 1,
        changes: [
          { path: ".kb/tests/a.md", status: " M", snapshotRelevant: false },
        ],
        changeCount: 1,
        changesTruncated: false,
      },
    } as never);
    expect(drift).toContain(".kb/tests/a.md");
  });

  test("explains when git reports no changes at all", () => {
    const drift = describeWorkspaceDrift({
      available: true,
      snapshot: {
        hash: "hash",
        version: "kibi.workspace-snapshot.v2",
        dirty: false,
        fileCount: 0,
        changes: [],
        changeCount: 0,
        changesTruncated: false,
      },
    } as never);
    expect(drift).toContain("no workspace changes");
  });

  test("reports an unavailable snapshot", () => {
    const drift = describeWorkspaceDrift({
      available: false,
      error: "no git",
    } as never);
    expect(drift).toContain("workspace snapshot unavailable");
  });
});
