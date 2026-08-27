import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  addDirtyPaths,
  clearDirtyPaths,
  clearSessionHookState,
  hasGuidedPath,
  loadHookState,
  recordKbMcpTool,
  recordPlanDelivered,
  rememberGuidedPath,
  resolveStateDir,
  saveHookState,
  updateHookState,
} from "../src/hook-state";
import type { HookState } from "../src/hook-state";

const EMPTY_HOOK_STATE: HookState = {
  mcpState: "unknown",
  dirtyPaths: [],
  guidedReadPaths: [],
  guidedWritePaths: [],
  kbMutationTools: [],
  kbCheckRun: false,
  impactCheckRun: false,
  impactCheckedPaths: [],
  planDelivered: false,
};

function createStateDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cursor-hook-state-"));
}

const stateDirs: string[] = [];

afterEach(() => {
  for (const stateDir of stateDirs.splice(0)) {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

describe("Cursor hook state", () => {
  test("Given no state directory When loading and clearing Then empty state is returned", () => {
    expect(loadHookState(undefined)).toEqual(EMPTY_HOOK_STATE);
    saveHookState(undefined, {
      ...EMPTY_HOOK_STATE,
      dirtyPaths: ["src/ignored.ts"],
    });
    expect(clearSessionHookState(undefined)).toEqual(EMPTY_HOOK_STATE);
    expect(clearDirtyPaths(undefined)).toEqual(EMPTY_HOOK_STATE);
  });

  test("Given missing or corrupt state When loading Then empty state is returned", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);

    expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);

    fs.writeFileSync(path.join(stateDir, "hook-state.json"), "not json");

    expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);
  });

  test("Given raw state values When saving Then paths and tool names are normalized and bounded", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);

    saveHookState(stateDir, {
      mcpState: "observed",
      dirtyPaths: [" src\\a.ts ", "", "src/a.ts", "docs/a.md"],
      guidedReadPaths: Array.from(
        { length: 120 },
        (_, index) => ` read\\${index}.ts `,
      ),
      guidedWritePaths: [" write\\a.ts ", "write/a.ts"],
      kbMutationTools: Array.from(
        { length: 25 },
        (_, index) => ` kb_tool_${index} `,
      ),
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: [" src\\a.ts ", "src/a.ts"],
      planDelivered: true,
    });

    const state = loadHookState(stateDir);

    expect(state.dirtyPaths).toEqual(["src/a.ts", "docs/a.md"]);
    expect(state.guidedReadPaths).toHaveLength(100);
    expect(state.guidedReadPaths.at(0)).toBe("read/20.ts");
    expect(state.guidedWritePaths).toEqual(["write/a.ts"]);
    expect(state.kbMutationTools).toHaveLength(20);
    expect(state.kbMutationTools.at(0)).toBe("kb_tool_5");
    expect(state.kbCheckRun).toBe(true);
    expect(state.impactCheckRun).toBe(true);
    expect(state.impactCheckedPaths).toEqual(["src/a.ts"]);
    expect(state.mcpState).toBe("observed");
    expect(state.planDelivered).toBe(true);
  });

  test("Given conversation id without plugin data When resolving state dir Then temp-safe id is used", () => {
    expect(resolveStateDir("/tmp/plugin", "conversation/id")).toBe(
      "/tmp/plugin",
    );
    expect(resolveStateDir(undefined, undefined)).toBeUndefined();
    expect(resolveStateDir(undefined, "conversation/id with spaces")).toBe(
      path.join(
        os.tmpdir(),
        "kibi-cursor-hook-state",
        "conversation_id_with_spaces",
      ),
    );
  });

  test("Given no state directory When updating Then updater receives empty state without persistence", () => {
    const state = updateHookState(undefined, (current) => ({
      ...current,
      dirtyPaths: ["src/from-updater.ts"],
    }));

    expect(state.dirtyPaths).toEqual(["src/from-updater.ts"]);
  });

  test("Given current lock file When adding dirty paths Then fallback state is returned", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);
    addDirtyPaths(stateDir, ["src/existing.ts"]);
    fs.writeFileSync(path.join(stateDir, "hook-state.lock"), "active-process");

    const state = addDirtyPaths(stateDir, ["src/fallback.ts"]);

    expect(state.dirtyPaths).toEqual(["src/existing.ts", "src/fallback.ts"]);
    expect(loadHookState(stateDir).dirtyPaths).toEqual(["src/existing.ts"]);
  });

  test("Given lock open fails for a non-lock reason When adding dirty paths Then fallback state is returned", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);
    addDirtyPaths(stateDir, ["src/existing.ts"]);
    const originalOpenSync = fs.openSync;
    fs.openSync = () => {
      throw new Error("permission denied");
    };

    try {
      const state = addDirtyPaths(stateDir, ["src/fallback.ts"]);
      expect(state.dirtyPaths).toEqual(["src/existing.ts", "src/fallback.ts"]);
      expect(loadHookState(stateDir).dirtyPaths).toEqual(["src/existing.ts"]);
    } finally {
      fs.openSync = originalOpenSync;
    }
  });

  test("Given stale lock cannot be inspected or removed When adding dirty paths Then fallback state is returned", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);
    addDirtyPaths(stateDir, ["src/existing.ts"]);
    const originalOpenSync = fs.openSync;
    const originalStatSync = fs.statSync;
    const originalUnlinkSync = fs.unlinkSync;
    class ExistingLockError extends Error {
      readonly code = "EEXIST";
    }

    fs.openSync = () => {
      throw new ExistingLockError("lock exists");
    };
    fs.statSync = () => {
      throw new Error("stat failed");
    };

    try {
      expect(
        addDirtyPaths(stateDir, ["src/stat-fallback.ts"]).dirtyPaths,
      ).toEqual(["src/existing.ts", "src/stat-fallback.ts"]);

      fs.statSync = originalStatSync;
      const staleLockPath = path.join(stateDir, "hook-state.lock");
      fs.writeFileSync(staleLockPath, "stale-process");
      const staleDate = new Date(Date.now() - 60_000);
      fs.utimesSync(staleLockPath, staleDate, staleDate);
      fs.unlinkSync = () => {
        throw new Error("unlink stale failed");
      };

      expect(
        addDirtyPaths(stateDir, ["src/unlink-fallback.ts"]).dirtyPaths,
      ).toEqual(["src/existing.ts", "src/unlink-fallback.ts"]);
    } finally {
      fs.openSync = originalOpenSync;
      fs.statSync = originalStatSync;
      fs.unlinkSync = originalUnlinkSync;
    }
  });

  test("Given stale lock file When adding dirty paths Then stale lock is removed and write succeeds", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);
    const staleLockPath = path.join(stateDir, "hook-state.lock");
    fs.writeFileSync(staleLockPath, "crashed-process");
    const staleDate = new Date(Date.now() - 60_000);
    fs.utimesSync(staleLockPath, staleDate, staleDate);

    const state = addDirtyPaths(stateDir, ["src/recovered.ts"]);

    expect(state.dirtyPaths).toEqual(["src/recovered.ts"]);
    expect(fs.existsSync(staleLockPath)).toBe(false);
  });

  test("Given release failures When updating Then state still persists", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);
    const originalCloseSync = fs.closeSync;
    const originalUnlinkSync = fs.unlinkSync;
    fs.closeSync = () => {
      throw new Error("close failed");
    };
    fs.unlinkSync = () => {
      throw new Error("unlink failed");
    };

    try {
      const state = addDirtyPaths(stateDir, ["src/release-failure.ts"]);
      expect(state.dirtyPaths).toEqual(["src/release-failure.ts"]);
      expect(loadHookState(stateDir).dirtyPaths).toEqual([
        "src/release-failure.ts",
      ]);
    } finally {
      fs.closeSync = originalCloseSync;
      fs.unlinkSync = originalUnlinkSync;
      fs.rmSync(path.join(stateDir, "hook-state.lock"), { force: true });
    }
  });

  test("Given non-object state file When loading Then empty state is returned", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);
    fs.writeFileSync(path.join(stateDir, "hook-state.json"), "[]");

    expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);
  });

  test("Given updater throws while locked When updating Then fallback updater result is returned", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);
    addDirtyPaths(stateDir, ["src/existing.ts"]);
    let calls = 0;

    const state = updateHookState(stateDir, (current) => {
      calls += 1;
      if (calls === 1) {
        throw new Error("locked update failed");
      }
      return {
        ...current,
        dirtyPaths: [...current.dirtyPaths, "src/fallback.ts"],
      };
    });

    expect(state.dirtyPaths).toEqual(["src/existing.ts", "src/fallback.ts"]);
  });

  test("Given guided paths When remembering reads and writes Then duplicates and blanks are ignored", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);

    rememberGuidedPath(stateDir, "read", " src\\read.ts ");
    rememberGuidedPath(stateDir, "read", "");
    rememberGuidedPath(stateDir, "write", " src\\write.ts ");

    const state = loadHookState(stateDir);
    expect(hasGuidedPath(state, "read", "src/read.ts")).toBe(true);
    expect(hasGuidedPath(state, "write", "src/write.ts")).toBe(true);
    expect(hasGuidedPath(state, "read", "src/missing.ts")).toBe(false);
  });

  test("Given kb tool activity When recording tools Then check and mutation state is tracked", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);

    recordKbMcpTool(undefined, " ");
    recordKbMcpTool(stateDir, "kb_query");
    recordKbMcpTool(stateDir, "kb_upsert");
    recordKbMcpTool(stateDir, "kb_delete");
    recordKbMcpTool(stateDir, "kb_check", {
      impactCheckRun: true,
      sourceFiles: [" src\\a.ts ", "src/a.ts"],
    });

    expect(loadHookState(stateDir)).toEqual({
      ...EMPTY_HOOK_STATE,
      mcpState: "observed",
      kbMutationTools: ["kb_upsert", "kb_delete"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/a.ts"],
    });
  });

  test("Given CreatePlan When recording plan delivery Then the flag is sticky and idempotent", () => {
    const stateDir = createStateDir();
    stateDirs.push(stateDir);

    expect(recordPlanDelivered(stateDir).planDelivered).toBe(true);
    expect(recordPlanDelivered(stateDir).planDelivered).toBe(true);
    expect(loadHookState(stateDir).planDelivered).toBe(true);
  });
});
