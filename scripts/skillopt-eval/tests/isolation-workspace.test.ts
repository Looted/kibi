import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIsolationWorkspace } from "../runtime/isolation-workspace";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("isolation workspace cleanup", () => {
  test("Given a first removal failure When cleanup retries Then it removes private auth and the workspace", async () => {
    // Given
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cleanup-retry-"),
    );
    roots.push(artifactRoot);
    let rootRemovals = 0;
    let failInitialCleanup = true;
    let workspaceRoot = "";
    const workspace = await createIsolationWorkspace({
      artifactRoot,
      runId: "00000000-0000-4000-8000-000000000021",
      role: "optimizer",
      remove: async (root) => {
        if (root === workspaceRoot) {
          rootRemovals += 1;
          if (failInitialCleanup) {
            throw new Error("injected_root_remove_failure");
          }
        }
        if (failInitialCleanup && root === workspace.codexHome) {
          throw new Error("injected_auth_remove_failure");
        }
        await rm(root, { recursive: true, force: true });
      },
    });
    workspaceRoot = workspace.root;
    const authPath = join(workspace.codexHome, "auth.json");
    await Bun.write(authPath, "private-auth");

    // When
    await expect(workspace.cleanup()).rejects.toThrow(
      "workspace_cleanup_failed",
    );
    expect(existsSync(authPath)).toBe(true);
    expect(existsSync(workspace.root)).toBe(true);
    failInitialCleanup = false;
    await workspace.cleanup();

    // Then
    expect(rootRemovals).toBe(2);
    expect(existsSync(authPath)).toBe(false);
    expect(existsSync(workspace.root)).toBe(false);
  });
});
