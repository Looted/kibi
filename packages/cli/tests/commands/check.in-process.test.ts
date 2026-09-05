import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkCommand } from "../../src/commands/check.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
  git,
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
      // Staged-only cases never start an engine.
    }
    removeTempDir(root);
  }
});

describe("checkCommand", () => {
  test("returns an error when the workspace is not a git repository", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createTempDir("kibi-check-nongit-");
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => checkCommand({}));
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Error:");
  });

  test("treats empty staged sets as success", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, ".kb", "missing") }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("No staged files found.");
  });

  test("fails staged markdown that embeds another entity type", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-1.md"),
      `---
id: REQ-1
title: Auth
status: open
type: req
scenario: login
---

Body.
`,
    );
    git(cwd, "add .kb/requirements/REQ-1.md");
    const io = captureIo();
    restores.push(io.restore);
    const failed = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(failed.exitCode).toBe(1);
    expect(io.logText()).toContain("embedded entity");

    const dry = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(dry.exitCode).toBe(0);
  });

  test("accepts staged files that have no exported symbols or entities", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeFileSync(path.join(cwd, "notes.txt"), "hello\n");
    git(cwd, "add notes.txt");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toMatch(/No exported symbols|No staged files|No violations/);
  });

  test("runs journaled check as json after init", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, async () => {
      await initCommand({});
      return checkCommand({ format: "json", rules: "required-fields" });
    });
    expect([0, 1]).toContain(result.exitCode);
    expect(io.logText()).toContain("structuredContent");
  });
});
