import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { migrateCommand } from "../../src/commands/migrate.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
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
      // Plan-only fixtures never start an engine.
    }
    removeTempDir(root);
  }
});

function writeManifest(
  cwd: string,
  schemaVersion: number | string,
  extra: Record<string, unknown> = {},
): void {
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion,
      semanticAdvisorBackfill: "not_applicable",
      ...extra,
    }),
  );
}

describe("migrateCommand", () => {
  test("fails when lifecycle state is missing", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({
      yes: true,
      workspaceRoot: cwd,
    });
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Missing .kb/ lifecycle state");
  });

  test("fails outside git without an explicit branch", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createTempDir("kibi-migrate-nongit-");
    roots.push(cwd);
    writeManifest(cwd, 4);
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Not in a git repository");
  });

  test("dry-runs schema and storage cutover then applies with --yes", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "config.json"),
      JSON.stringify({ schemaVersion: 1 }),
    );
    mkdirSync(path.join(cwd, "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, "requirements", "REQ-1.md"),
      `---
id: REQ-1
title: Auth
status: open
---
`,
    );
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "auth.ts"),
      "export function login() { return true; }\nexport function logout() { return false; }\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-auth
    title: auth
    sourceFile: src/auth.ts
    status: active
    relationships:
      - type: implements
        to: REQ-1
`,
    );
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({
      dryRun: true,
      yes: true,
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    expect(io.logText()).toContain("dry run");

    const applied = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(applied.exitCode).toBe(0);
    expect(io.logText()).toContain("Migrated the KB");

    const again = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(again.exitCode).toBe(0);
    expect(io.logText()).toContain("No migration needed");
  });

  test("rejects future schema versions", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeManifest(cwd, 99);
    const io = captureIo();
    restores.push(io.restore);
    const future = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(future.exitCode).toBe(1);
    expect(io.errorText()).toContain("Unsupported schemaVersion");
  });

  test("apply-safe requires an approval hash", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({
      applySafe: true,
      workspaceRoot: cwd,
    });
    expect(result.exitCode).toBe(2);
    expect(io.errorText()).toContain("--apply-safe requires --approved-plan-hash");
  });

  test("emits a json plan and rejects a stale apply-safe hash", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({
      format: "json",
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    const plan = JSON.parse(io.logText());
    expect(plan.planHash).toMatch(/^[a-f0-9]{64}$/);

    const stale = await migrateCommand({
      applySafe: true,
      approvedPlanHash: "deadbeef",
      workspaceRoot: cwd,
    });
    expect(stale.exitCode).toBe(2);
    expect(io.errorText()).toContain("Migration plan changed");

    const applied = await migrateCommand({
      applySafe: true,
      approvedPlanHash: plan.planHash,
      workspaceRoot: cwd,
    });
    expect(applied.exitCode).toBe(0);
    expect(io.logText()).toMatch(/No approved automatic migration actions|Migration applied|outcome/);
  });

  test("prints a text plan when neither --yes nor --dry-run is set", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeManifest(cwd, 4);
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ workspaceRoot: cwd });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("Migration plan");
    expect(io.logText()).toContain("--apply-safe");
  });

  test("blocks on malformed legacy config and invalid manifests", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "config.json"), "{not json", "utf8");
    const io = captureIo();
    restores.push(io.restore);
    const blocked = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(blocked.exitCode).toBe(1);
    expect(io.errorText()).toContain("Blocked");
  });

  test("initializeMissingConfig writes a baseline manifest", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({
      yes: true,
      initializeMissingConfig: true,
      workspaceRoot: cwd,
    });
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Missing .kb/ lifecycle state");
  });
});
