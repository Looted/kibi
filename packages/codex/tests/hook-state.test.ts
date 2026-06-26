import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addDirtyPaths, loadHookState } from "../src/hook-state";

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
