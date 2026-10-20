import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  engineStatusCommand,
  engineStopCommand,
  parentPid,
  storageCompactCommand,
  storageExportCommand,
  storageStatusCommand,
} from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Fixture may not have started an engine.
    }
    removeTempDir(root);
  }
});

describe("engine commands", () => {
  test("stop is a no-op when no daemon is running", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => engineStopCommand());
    expect(io.logText()).toContain("No Kibi engine answered at");
    expect(io.logText()).not.toContain("Kibi engine stopped");
    expect(io.logText()).not.toContain("still held by");
  });

  test("status reports the current branch after init", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, async () => {
      await initCommand({});
      await engineStatusCommand();
      await storageStatusCommand();
    });
    expect(io.logText()).toContain("running");
    expect(io.logText()).toContain("main");
  });

  test("compact and export operate on an initialized store", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const output = path.join(cwd, "export.tgz");
    await withCwd(cwd, async () => {
      await initCommand({});
      await storageCompactCommand();
      await storageExportCommand({ output });
    });
    expect(io.logText()).toContain("Kibi storage compacted");
    expect(io.logText()).toContain("Exported Kibi storage");
  });

  test("compact is blocked by a legacy branch attachment", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "branches", "main", "kb.rdf"),
      "legacy\n",
    );
    await expect(withCwd(cwd, () => storageCompactCommand())).rejects.toThrow(
      /Storage compaction blocked by legacy attachment/,
    );
  });
});

describe("parentPid", () => {
  test.skipIf(process.platform === "win32")(
    "names the process that started a lock holder",
    async () => {
      const child = spawn("sleep", ["30"], { stdio: "ignore" });
      try {
        expect(child.pid).toBeDefined();
        expect(parentPid(child.pid as number)).toBe(process.pid);
      } finally {
        child.kill();
      }
      expect(parentPid(2 ** 22 + 12345)).toBeNull();
    },
  );
});
