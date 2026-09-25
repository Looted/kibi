import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { doctorCommand } from "../../src/commands/doctor.js";
import {
  captureIo,
  createGitWorkspace,
  git,
  isolateKibiEnv,
  makeExecutable,
  removeTempDir,
  withCwd,
  writeHook,
} from "../helpers/in-process-workspace.js";

// executable_for TEST-git-hook-effective-install
// Doctor must diagnose the hooks directory Git executes (effective path,
// honoring core.hooksPath and linked worktrees), freshly on every invocation.

describe("doctor effective hooks context", () => {
  let restores: Array<() => void>;
  let roots: string[];

  beforeEach(() => {
    restores = [];
    roots = [];
    restores.push(isolateKibiEnv());
  });

  afterEach(() => {
    for (const restore of restores.reverse()) restore();
    for (const root of roots) removeTempDir(root);
  });

  function track<T extends string>(dir: T): T {
    roots.push(dir);
    return dir;
  }

  function isolateGitConfig(): void {
    const globalConfig = path.join(
      os.tmpdir(),
      `kibi-doctor-global-${Date.now()}-${Math.random().toString(36).slice(2)}.config`,
    );
    writeFileSync(globalConfig, "", "utf8");
    process.env.GIT_CONFIG_GLOBAL = globalConfig;
    process.env.GIT_CONFIG_SYSTEM = "/dev/null";
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    restores.push(() => delete process.env.GIT_CONFIG_GLOBAL);
    restores.push(() => delete process.env.GIT_CONFIG_SYSTEM);
    restores.push(() => delete process.env.GIT_CONFIG_NOSYSTEM);
  }

  function installManagedHooks(cwd: string): void {
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
  }

  test("agrees between the repository root and a subdirectory", async () => {
    const cwd = track(createGitWorkspace());
    installManagedHooks(cwd);

    const ioRoot = captureIo();
    restores.push(ioRoot.restore);
    const rootResult = await withCwd(cwd, () =>
      doctorCommand({ format: "json" }),
    );
    expect(ioRoot.logText()).toContain("Installed and executable");

    const sub = path.join(cwd, "sub");
    mkdirSync(sub, { recursive: true });
    const ioSub = captureIo();
    restores.push(ioSub.restore);
    const subResult = await withCwd(sub, () => doctorCommand({ format: "json" }));
    expect(subResult).toBeDefined();
    expect(ioSub.logText()).toContain("Installed and executable");
  });

  test("sees a core.hooksPath change between in-process invocations", async () => {
    isolateGitConfig();
    const cwd = track(createGitWorkspace());
    installManagedHooks(cwd);

    const before = captureIo();
    restores.push(before.restore);
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(before.logText()).not.toContain("core.hooksPath=");

    git(cwd, "config core.hooksPath .githooks");

    const after = captureIo();
    restores.push(after.restore);
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(after.logText()).toContain("core.hooksPath=.githooks");
  });

  test("matches the primary checkout verdict from a linked worktree", async () => {
    const primary = track(createGitWorkspace());
    // Create the worktree before installing hooks: the shared post-checkout
    // hook needs a resolvable kibi binary, which is out of scope here.
    const linked = path.join(primary, "..", "linked-wt");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    roots.push(linked);
    installManagedHooks(primary);

    const ioLinked = captureIo();
    restores.push(ioLinked.restore);
    await withCwd(linked, () => doctorCommand({ format: "json" }));
    expect(ioLinked.logText()).toContain("Installed and executable");
  });

  test("keeps configuration visible when hooks are missing", async () => {
    isolateGitConfig();
    const cwd = track(createGitWorkspace());
    git(cwd, "config core.hooksPath .githooks");

    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    expect(io.logText()).toContain("core.hooksPath=.githooks");
    expect(io.logText()).toContain("Not installed (optional)");
  });
});
