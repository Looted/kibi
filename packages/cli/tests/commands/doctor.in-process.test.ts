import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { doctorCommand } from "../../src/commands/doctor.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  makeExecutable,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
  writeHook,
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
      // Doctor fixtures do not always start an engine.
    }
    removeTempDir(root);
  }
});

describe("doctorCommand", () => {
  test("fails outside a git repository without .kb", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "table" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain(".kb/");
    expect(io.logText()).toContain("Some checks failed");
  });

  test("emits json diagnostics after init and reports passing checks", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(io.logText());
    expect(payload.version).toBe("kibi.doctor.v1");
    expect(payload.passed).toBe(true);
    expect(payload.checks.some((check: { name: string }) => check.name === "SWI-Prolog")).toBe(
      true,
    );
  });

  test("detects an invalid manifest", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{not json", "utf8");
    const io = captureIo();
    restores.push(io.restore);
    const invalid = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(invalid.exitCode).toBe(1);
    expect(io.logText()).toContain("Invalid manifest");
  });

  test("detects a future manifest version", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 99,
        schemaVersion: 5,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    const io = captureIo();
    restores.push(io.restore);
    const future = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(future.exitCode).toBe(1);
    expect(io.logText()).toContain("Future version");
  });

  test("detects leftover legacy config", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 5,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    writeFileSync(path.join(cwd, ".kb", "config.json"), "{}\n");
    const io = captureIo();
    restores.push(io.restore);
    const legacy = await withCwd(cwd, () => doctorCommand({ format: "table" }));
    expect(legacy.exitCode).toBe(1);
    expect(io.logText()).toContain("Legacy .kb/config.json");
  });

  test("classifies git hook installation states", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const io = captureIo();
    restores.push(io.restore);

    writeHook(cwd, "post-checkout", "#!/bin/sh\necho checkout\n");
    const partial = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(partial.exitCode).toBe(1);
    expect(io.logText()).toContain("Partially installed");

    writeHook(cwd, "post-merge", "#!/bin/sh\necho merge\n");
    const notExecutable = await withCwd(cwd, () =>
      doctorCommand({ format: "json" }),
    );
    expect(notExecutable.exitCode).toBe(1);
    expect(io.logText()).toContain("not executable");

    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    writeHook(cwd, "pre-commit", "#!/bin/sh\necho no kibi\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const noKibi = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(noKibi.exitCode).toBe(1);
    expect(io.logText()).toContain("does not invoke kibi");

    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    writeHook(cwd, "post-rewrite", "#!/bin/sh\necho rewrite\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const rewrite = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(rewrite.exitCode).toBe(1);
    expect(io.logText()).toContain("does not invoke kibi");

    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const ready = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(ready.exitCode).toBe(0);
  });

  test("prints the all-checks-passed table after init", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "table" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("All checks passed");
  });

  test("detects malformed legacy config, missing git, and unparseable swipl", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 5,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    writeFileSync(path.join(cwd, ".kb", "config.json"), "{not json", "utf8");
    const io = captureIo();
    restores.push(io.restore);
    const malformed = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(malformed.exitCode).toBe(1);
    expect(io.logText()).toContain("malformed");

    const originalExec = childProcess.execSync;
    const exec = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
      options?: unknown,
    ) => {
      if (String(command).includes("swipl")) {
        return "SWI-Prolog threaded\n";
      }
      return originalExec(command, options as never);
    }) as typeof childProcess.execSync);
    restores.push(() => exec.mockRestore());
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(io.logText()).toContain("Unable to parse version");

    exec.mockImplementation(((command: string, options?: unknown) => {
      if (String(command).includes("swipl")) {
        return "SWI-Prolog version 8.2\n";
      }
      return originalExec(command, options as never);
    }) as typeof childProcess.execSync);
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(io.logText()).toContain("requires ≥9.0");

    exec.mockImplementation((() => {
      throw new Error("not found");
    }) as typeof childProcess.execSync);
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(io.logText()).toContain("Not installed or not in PATH");
    expect(io.logText()).toContain("Not a git repository");
  });

  test("reports missing optional hook companions", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 5,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    const io = captureIo();
    restores.push(io.restore);
    const missing = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(missing.exitCode).toBe(1);
    expect(io.logText()).toContain("Not installed");

    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    const rewriteNotExec = await withCwd(cwd, () =>
      doctorCommand({ format: "json" }),
    );
    expect(rewriteNotExec.exitCode).toBe(1);
    expect(io.logText()).toContain("not executable");
  });

  test("reports hook permission failures when statSync throws", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 5,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const original = childProcess.execSync;
    const fs = await import("node:fs");
    const originalStat = fs.statSync;
    const stat = spyOn(fs, "statSync").mockImplementation(((
      target: fs.PathLike,
      options?: unknown,
    ) => {
      if (String(target).includes(`${path.sep}.git${path.sep}hooks${path.sep}`)) {
        throw new Error("EACCES");
      }
      return originalStat(target, options as never);
    }) as typeof fs.statSync);
    restores.push(() => stat.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Unable to check hook permissions");
    expect(original).toBeDefined();
  });

  test("passes a legacy pre-commit hook that invokes kibi check without --staged", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check\n");
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("legacy 'kibi check'");
  });

  test("emits package provenance actions when CLI metadata is unknown or mismatched", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const fs = await import("node:fs");
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const file = String(target);
      if (file.endsWith(`${path.sep}packages${path.sep}cli${path.sep}package.json`)) {
        return JSON.stringify({
          name: "kibi-cli",
          version: "dev",
          dependencies: { "kibi-core": "^1.0.0" },
        });
      }
      if (
        file.includes(`${path.sep}mcp${path.sep}package.json`) ||
        file.includes(`${path.sep}kibi-mcp${path.sep}package.json`)
      ) {
        return JSON.stringify({
          name: "kibi-mcp",
          version: "1.0.0",
          main: "dist/server.js",
          dependencies: { "kibi-cli": "^9.9.9" },
        });
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toMatch(/package-provenance-unresolved|package-mcp-cli-range-mismatch|dev/);
  });
});
