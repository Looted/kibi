import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { noGitAdvisory } from "kibi-agent-core/version-control";
import { initCommand } from "../../src/commands/init.js";
import { finishCliTelemetry } from "../../src/usage-telemetry.js";
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
  test("initializes a workspace outside Git and advises Git", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createTempDir();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => initCommand({}));
    expect(result.exitCode).toBe(0);
    expect(existsSync(path.join(cwd, ".kb", "manifest.json"))).toBe(true);
    expect(io.logText()).toContain(`! ${noGitAdvisory("not_a_repository")}`);
    await finishCliTelemetry({
      commandPath: undefined,
      packageVersion: "0.0.0",
      startedAt: new Date(),
      exitCode: 0,
    });
  });

  test("skips hooks outside a git tree and names the KIBI_BRANCH store", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    process.env.KIBI_BRANCH = "main";
    const cwd = createTempDir();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => initCommand({ hooks: true }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain(
      "- Git hooks: not installed; this directory has no Git repository",
    );
    expect(io.logText()).toContain(
      `! ${noGitAdvisory("not_a_repository", "main")}`,
    );
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
    expect(io.logText()).not.toContain("No Git repository here");
    expect(io.logText()).toContain("Added .github/workflows/kibi-report.yml");
    expect(readFileSync(path.join(cwd, "README.md"), "utf8")).toContain(
      "https://acme.github.io/Widgets/kibi-report/badge.svg",
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
