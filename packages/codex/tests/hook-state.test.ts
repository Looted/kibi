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

  test("ignores legacy lock files while reading journal state", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    const staleLockPath = path.join(pluginData, "hook-state.lock");

    fs.writeFileSync(staleLockPath, "crashed-process");
    const staleDate = new Date(Date.now() - 60_000);
    fs.utimesSync(staleLockPath, staleDate, staleDate);

    addDirtyPaths(pluginData, ["src/recovered.ts"]);

    expect(loadHookState(pluginData).dirtyPaths).toEqual(["src/recovered.ts"]);
    expect(fs.existsSync(staleLockPath)).toBe(true);
  });

  test("ignores incomplete journal entries", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    fs.writeFileSync(
      path.join(pluginData, "hook-state.events.jsonl"),
      '{"kind":"add_dirty_paths","dirtyPaths":["src/complete.ts"]}\n{"kind":"add_dirty_paths"',
    );

    expect(loadHookState(pluginData).dirtyPaths).toEqual(["src/complete.ts"]);
  });

  test("persists clear as an ordered journal event", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    addDirtyPaths(pluginData, ["src/existing.ts"]);
    expect(clearDirtyPaths(pluginData)).toEqual(EMPTY_HOOK_STATE);
    addDirtyPaths(pluginData, ["src/after-clear.ts"]);
    expect(loadHookState(pluginData).dirtyPaths).toEqual([
      "src/after-clear.ts",
    ]);
  });

  test("surfaces journal persistence failures instead of claiming success", () => {
    const pluginData = createPluginData();
    pluginDataRoots.push(pluginData);
    const originalAppendFileSync = fs.appendFileSync;
    fs.appendFileSync = () => {
      throw new Error("journal unavailable");
    };

    try {
      expect(() => addDirtyPaths(pluginData, ["src/lost.ts"])).toThrow(
        "journal unavailable",
      );
    } finally {
      fs.appendFileSync = originalAppendFileSync;
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
    expect(recordKbMcpTool(pluginData, "kb_query")).toEqual(EMPTY_HOOK_STATE);
    expect(loadHookState(pluginData)).toEqual(EMPTY_HOOK_STATE);
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
