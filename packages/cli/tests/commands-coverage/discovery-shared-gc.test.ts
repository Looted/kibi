import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { withAttachedBranchProlog } from "../../src/commands/discovery-shared.js";
import { gcCommand } from "../../src/commands/gc.js";
import * as detachedSnapshot from "../../src/runtime/detached-snapshot.js";
import * as branchResolver from "../../src/utils/branch-resolver.js";
import {
  captureIo,
  createGitWorkspace,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  mock.restore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  process.exitCode = 0;
});

function readOnlyAttachment(storePath: string) {
  return {
    kbBranch: branchResolver.DETACHED_SNAPSHOT_KB_BRANCH,
    storePath,
    readOnly: { notice: "detached checkout: reading a snapshot" },
  } as never;
}

describe("withAttachedBranchProlog on a detached checkout", () => {
  test("warns, refreshes the snapshot and attaches the snapshot store", async () => {
    const root = createGitWorkspace("main");
    roots.push(root);
    spyOn(branchResolver, "resolveReadBranchAttachment").mockReturnValue(
      readOnlyAttachment("/snapshot/store"),
    );
    const refreshed: unknown[] = [];
    spyOn(detachedSnapshot, "refreshDetachedSnapshot").mockImplementation(
      async (...args: unknown[]) => {
        refreshed.push(args[1]);
        return undefined as never;
      },
    );
    const queries: string[] = [];
    const fake = {
      start: async () => undefined,
      query: async (goal: string) => {
        queries.push(goal);
        return { success: true, bindings: {} };
      },
      terminate: async () => undefined,
    };
    const io = captureIo();
    restores.push(io.restore);
    const value = await withCwd(root, () =>
      withAttachedBranchProlog(async () => "done", {
        createProlog: () => fake as never,
      }),
    );
    expect(value).toBe("done");
    expect(io.warns.join("\n")).toBe(
      "[KIBI] detached checkout: reading a snapshot",
    );
    expect(refreshed).toHaveLength(1);
    expect(queries).toStrictEqual([
      "kb_attach('/snapshot/store')",
      "kb_detach",
    ]);
  });
});

describe("gc on a detached checkout", () => {
  test("keeps the detached snapshot store live", async () => {
    const root = createGitWorkspace("main");
    roots.push(root);
    const snapshot = path.join(
      root,
      ".kb",
      "branches",
      ...branchResolver.DETACHED_SNAPSHOT_KB_BRANCH.split("/"),
    );
    mkdirSync(snapshot, { recursive: true });
    writeFileSync(path.join(snapshot, "kb.rdf"), "");
    spyOn(branchResolver, "resolveReadBranchAttachment").mockReturnValue(
      readOnlyAttachment(snapshot),
    );
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(root, () => gcCommand({}));
    expect(io.logs.join("\n")).toBe(
      "Found 0 stale branch KB(s) (dry run - not quarantined)",
    );
  });
});
