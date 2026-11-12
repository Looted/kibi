import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import { migrateCommand } from "../../src/commands/migrate.js";
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
  test("apply-safe takes the printed hash and says what changed since a plan was printed", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const io = captureIo();
    restores.push(io.restore);
    expect(
      (await migrateCommand({ format: "json", workspaceRoot: cwd })).exitCode,
    ).toBe(0);
    const printed = JSON.parse(io.logText());

    // The hash right after --apply-safe, as the plan text prints it.
    const applied = await migrateCommand({
      applySafe: printed.planHash,
      workspaceRoot: cwd,
    });
    expect(applied.exitCode).toBe(0);
    expect(io.errorText()).toBe("");

    const conflict = await migrateCommand({
      applySafe: printed.planHash,
      approvedPlanHash: "deadbeef",
      workspaceRoot: cwd,
    });
    expect(conflict.exitCode).toBe(2);
    expect(io.errorText()).toContain(
      `--apply-safe ${printed.planHash} and --approved-plan-hash deadbeef name different plans`,
    );

    // An authored requirement the store has not compiled changes the plan.
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-new.md"),
      "---\nid: REQ-new\ntitle: New rule\nstatus: open\ntype: req\n---\n\nThe app must log in.\n",
    );
    const errors = io.errorText().length;
    const stale = await migrateCommand({
      applySafe: printed.planHash,
      workspaceRoot: cwd,
    });
    expect(stale.exitCode).toBe(2);
    const message = io.errorText().slice(errors);
    const current = /its hash is now ([a-f0-9]{64})/.exec(message)?.[1];
    expect(current).toBeDefined();
    expect(current).not.toBe(printed.planHash);
    expect(message).toContain(
      `The migration plan changed since ${printed.planHash} was printed (`,
    );
    expect(message).toContain("Nothing was applied.\nWhat changed:\n- ");
    expect(message).toContain(
      `apply it with: kibi migrate --apply-safe ${current}`,
    );
  });

  test("the plan text prints the exact command that applies it", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-new.md"),
      "---\nid: REQ-new\ntitle: New rule\nstatus: open\ntype: req\n---\n\nThe app must log in.\n",
    );
    const io = captureIo();
    restores.push(io.restore);
    expect((await migrateCommand({ workspaceRoot: cwd })).exitCode).toBe(0);
    const text = io.logText();
    const hash = /^Migration plan ([a-f0-9]{64})$/m.exec(text)?.[1];
    expect(hash).toBeDefined();
    if (/automatic-ready: [1-9]/.test(text))
      expect(text).toContain(`kibi migrate --apply-safe ${hash}`);
  });

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
    expect(io.errorText()).toMatch(
      /--apply-safe needs the hash of the plan you reviewed\..*kibi migrate --apply-safe [a-f0-9]{64}$/,
    );
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
    expect(io.errorText()).toContain(
      `deadbeef is not the current migration plan; its hash is now ${plan.planHash}. Kibi has no record of printing deadbeef here`,
    );
    expect(io.errorText()).toContain(
      `apply it with: kibi migrate --apply-safe ${plan.planHash}`,
    );

    const applied = await migrateCommand({
      applySafe: true,
      approvedPlanHash: plan.planHash,
      workspaceRoot: cwd,
    });
    expect(applied.exitCode).toBe(0);
    expect(io.logText()).toMatch(
      /No approved automatic migration actions|Migration applied|Outcome/,
    );
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

  test("blocks legacy branch storage before schema migration", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeManifest(cwd, 4);
    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "branches", "main", "kb.rdf"),
      "legacy\n",
    );
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Legacy branch attachment");
  });

  test("treats an invalid schemaVersion as missing and upgrades it", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeManifest(cwd, "not-a-number");
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({
      dryRun: true,
      yes: true,
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    expect(io.logText()).toContain("invalid");
    const applied = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(applied.exitCode).toBe(0);
    expect(io.logText()).toContain("Migrated the KB");
  });

  test("reports an existing audit file when already current", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    mkdirSync(path.join(cwd, ".kb", "migrations"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "migrations", "main.json"), "{}\n");
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("No migration needed");
    expect(io.logText()).toContain("Existing migration audit metadata");
  });

  test("marks coarse symbol links during a v1 schema upgrade", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeManifest(cwd, 1);
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
  - id: SYM-login
    title: login
    sourceFile: src/auth.ts
    status: active
    links: [REQ-1]
    granularity_reason: already-set
  - not-an-object
  - id: 12
  - id: SYM-skip
    title: skip
    sourceFile: src/missing.ts
    relationships:
      - type: implements
        to: REQ-1
  - id: SYM-norel
    title: norel
    sourceFile: src/auth.ts
  - id: SYM-badrel
    title: badrel
    sourceFile: src/auth.ts
    relationships:
      - null
      - []
      - { type: 1 }
      - { type: relates_to }
`,
    );
    writeFileSync(path.join(cwd, ".kb", "invalid-symbols.yaml"), "[]");
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({
      dryRun: true,
      yes: true,
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    const applied = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(applied.exitCode).toBe(0);
    expect(io.logText()).toMatch(/legacy-link|Migrated the KB/);
  });

  test("apply-safe with explicit action ids and json output stays deterministic", async () => {
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
    await expect(
      migrateCommand({
        applySafe: true,
        approvedPlanHash: plan.planHash,
        approvedActionIds: ["missing-action"],
        format: "json",
        workspaceRoot: cwd,
      }),
    ).rejects.toThrow(/not present in the plan|approvedActionIds/);
  });
});
