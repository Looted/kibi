import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
  saveHookState,
} from "../src/hook-state";

const EMPTY_HOOK_STATE = {
  dirtyPaths: [],
  kbCheckRun: false,
  impactCheckRun: false,
  impactCheckedPaths: [],
};

function createPluginData(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kibi-codex-hook-state-"));
}

const pluginDataRoots: string[] = [];

afterEach(() => {
  for (const root of pluginDataRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("Codex hook state", () => {
  test("tolerates missing and corrupt state files", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);

    expect(loadHookState(pluginData)).toEqual(EMPTY_HOOK_STATE);

    fs.writeFileSync(path.join(pluginData, "hook-state.json"), "not json");
    expect(loadHookState(pluginData)).toEqual(EMPTY_HOOK_STATE);

    fs.writeFileSync(path.join(pluginData, "hook-state.json"), "[]");
    expect(loadHookState(pluginData)).toEqual(EMPTY_HOOK_STATE);
  });

  test("returns empty state for undefined plugin data", () => {
    expect(loadHookState(undefined)).toEqual(EMPTY_HOOK_STATE);
    saveHookState(undefined, {
      dirtyPaths: ["src/ignored.ts"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/ignored.ts"],
    });
    expect(addDirtyPaths(undefined, [" src\\fallback.ts "])).toEqual({
      ...EMPTY_HOOK_STATE,
      dirtyPaths: ["src/fallback.ts"],
    });
    expect(
      recordKbMcpTool(undefined, "kb_check", {
        impactCheckRun: true,
        sourceFiles: ["src/fallback.ts"],
      }),
    ).toEqual({
      ...EMPTY_HOOK_STATE,
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/fallback.ts"],
    });
    expect(clearDirtyPaths(undefined)).toEqual(EMPTY_HOOK_STATE);
  });

  test("normalizes saved state flags and impact checked paths", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);

    saveHookState(pluginData, {
      dirtyPaths: [" src\\a.ts ", "", "src/a.ts"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: [" src\\a.ts ", "src/a.ts"],
    });

    expect(loadHookState(pluginData)).toEqual({
      dirtyPaths: ["src/a.ts"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/a.ts"],
    });
  });

  test("stores dirty paths as a bounded unique list", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);

    addDirtyPaths(pluginData, ["src/a.ts", "src/a.ts", "docs/a.md"]);
    addDirtyPaths(
      pluginData,
      Array.from({ length: 80 }, (_, index) => `src/generated-${index}.ts`),
    );

    const state = loadHookState(pluginData);
    expect(state.dirtyPaths).toHaveLength(50);
    expect(new Set(state.dirtyPaths).size).toBe(state.dirtyPaths.length);
    expect(state.dirtyPaths.at(-1)).toBe("src/generated-79.ts");
  });

  test("recovers from stale lock files", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    const staleLockPath = path.join(pluginData, "hook-state.lock");

    fs.writeFileSync(staleLockPath, "crashed-process");
    const staleDate = new Date(Date.now() - 60_000);
    fs.utimesSync(staleLockPath, staleDate, staleDate);

    addDirtyPaths(pluginData, ["src/recovered.ts"]);

    expect(loadHookState(pluginData).dirtyPaths).toEqual(["src/recovered.ts"]);
    expect(fs.existsSync(staleLockPath)).toBe(false);
  });

  test("falls back when lock acquisition fails or stale lock removal fails", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    addDirtyPaths(pluginData, ["src/existing.ts"]);
    const originalOpenSync = fs.openSync;
    const originalUnlinkSync = fs.unlinkSync;
    class ExistingLockError extends Error {
      readonly code = "EEXIST";
    }

    fs.openSync = () => {
      throw new Error("permission denied");
    };
    try {
      expect(addDirtyPaths(pluginData, ["src/no-lock.ts"]).dirtyPaths).toEqual([
        "src/existing.ts",
        "src/no-lock.ts",
      ]);
    } finally {
      fs.openSync = originalOpenSync;
    }

    const staleLockPath = path.join(pluginData, "hook-state.lock");
    fs.writeFileSync(staleLockPath, "stale-process");
    const staleDate = new Date(Date.now() - 60_000);
    fs.utimesSync(staleLockPath, staleDate, staleDate);
    fs.openSync = () => {
      throw new ExistingLockError("lock exists");
    };
    fs.unlinkSync = () => {
      throw new Error("unlink stale failed");
    };

    try {
      expect(
        addDirtyPaths(pluginData, ["src/stale-unlink.ts"]).dirtyPaths,
      ).toEqual(["src/existing.ts", "src/stale-unlink.ts"]);
    } finally {
      fs.openSync = originalOpenSync;
      fs.unlinkSync = originalUnlinkSync;
    }
  });

  test("falls back when an existing lock cannot be inspected", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    addDirtyPaths(pluginData, ["src/existing.ts"]);
    const originalOpenSync = fs.openSync;
    const originalStatSync = fs.statSync;
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
      expect(addDirtyPaths(pluginData, ["src/stat-fallback.ts"])).toEqual({
        dirtyPaths: ["src/existing.ts", "src/stat-fallback.ts"],
        kbCheckRun: false,
        impactCheckRun: false,
        impactCheckedPaths: [],
      });
    } finally {
      fs.openSync = originalOpenSync;
      fs.statSync = originalStatSync;
    }
  });

  test("falls back without persistence when active locks block record and clear", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    addDirtyPaths(pluginData, ["src/existing.ts"]);
    fs.writeFileSync(
      path.join(pluginData, "hook-state.lock"),
      "active-process",
    );

    expect(
      recordKbMcpTool(pluginData, "kb_check", {
        impactCheckRun: true,
        sourceFiles: ["src/checked.ts"],
      }),
    ).toEqual({
      dirtyPaths: ["src/existing.ts"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/checked.ts"],
    });
    expect(clearDirtyPaths(pluginData)).toEqual(EMPTY_HOOK_STATE);
    expect(loadHookState(pluginData).dirtyPaths).toEqual(["src/existing.ts"]);
  });

  test("falls back when locked add and record writes throw", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    addDirtyPaths(pluginData, ["src/existing.ts"]);
    const originalRenameSync = fs.renameSync;
    fs.renameSync = () => {
      throw new Error("rename failed");
    };

    try {
      expect(addDirtyPaths(pluginData, ["src/add-fallback.ts"])).toEqual({
        dirtyPaths: ["src/existing.ts", "src/add-fallback.ts"],
        kbCheckRun: false,
        impactCheckRun: false,
        impactCheckedPaths: [],
      });
      expect(
        recordKbMcpTool(pluginData, "kb_check", {
          impactCheckRun: true,
          sourceFiles: ["src/record-fallback.ts"],
        }),
      ).toEqual({
        dirtyPaths: ["src/existing.ts"],
        kbCheckRun: true,
        impactCheckRun: true,
        impactCheckedPaths: ["src/record-fallback.ts"],
      });
    } finally {
      fs.renameSync = originalRenameSync;
    }
  });

  test("returns cleared state when locked clear write throws", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    addDirtyPaths(pluginData, ["src/existing.ts"]);
    const originalRenameSync = fs.renameSync;
    fs.renameSync = () => {
      throw new Error("rename failed");
    };

    try {
      expect(clearDirtyPaths(pluginData)).toEqual(EMPTY_HOOK_STATE);
      expect(loadHookState(pluginData).dirtyPaths).toEqual(["src/existing.ts"]);
    } finally {
      fs.renameSync = originalRenameSync;
    }
  });

  test("ignores release failures after successful writes", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    const originalCloseSync = fs.closeSync;
    const originalUnlinkSync = fs.unlinkSync;
    fs.closeSync = () => {
      throw new Error("close failed");
    };
    fs.unlinkSync = () => {
      throw new Error("unlink failed");
    };

    try {
      expect(addDirtyPaths(pluginData, ["src/release.ts"]).dirtyPaths).toEqual([
        "src/release.ts",
      ]);
    } finally {
      fs.closeSync = originalCloseSync;
      fs.unlinkSync = originalUnlinkSync;
      fs.rmSync(path.join(pluginData, "hook-state.lock"), { force: true });
    }
  });

  test("records only kb_check tool state and ignores blanks or other tools", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);

    expect(recordKbMcpTool(undefined, " ")).toEqual(EMPTY_HOOK_STATE);
    recordKbMcpTool(pluginData, "kb_query");
    recordKbMcpTool(pluginData, "kb_check", {
      impactCheckRun: true,
      sourceFiles: [" src\\a.ts ", "src/a.ts"],
    });

    expect(loadHookState(pluginData)).toEqual({
      dirtyPaths: [],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/a.ts"],
    });
  });

  test("preserves dirty paths from concurrent process writes", async () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);

    const workerCount = 40;
    const startFile = path.join(pluginData, "start");
    const workerScript = path.join(pluginData, "concurrent-worker.ts");
    const hookStateModule = fileURLToPath(
      new URL("../src/hook-state.ts", import.meta.url),
    );

    fs.writeFileSync(
      workerScript,
      [
        `import { addDirtyPaths } from ${JSON.stringify(hookStateModule)};`,
        `const pluginData = ${JSON.stringify(pluginData)};`,
        `const startFile = ${JSON.stringify(startFile)};`,
        "const dirtyPath = process.argv[2];",
        "if (!dirtyPath) process.exit(2);",
        "while (!await Bun.file(startFile).exists()) {",
        "  await Bun.sleep(1);",
        "}",
        "addDirtyPaths(pluginData, [dirtyPath]);",
      ].join("\n"),
    );

    const workers = Array.from({ length: workerCount }, (_, index) =>
      Bun.spawn(["bun", workerScript, `src/concurrent-${index}.ts`], {
        stdout: "pipe",
        stderr: "pipe",
      }),
    );

    fs.writeFileSync(startFile, "go");

    const exits = await Promise.all(workers.map((worker) => worker.exited));
    expect(exits).toEqual(Array.from({ length: workerCount }, () => 0));

    const dirtyPaths = loadHookState(pluginData).dirtyPaths;
    expect(dirtyPaths).toHaveLength(workerCount);
    expect(new Set(dirtyPaths).size).toBe(workerCount);
    for (let index = 0; index < workerCount; index++) {
      expect(dirtyPaths).toContain(`src/concurrent-${index}.ts`);
    }
  });
});
