import { afterEach, describe, expect, test } from "bun:test";
import path from "node:path";
import {
  engineStatusCommand,
  engineStopCommand,
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
    expect(io.logText()).toContain("Kibi engine stopped");
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
});
