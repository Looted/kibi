import { describe, expect, test } from "bun:test";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import {
  type WorkspaceSnapshotEvidence,
  readWorkspaceSnapshot,
} from "../../../src/public/operations/workspace-snapshot.js";

function context(git: unknown): OperationContext {
  return { workspaceRoot: "/ws", git } as unknown as OperationContext;
}

describe("readWorkspaceSnapshot", () => {
  const unavailable: WorkspaceSnapshotEvidence = {
    available: false,
    error: "The active operation runtime does not expose workspace snapshots.",
  };

  test("reports a runtime without git", async () => {
    expect(await readWorkspaceSnapshot(context(undefined))).toStrictEqual(
      unavailable,
    );
  });

  test("reports git without workspace snapshots", async () => {
    expect(await readWorkspaceSnapshot(context({}))).toStrictEqual(unavailable);
  });

  test("returns the snapshot of the workspace root", async () => {
    const roots: string[] = [];
    const snapshot = {
      version: "kibi.workspace-snapshot.v2" as const,
      hash: "h",
      dirty: false,
      fileCount: 0,
    };
    const result = await readWorkspaceSnapshot(
      context({
        workspaceSnapshot: async (root: string) => {
          roots.push(root);
          return snapshot;
        },
      }),
    );
    expect(result).toStrictEqual({ available: true, snapshot });
    expect(roots).toStrictEqual(["/ws"]);
  });

  test("reports an Error message", async () => {
    const result = await readWorkspaceSnapshot(
      context({
        workspaceSnapshot: async () => {
          throw new Error("git failed");
        },
      }),
    );
    expect(result).toStrictEqual({ available: false, error: "git failed" });
  });

  test("stringifies a non-Error failure", async () => {
    const result = await readWorkspaceSnapshot(
      context({
        workspaceSnapshot: async () => {
          throw "plain failure";
        },
      }),
    );
    expect(result).toStrictEqual({ available: false, error: "plain failure" });
  });
});
