import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  branchEnsureCommand,
  branchMigrateCommand,
  branchMigrationApprovalHash,
  branchRecoverCommand,
  branchRestoreCommand,
  isSupportedLegacyBranchMigration,
} from "../../src/commands/branch.js";
import {
  branchStorePath,
  expectedBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
});

describe("branch commands", () => {
  test("legacy migration only allows a same-identity move", () => {
    expect(isSupportedLegacyBranchMigration("main", "main")).toBe(true);
    expect(isSupportedLegacyBranchMigration("main", "other")).toBe(false);
  });

  test("hashes a legacy store for approval", () => {
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const source = path.join(cwd, ".kb", "branches", "main");
    mkdirSync(path.join(source, "nested"), { recursive: true });
    writeFileSync(path.join(source, "kb.rdf"), "legacy\n");
    writeFileSync(path.join(source, "nested", "extra.txt"), "x\n");
    const hash = branchMigrationApprovalHash(
      "main",
      "main",
      source,
      path.join(cwd, ".kb", "branches", "target"),
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("ensure creates a hashed store and rejects --from", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    await branchEnsureCommand({ workspaceRoot: cwd });
    const store = branchStorePath(cwd, "main");
    expect(existsSync(path.join(store, "branch.json"))).toBe(true);
    await branchEnsureCommand({ workspaceRoot: cwd });
    expect(io.logText()).toContain("Branch KB already exists");
    await expect(
      branchEnsureCommand({ workspaceRoot: cwd, from: "other" }),
    ).rejects.toThrow("branch ensure --from was removed");
  });

  test("migrate previews and applies a same-identity literal store", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const source = path.join(cwd, ".kb", "branches", "main");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "kb.rdf"), "legacy\n");
    const io = captureIo();
    restores.push(io.restore);

    await expect(branchMigrateCommand({ workspaceRoot: cwd })).rejects.toThrow(
      "requires a valid --from",
    );
    await expect(
      branchMigrateCommand({ workspaceRoot: cwd, from: "main" }),
    ).rejects.toThrow("requires an explicit valid --to");
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "other",
      }),
    ).rejects.toThrow("does not match the active Git branch");

    await branchMigrateCommand({
      workspaceRoot: cwd,
      from: "main",
      to: "main",
    });
    expect(io.logText()).toContain("Preview only");
    const hash = io.logText().match(/Approval hash: ([a-f0-9]{64})/)?.[1];
    expect(hash).toBeDefined();

    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
        apply: true,
      }),
    ).rejects.toThrow("requires --approval-hash");
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
        apply: true,
        approvalHash: "deadbeef",
      }),
    ).rejects.toThrow("approval hash mismatch");

    await branchMigrateCommand({
      workspaceRoot: cwd,
      from: "main",
      to: "main",
      apply: true,
      approvalHash: hash,
    });
    expect(io.logText()).toContain("Migrated branch KB");
    expect(existsSync(branchStorePath(cwd, "main"))).toBe(true);
  });

  test("recover journal preview", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);

    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "bad id",
      }),
    ).rejects.toThrow("journal ID is invalid");

    const journalDir = path.join(cwd, ".kb", "recovery", "branch-migrations");
    mkdirSync(journalDir, { recursive: true });
    writeFileSync(
      path.join(journalDir, "demo.json"),
      JSON.stringify({
        version: 2,
        state: "prepared",
        to: "main",
        sourcePath: ".kb/branches/main",
        targetPath: ".kb/branches/target",
        stagingPath: ".kb/branches/staging",
        backupPath: ".kb/recovery/backup",
      }),
    );
    await branchMigrateCommand({
      workspaceRoot: cwd,
      recoverJournal: "demo",
    });
    expect(io.logText()).toContain("Preview only");
  });

  test("restore validates branch identity and missing quarantine", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd }),
    ).rejects.toThrow("requires a valid --branch");
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "main" }),
    ).rejects.toThrow("No quarantined store found");

    const hashed = path.basename(branchStorePath(cwd, "main"));
    const keyRoot = path.join(cwd, ".kb", "quarantine", "branches", hashed);
    const source = path.join(keyRoot, hashed);
    mkdirSync(source, { recursive: true });
    writeFileSync(
      path.join(source, "quarantine.json"),
      JSON.stringify({ branch: "main" }),
    );
    writeFileSync(
      path.join(source, "branch.json"),
      `${JSON.stringify(expectedBranchStoreManifest("main"), null, 2)}\n`,
    );
    const io = captureIo();
    restores.push(io.restore);
    await branchRestoreCommand({ workspaceRoot: cwd, branch: "main" });
    expect(io.logText()).toContain("Preview only");
  });

  test("recover previews an exact store", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    await branchEnsureCommand({ workspaceRoot: cwd });
    const store = branchStorePath(cwd, "main");
    expect(existsSync(store)).toBe(true);
    writeFileSync(path.join(store, "kb.rdf"), "<rdf:RDF></rdf:RDF>\n");
    await branchRecoverCommand({ workspaceRoot: cwd });
    expect(io.logText()).toContain("Preview only");
  });

  test("ensure is blocked by legacy storage", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "branches", "main", "kb.rdf"), "legacy\n");
    await expect(branchEnsureCommand({ workspaceRoot: cwd })).rejects.toThrow(
      /legacy storage/,
    );
  });

  test("migrate refuses missing sources, existing targets, and journal defects", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
      }),
    ).rejects.toThrow("Legacy source KB does not exist");

    const source = path.join(cwd, ".kb", "branches", "main");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "kb.rdf"), "legacy\n");
    mkdirSync(branchStorePath(cwd, "main"), { recursive: true });
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
      }),
    ).rejects.toThrow("Target branch KB already exists");

    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "missing",
      }),
    ).rejects.toThrow();

    const journalDir = path.join(cwd, ".kb", "recovery", "branch-migrations");
    mkdirSync(journalDir, { recursive: true });
    writeFileSync(
      path.join(journalDir, "old.json"),
      JSON.stringify({ version: 1, state: "prepared" }),
    );
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "old",
        apply: true,
      }),
    ).rejects.toThrow("Unsupported branch migration journal version");

    writeFileSync(
      path.join(journalDir, "escape.json"),
      JSON.stringify({
        version: 2,
        state: "prepared",
        to: "main",
        sourcePath: "../escape",
        targetPath: ".kb/branches/target",
        stagingPath: ".kb/branches/staging",
        backupPath: ".kb/recovery/backup",
      }),
    );
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "escape",
        apply: true,
      }),
    ).rejects.toThrow("escapes workspace");
  });

  test("recover journal apply moves prepared staging into the target", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const source = path.join(cwd, ".kb", "branches", "main");
    const target = branchStorePath(cwd, "main");
    const staging = `${target}.staging`;
    const backup = path.join(cwd, ".kb", "recovery", "backup");
    mkdirSync(source, { recursive: true });
    mkdirSync(staging, { recursive: true });
    writeFileSync(path.join(source, "kb.rdf"), "legacy\n");
    writeFileSync(
      path.join(staging, "branch.json"),
      `${JSON.stringify(expectedBranchStoreManifest("main"), null, 2)}\n`,
    );
    const journalDir = path.join(cwd, ".kb", "recovery", "branch-migrations");
    mkdirSync(journalDir, { recursive: true });
    writeFileSync(
      path.join(journalDir, "apply.json"),
      JSON.stringify({
        version: 2,
        state: "prepared",
        to: "main",
        sourcePath: path.relative(cwd, source),
        targetPath: path.relative(cwd, target),
        stagingPath: path.relative(cwd, staging),
        backupPath: path.relative(cwd, backup),
      }),
    );
    const io = captureIo();
    restores.push(io.restore);
    await branchMigrateCommand({
      workspaceRoot: cwd,
      recoverJournal: "apply",
      apply: true,
    });
    expect(existsSync(target)).toBe(true);
    expect(existsSync(backup)).toBe(true);
    expect(io.logText()).toContain("recovery preview");
  });

  test("restore apply publishes a quarantined store", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const hashed = path.basename(branchStorePath(cwd, "main"));
    const keyRoot = path.join(cwd, ".kb", "quarantine", "branches", hashed);
    const source = path.join(keyRoot, hashed);
    mkdirSync(source, { recursive: true });
    writeFileSync(
      path.join(source, "quarantine.json"),
      JSON.stringify({ branch: "main" }),
    );
    writeFileSync(
      path.join(source, "branch.json"),
      `${JSON.stringify(expectedBranchStoreManifest("main"), null, 2)}\n`,
    );
    const io = captureIo();
    restores.push(io.restore);
    await branchRestoreCommand({
      workspaceRoot: cwd,
      branch: "main",
      apply: true,
    });
    expect(existsSync(branchStorePath(cwd, "main"))).toBe(true);
    expect(io.logText()).toContain("Restored exact branch store");

    await expect(
      branchRestoreCommand({
        workspaceRoot: cwd,
        branch: "main",
        apply: true,
      }),
    ).rejects.toThrow("already exists");
  });

  test("recover refuses missing and legacy attachments", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await expect(
      branchRecoverCommand({ workspaceRoot: cwd }),
    ).rejects.toThrow("Branch KB is missing");

    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "branches", "main", "kb.rdf"), "legacy\n");
    await expect(
      branchRecoverCommand({ workspaceRoot: cwd }),
    ).rejects.toThrow(/exact Git\/KB attachment|migrate legacy/);
  });

  test("recover journal apply covers committed, incomplete, and conflicting states", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const journalDir = path.join(cwd, ".kb", "recovery", "branch-migrations");
    mkdirSync(journalDir, { recursive: true });
    writeFileSync(
      path.join(journalDir, "done.json"),
      JSON.stringify({
        version: 2,
        state: "committed",
        to: "main",
        sourcePath: ".kb/branches/main",
        targetPath: ".kb/branches/target",
        stagingPath: ".kb/branches/staging",
        backupPath: ".kb/recovery/backup",
      }),
    );
    await branchMigrateCommand({
      workspaceRoot: cwd,
      recoverJournal: "done",
      apply: true,
    });

    writeFileSync(
      path.join(journalDir, "incomplete.json"),
      JSON.stringify({
        version: 2,
        state: "prepared",
        to: "main",
        sourcePath: ".kb/branches/missing-source",
        targetPath: ".kb/branches/missing-target",
        stagingPath: ".kb/branches/missing-staging",
        backupPath: ".kb/recovery/missing-backup",
      }),
    );
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "incomplete",
        apply: true,
      }),
    ).rejects.toThrow(/remains incomplete/);

    const source = path.join(cwd, ".kb", "branches", "main");
    const target = branchStorePath(cwd, "main");
    mkdirSync(source, { recursive: true });
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(source, "kb.rdf"), "legacy\n");
    writeFileSync(path.join(target, "kb.rdf"), "hashed\n");
    writeFileSync(
      path.join(journalDir, "conflict.json"),
      JSON.stringify({
        version: 2,
        state: "prepared",
        to: "main",
        sourcePath: path.relative(cwd, source),
        targetPath: path.relative(cwd, target),
        stagingPath: ".kb/branches/staging-conflict",
        backupPath: ".kb/recovery/backup-conflict",
      }),
    );
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "conflict",
        apply: true,
      }),
    ).rejects.toThrow(/both legacy source and target/);
  });

  test("restore skips malformed quarantine metadata and rejects identity mismatch", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const hashed = path.basename(branchStorePath(cwd, "main"));
    const keyRoot = path.join(cwd, ".kb", "quarantine", "branches", hashed);
    const bad = path.join(keyRoot, "bad");
    const good = path.join(keyRoot, "good");
    mkdirSync(bad, { recursive: true });
    mkdirSync(good, { recursive: true });
    writeFileSync(path.join(bad, "quarantine.json"), "{not json");
    writeFileSync(
      path.join(good, "quarantine.json"),
      JSON.stringify({ branch: "main" }),
    );
    writeFileSync(path.join(good, "branch.json"), "{}\n");
    const io = captureIo();
    restores.push(io.restore);
    await branchRestoreCommand({ workspaceRoot: cwd, branch: "main" });
    expect(io.logText()).toContain("Preview only");
    await expect(
      branchRestoreCommand({
        workspaceRoot: cwd,
        branch: "main",
        apply: true,
      }),
    ).rejects.toThrow(/identity mismatch/);
  });

  test("ensure fails outside git", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const nongit = createTempDir("kibi-branch-nongit-");
    roots.push(nongit);
    await expect(branchEnsureCommand({ workspaceRoot: nongit })).rejects.toThrow(
      /Failed to resolve active branch/,
    );
  });
});
