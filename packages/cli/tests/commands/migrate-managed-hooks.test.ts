import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  KIBI_HOOK_BEGIN,
  installGitHooks,
  managedHookTemplatesDigest,
  outdatedManagedHooks,
  refreshManagedHooks,
} from "../../src/commands/init-helpers.js";
import { migrateCommand } from "../../src/commands/migrate.js";
import {
  MANAGED_HOOKS_REFRESH_ACTION_ID,
  MANAGED_HOOKS_REFRESH_CODE,
  findOutdatedManagedHooks,
  managedHooksRefreshAction,
  refreshOutdatedManagedHooks,
} from "../../src/operations/migration/managed-hooks.js";
import { applyMigrationAction } from "../../src/operations/planning/apply-plan.js";
import { migrationAction } from "../../src/public/operations/migration-plan.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  defaultKbManifest,
  writeKbManifest,
} from "../../src/utils/kb-manifest.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

// executable_for TEST-cli-migrate-managed-hooks-refresh
// Checkouts whose kibi-managed hook sections another CLI build wrote: migrate
// rewrites them by content on the --yes and plan routes, keeps user lines,
// and leaves hook managers' hooks and unmanaged hooks alone.

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

const USER_LINE = "echo 'project lint' # user-authored";

function hooksDir(cwd: string): string {
  return path.join(cwd, ".git", "hooks");
}

function hookText(cwd: string, hook: string): string {
  return readFileSync(path.join(hooksDir(cwd), hook), "utf8");
}

/**
 * A checkout whose hooks were installed by another CLI build: the managed
 * sections lack a line this CLI's templates carry, as the pre-commit gate
 * did before `check-generated` joined it, and pre-commit keeps a
 * user-authored line outside the section.
 */
function workspaceWithStaleHooks(): string {
  restores.push(isolateKibiEnv());
  const cwd = createGitWorkspace();
  roots.push(cwd);
  writeKbManifest(cwd, defaultKbManifest());
  installGitHooks(hooksDir(cwd), { log: () => undefined });
  for (const hook of ["post-checkout", "post-merge", "post-rewrite"]) {
    const file = path.join(hooksDir(cwd), hook);
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace(
        `${KIBI_HOOK_BEGIN}\n`,
        `${KIBI_HOOK_BEGIN}\n# written by an older build\n`,
      ),
    );
  }
  const preCommit = path.join(hooksDir(cwd), "pre-commit");
  writeFileSync(
    preCommit,
    `${readFileSync(preCommit, "utf8").replace(
      /^.*check-generated.*\n/m,
      "",
    )}${USER_LINE}\n`,
  );
  return cwd;
}

function io() {
  const captured = captureIo();
  restores.push(captured.restore);
  return captured;
}

const ALL_HOOKS = ["post-checkout", "post-merge", "post-rewrite", "pre-commit"];

describe("kibi migrate refreshes outdated kibi-managed hook sections", () => {
  test("--yes rewrites the sections by content and keeps user lines", async () => {
    const cwd = workspaceWithStaleHooks();
    expect(outdatedManagedHooks(hooksDir(cwd))).toEqual(ALL_HOOKS);

    const out = io();
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });

    expect(result.exitCode).toBe(0);
    expect(out.logText()).toContain(
      `Refreshed the kibi-managed sections of ${ALL_HOOKS.join(", ")} to this Kibi CLI's template.`,
    );
    expect(outdatedManagedHooks(hooksDir(cwd))).toEqual([]);
    expect(hookText(cwd, "pre-commit")).toContain("check-generated");
    expect(hookText(cwd, "pre-commit")).toContain(USER_LINE);
    expect(hookText(cwd, "post-merge")).not.toContain("older build");

    // A second run has nothing left to refresh.
    const again = io();
    await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(again.logText()).not.toContain("Refreshed the kibi-managed");
  });

  test("--dry-run names the outdated hooks and changes none", async () => {
    const cwd = workspaceWithStaleHooks();
    const before = hookText(cwd, "pre-commit");
    const out = io();
    await migrateCommand({ dryRun: true, workspaceRoot: cwd });
    expect(out.logText()).toContain(
      `Would refresh the kibi-managed sections of ${ALL_HOOKS.join(", ")}`,
    );
    expect(hookText(cwd, "pre-commit")).toBe(before);
  });

  test("the plan carries one automatic refresh action that --apply-safe applies", async () => {
    const cwd = workspaceWithStaleHooks();
    const planned = io();
    await migrateCommand({ format: "json", workspaceRoot: cwd });
    const plan = JSON.parse(planned.logText());
    const action = plan.actions.find(
      (candidate: { id: string }) =>
        candidate.id === MANAGED_HOOKS_REFRESH_ACTION_ID,
    );
    expect(action).toMatchObject({
      code: MANAGED_HOOKS_REFRESH_CODE,
      category: "hooks",
      safety: "automatic",
      autoApplicable: true,
      state: "ready",
      evidence: {
        hooks: ALL_HOOKS,
        templateDigest: managedHookTemplatesDigest(),
      },
    });
    planned.restore();

    io();
    const applied = await migrateCommand({
      applySafe: plan.planHash,
      approvedActionIds: [MANAGED_HOOKS_REFRESH_ACTION_ID],
      workspaceRoot: cwd,
    });
    expect(applied.exitCode).toBe(0);
    expect(outdatedManagedHooks(hooksDir(cwd))).toEqual([]);
    expect(hookText(cwd, "pre-commit")).toContain(USER_LINE);
  });

  test("a hook manager's checkout gets no refresh", async () => {
    const cwd = workspaceWithStaleHooks();
    writeFileSync(
      path.join(cwd, "lefthook.yml"),
      "pre-commit:\n  commands: {}\n",
    );
    const before = hookText(cwd, "pre-commit");
    expect(findOutdatedManagedHooks(cwd)).toBeNull();
    io();
    await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(hookText(cwd, "pre-commit")).toBe(before);
  });

  test("current sections, no Git work tree and an external hooks directory plan nothing", () => {
    restores.push(isolateKibiEnv());
    const current = createGitWorkspace();
    roots.push(current);
    installGitHooks(hooksDir(current), { log: () => undefined });
    expect(findOutdatedManagedHooks(current)).toBeNull();

    const plain = createTempDir();
    roots.push(plain);
    expect(findOutdatedManagedHooks(plain)).toBeNull();

    const external = createGitWorkspace();
    roots.push(external);
    const outside = createTempDir();
    roots.push(outside);
    installGitHooks(outside, { log: () => undefined });
    writeFileSync(
      path.join(outside, "post-merge"),
      `#!/bin/sh\n${KIBI_HOOK_BEGIN}\nstale\n# END kibi-managed\n`,
    );
    execFileSync("git", ["config", "core.hooksPath", outside], {
      cwd: external,
    });
    expect(findOutdatedManagedHooks(external)).toBeNull();
  });

  test("an unreadable hook counts as nothing to refresh", () => {
    restores.push(isolateKibiEnv());
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(hooksDir(cwd), "pre-commit"), { recursive: true });
    expect(findOutdatedManagedHooks(cwd)).toBeNull();
  });

  test("a symlinked outdated hook is reported as skipped, not followed", () => {
    const cwd = workspaceWithStaleHooks();
    const target = path.join(cwd, "shared-pre-commit");
    writeFileSync(target, hookText(cwd, "pre-commit"));
    const link = path.join(hooksDir(cwd), "pre-commit");
    removeTempDir(link);
    symlinkSync(target, link);
    chmodSync(target, 0o755);
    const outdated = findOutdatedManagedHooks(cwd);
    expect(outdated?.hooks).toContain("pre-commit");
    const result = refreshOutdatedManagedHooks(
      outdated as NonNullable<typeof outdated>,
    );
    expect(result.skipped).toEqual(["pre-commit"]);
    expect(result.refreshed).toEqual([
      "post-checkout",
      "post-merge",
      "post-rewrite",
    ]);
    expect(readFileSync(target, "utf8")).not.toContain("check-generated");
  });

  test("refreshManagedHooks never installs a hook without a managed section", () => {
    restores.push(isolateKibiEnv());
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(hooksDir(cwd), { recursive: true });
    writeFileSync(
      path.join(hooksDir(cwd), "post-merge"),
      "#!/bin/sh\necho mine\n",
    );
    expect(
      refreshManagedHooks(hooksDir(cwd), ["post-merge", "pre-commit"]),
    ).toEqual([]);
    expect(hookText(cwd, "post-merge")).toBe("#!/bin/sh\necho mine\n");
  });
});

describe("applying the planned refresh", () => {
  function context(cwd: string): OperationContext {
    return { workspaceRoot: cwd } as OperationContext;
  }

  test("refuses a plan built against another hook template", async () => {
    const cwd = workspaceWithStaleHooks();
    const outdated = findOutdatedManagedHooks(cwd);
    const action = migrationAction(
      managedHooksRefreshAction({
        ...(outdated as NonNullable<typeof outdated>),
        templateDigest: "0".repeat(64),
      }),
    );
    await expect(applyMigrationAction(action, context(cwd))).rejects.toThrow(
      "The Kibi hook template changed after this plan was built",
    );
    expect(outdatedManagedHooks(hooksDir(cwd))).toEqual(ALL_HOOKS);
  });

  test("reports current sections and fails on a hook it cannot refresh", async () => {
    const cwd = workspaceWithStaleHooks();
    const outdated = findOutdatedManagedHooks(cwd);
    const action = migrationAction(
      managedHooksRefreshAction(outdated as NonNullable<typeof outdated>),
    );
    expect(await applyMigrationAction(action, context(cwd))).toBe(
      `Refreshed the kibi-managed hook sections of ${ALL_HOOKS.join(", ")}.`,
    );
    expect(await applyMigrationAction(action, context(cwd))).toBe(
      "Kibi-managed hook sections are already current.",
    );

    const stale = workspaceWithStaleHooks();
    const target = path.join(stale, "shared-pre-commit");
    writeFileSync(target, hookText(stale, "pre-commit"));
    removeTempDir(path.join(hooksDir(stale), "pre-commit"));
    symlinkSync(target, path.join(hooksDir(stale), "pre-commit"));
    await expect(applyMigrationAction(action, context(stale))).rejects.toThrow(
      "Could not refresh the kibi-managed section of pre-commit",
    );
  });

  test("migrate --yes warns about a hook it cannot refresh", async () => {
    const cwd = workspaceWithStaleHooks();
    const target = path.join(cwd, "shared-pre-commit");
    writeFileSync(target, hookText(cwd, "pre-commit"));
    removeTempDir(path.join(hooksDir(cwd), "pre-commit"));
    symlinkSync(target, path.join(hooksDir(cwd), "pre-commit"));
    const out = io();
    await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(out.logText()).toContain(
      "Warning: Could not refresh the kibi-managed section of pre-commit",
    );
  });
});
