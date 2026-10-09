import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { doctorCommand } from "../../src/commands/doctor.js";
import { installGitHooks } from "../../src/commands/init-helpers.js";
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

interface DoctorCheck {
  name: string;
  passed?: boolean;
  message: string;
  remediation?: string;
}

const HOOK_CHECK_NAMES = [
  "Git hooks",
  "pre-commit hook",
  "post-rewrite hook",
] as const;

function hookChecks(io: { logs: string[] }): DoctorCheck[] {
  const parsed = JSON.parse(io.logs[0] ?? "{}") as { checks?: DoctorCheck[] };
  return (parsed.checks ?? []).filter((check) =>
    (HOOK_CHECK_NAMES as readonly string[]).includes(check.name),
  );
}

function checkByName(
  checks: DoctorCheck[],
  name: (typeof HOOK_CHECK_NAMES)[number],
): DoctorCheck {
  const check = checks.find((entry) => entry.name === name);
  expect(check, `doctor reported no "${name}" check`).toBeDefined();
  return check as DoctorCheck;
}

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
    restores.push(() => {
      rmSync(globalConfig, { force: true });
      Reflect.deleteProperty(process.env, "GIT_CONFIG_GLOBAL");
      Reflect.deleteProperty(process.env, "GIT_CONFIG_SYSTEM");
      Reflect.deleteProperty(process.env, "GIT_CONFIG_NOSYSTEM");
    });
  }

  function installManagedHooks(cwd: string): void {
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
  }

  async function doctorAt(cwd: string): Promise<ReturnType<typeof captureIo>> {
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => doctorCommand({ format: "json" }));
    return io;
  }

  test("agrees between the repository root and a subdirectory", async () => {
    const cwd = track(createGitWorkspace());
    installManagedHooks(cwd);

    const ioRoot = await doctorAt(cwd);
    expect(ioRoot.logText()).toContain("Installed and executable");

    const sub = path.join(cwd, "sub");
    mkdirSync(sub, { recursive: true });
    const ioSub = await doctorAt(sub);

    // The root/sub agreement claim covers the concrete hook checks: each
    // verdict must be identical, not merely present.
    for (const name of HOOK_CHECK_NAMES) {
      const rootCheck = checkByName(hookChecks(ioRoot), name);
      const subCheck = checkByName(hookChecks(ioSub), name);
      expect(subCheck).toEqual(rootCheck);
    }
    expect(checkByName(hookChecks(ioRoot), "Git hooks").passed).toBe(true);
    expect(checkByName(hookChecks(ioRoot), "Git hooks").message).toContain(
      "Installed and executable",
    );
  });

  test("sees a core.hooksPath change between in-process invocations", async () => {
    isolateGitConfig();
    const cwd = track(createGitWorkspace());
    installManagedHooks(cwd);

    const before = await doctorAt(cwd);
    const beforeCheck = checkByName(hookChecks(before), "Git hooks");
    expect(beforeCheck.message).not.toContain("core.hooksPath=");

    git(cwd, "config core.hooksPath .githooks");

    const after = await doctorAt(cwd);
    const afterCheck = checkByName(hookChecks(after), "Git hooks");
    expect(afterCheck.passed).toBe(beforeCheck.passed);
    expect(afterCheck.message).toContain("core.hooksPath=.githooks");
    expect(afterCheck.message).toContain(" from file:");
    expect(afterCheck.message).not.toBe(beforeCheck.message);
  });

  test("matches the primary checkout verdict from a linked worktree", async () => {
    const primary = track(createGitWorkspace());
    // Create the worktree before installing hooks: the shared post-checkout
    // hook needs a resolvable kibi binary, which is out of scope here.
    const linked = path.join(primary, "..", "linked-wt");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    roots.push(linked);
    installManagedHooks(primary);

    const ioLinked = await doctorAt(linked);
    const ioPrimary = await doctorAt(primary);

    const linkedCheck = checkByName(hookChecks(ioLinked), "Git hooks");
    const primaryCheck = checkByName(hookChecks(ioPrimary), "Git hooks");
    expect(linkedCheck).toEqual(primaryCheck);
    expect(linkedCheck.passed).toBe(true);
    expect(linkedCheck.message).toContain("Installed and executable");
    // The verdicts come from the shared common hooks directory.
    expect(linkedCheck.message).toBe(primaryCheck.message);
  });

  test("keeps configuration visible when hooks are missing", async () => {
    isolateGitConfig();
    const cwd = track(createGitWorkspace());
    git(cwd, "config core.hooksPath .githooks");

    const io = await doctorAt(cwd);
    const check = checkByName(hookChecks(io), "Git hooks");
    expect(check.passed).toBe(true);
    expect(check.message).toContain("Not installed:");
    expect(check.message).toContain("core.hooksPath=.githooks");
  });

  test("diagnoses lone hooks instead of reporting them absent", async () => {
    const cwd = track(createGitWorkspace());
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));

    const io = await doctorAt(cwd);
    const checks = hookChecks(io);
    expect(checkByName(checks, "Git hooks").message).toContain(
      "Partially installed",
    );
    for (const name of ["pre-commit hook", "post-rewrite hook"] as const) {
      const check = checkByName(checks, name);
      expect(check.passed).toBe(true);
      expect(check.message).toContain("Installed and executable");
      expect(check.message).not.toContain("Not installed (optional)");
    }
  });

  test("compares kibi-managed hook sections at the effective hooks path", async () => {
    const cwd = track(createGitWorkspace());
    git(cwd, "config core.hooksPath .githooks");
    const effective = path.join(cwd, ".githooks");
    installGitHooks(effective);

    const managedSections = (io: { logs: string[] }): DoctorCheck => {
      const parsed = JSON.parse(io.logs[0] ?? "{}") as {
        checks?: DoctorCheck[];
      };
      const check = (parsed.checks ?? []).find(
        (entry) => entry.name === "Kibi-managed hook sections",
      );
      expect(check).toBeDefined();
      return check as DoctorCheck;
    };
    expect(managedSections(await doctorAt(cwd)).passed).toBe(true);

    // A pre-commit section written before the generated-manifest gate joined
    // the template still runs, so only a template comparison reveals it.
    const preCommit = path.join(effective, "pre-commit");
    writeFileSync(
      preCommit,
      readFileSync(preCommit, "utf8").replace(
        '"$KIBI_BIN" check-generated --staged --changed-only\n',
        "",
      ),
    );
    const outdated = managedSections(await doctorAt(cwd));
    expect(outdated.passed).toBe(false);
    expect(outdated.message).toContain("pre-commit");
    expect(outdated.message).toContain("core.hooksPath=.githooks");
  });
});
