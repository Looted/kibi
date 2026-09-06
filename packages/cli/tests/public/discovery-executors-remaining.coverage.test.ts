// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EngineClient } from "../../src/engine.js";
import { executeStatus } from "../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (process.exitCode === 1) process.exitCode = 0;
});

function healthyStore(root: string, branch = "main"): void {
  const store = branchStorePath(root, branch);
  ensureBranchStoreManifest(root, branch);
  mkdirSync(path.join(store, "rdf"), { recursive: true });
  writeFileSync(path.join(store, "storage.json"), "{}\n");
  writeFileSync(path.join(store, "CURRENT"), "generation-abc:1\n");
}

function context(
  workspaceRoot: string,
  extra?: Partial<OperationContext>,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    fs: {
      ...nodeFilesystem,
      glob: async () => ["kibi/plugin.ts"],
      stat: async (target) => {
        throw new Error(`missing ${String(target)}`);
      },
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: path.join(workspaceRoot, ".kb", "branches", "main"),
      kind: "exact",
      migrationRequired: false,
    },
    ...extra,
  };
}

describe("discovery-executors remaining owned-engine and vendored status", () => {
  test("executeStatus owns an engine, sorts stale reasons, and reports vendored_only", async () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-status-owned-");
    roots.push(root);
    healthyStore(root);
    const queryStatusJson = spyOn(
      EngineClient.prototype,
      "queryStatusJson",
    ).mockResolvedValue({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "compiled",
          snapshotId: "snap-1",
          syncedAt: null,
          dirty: false,
          syncState: "clean",
          staleReasons: [
            { path: "z.md", code: "z" },
            { path: "a.md", code: "a" },
          ],
        }),
      },
    });
    const terminate = spyOn(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    spies.push(queryStatusJson, terminate);

    const result = await executeStatus({}, context(root));
    expect(queryStatusJson).toHaveBeenCalled();
    expect(terminate).toHaveBeenCalled();
    expect(result.structuredContent.branch).toBe("main");
    expect(result.structuredContent.staleReasons?.[0]).toEqual(
      expect.objectContaining({ path: "a.md" }),
    );
    expect(result.structuredContent.bootstrap?.activationState).toBe(
      "vendored_only",
    );
    expect(result.structuredContent.bootstrap?.nextAction).toEqual(
      expect.objectContaining({ operation: "move-to-project-root" }),
    );
  });
});
