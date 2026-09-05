import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
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

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

describe("initCommand remaining branches", () => {
  test("reports a standalone workspace that is not a git repo", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createTempDir();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => initCommand({}));
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Failed to resolve the active git branch");
    expect(io.errorText()).toContain("KIBI_BRANCH");
  });

  test("blocks init when legacy branch storage still owns the attachment", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "branches", "main", "kb.rdf"), "legacy\n");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => initCommand({}));
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("legacy branch storage");
  });

  test("reuses an existing .kb tree, recreates a missing manifest, and installs hooks", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const io = captureIo();
    restores.push(io.restore);
    const first = await withCwd(cwd, () => initCommand({ hooks: true }));
    expect(first.exitCode).toBe(0);
    expect(io.logText()).toContain(".kb/ directory already exists");
    expect(io.logText()).toContain("Installed git hooks");
    expect(io.logText()).toContain("Existing Kibi source knowledge was preserved");
  });

  test("warns when hooks are requested outside a git tree", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    process.env.KIBI_BRANCH = "main";
    const cwd = createTempDir();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => initCommand({ hooks: true }));
    expect(result.exitCode).toBe(0);
    expect(io.errorText()).toContain("No git repository found, skipping hooks");
  });

  test("scaffolds GitHub integration after a fresh init", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    git(cwd, "remote add origin https://github.com/Acme/Widgets.git");
    writeFileSync(path.join(cwd, "README.md"), "# Widgets\n");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      initCommand({ github: true, badgeOnly: false }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("Kibi initialized");
    expect(io.logText()).toContain("Added .github/workflows/kibi-report.yml");
    expect(readFileSync(path.join(cwd, "README.md"), "utf8")).toContain(
      "https://acme.github.io/widgets/kibi-report/badge.svg",
    );
  });

  test("returns exit 1 when initialization throws", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeFileSync(path.join(cwd, ".kb"), "not-a-directory\n");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => initCommand({}));
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Error during initialization");
  });
});
