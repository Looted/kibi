// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  branchEnsureCommand,
  branchMigrateCommand,
  branchMigrationApprovalHash,
  branchRecoverCommand,
  branchRestoreCommand,
} from "../../src/commands/branch.js";
import * as syncModule from "../../src/commands/sync.js";
import { EngineClient, engineSocketPath } from "../../src/engine.js";
import * as locator from "../../src/utils/branch-store-locator.js";
import {
  branchStorePath,
  expectedBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import {
  captureIo,
  createGitWorkspace,
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
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
});

function preparedWorkspace(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

function writeLegacyStore(cwd: string, branch = "main"): string {
  const source = path.join(cwd, ".kb", "branches", branch);
  mkdirSync(source, { recursive: true });
  writeFileSync(path.join(source, "kb.rdf"), "legacy\n");
  return source;
}

function writeJournal(
  cwd: string,
  id: string,
  journal: Record<string, unknown>,
): void {
  const journalDir = path.join(cwd, ".kb", "recovery", "branch-migrations");
  mkdirSync(journalDir, { recursive: true });
  writeFileSync(
    path.join(journalDir, `${id}.json`),
    JSON.stringify(journal, null, 2),
  );
}

describe("branch commands remaining runtime branches", () => {
  test("ensure creates a store from process.cwd when workspaceRoot is omitted", async () => {
    const cwd = preparedWorkspace();
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => branchEnsureCommand());
    expect(existsSync(branchStorePath(cwd, "main"))).toBe(true);
    expect(io.logText()).toContain("Created branch KB");
  });

  test("migrate refuses a cross-identity move even when --to matches the active branch", async () => {
    const cwd = preparedWorkspace();
    writeLegacyStore(cwd, "other");
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "other",
        to: "main",
      }),
    ).rejects.toThrow("same-identity literal-to-hashed");
  });

  test("migrate fails when the active branch cannot be resolved", async () => {
    const cwd = preparedWorkspace();
    process.env.KIBI_BRANCH = "bad name";
    restores.push(() => {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    });
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
      }),
    ).rejects.toThrow("Failed to resolve active branch");
  });

  test("migrate apply stops a reachable engine before moving the store", async () => {
    const cwd = preparedWorkspace();
    const source = writeLegacyStore(cwd);
    const io = captureIo();
    restores.push(io.restore);
    await branchMigrateCommand({
      workspaceRoot: cwd,
      from: "main",
      to: "main",
    });
    const hash = io.logText().match(/Approval hash: ([a-f0-9]{64})/)?.[1];
    expect(hash).toBeDefined();
    const socket = engineSocketPath(cwd, "main");
    mkdirSync(path.dirname(socket), { recursive: true });
    writeFileSync(socket, "");
    const start = spyOn(EngineClient.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const stop = spyOn(EngineClient.prototype, "stop").mockResolvedValue(
      undefined as never,
    );
    const isRunning = spyOn(EngineClient.prototype, "isRunning").mockReturnValue(
      true,
    );
    const terminate = spyOn(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    restores.push(() => {
      start.mockRestore();
      stop.mockRestore();
      isRunning.mockRestore();
      terminate.mockRestore();
    });
    await branchMigrateCommand({
      workspaceRoot: cwd,
      from: "main",
      to: "main",
      apply: true,
      approvalHash: hash,
    });
    expect(existsSync(branchStorePath(cwd, "main"))).toBe(true);
    expect(start).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    expect(source).toBeDefined();
  });

  test("migrate apply refuses a leftover unreachable engine socket", async () => {
    const cwd = preparedWorkspace();
    writeLegacyStore(cwd);
    const hash = branchMigrationApprovalHash(
      "main",
      "main",
      path.join(cwd, ".kb", "branches", "main"),
      branchStorePath(cwd, "main"),
    );
    const socket = engineSocketPath(cwd, "main");
    mkdirSync(path.dirname(socket), { recursive: true });
    writeFileSync(socket, "");
    const start = spyOn(EngineClient.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const isRunning = spyOn(EngineClient.prototype, "isRunning").mockReturnValue(
      false,
    );
    const terminate = spyOn(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    restores.push(() => {
      start.mockRestore();
      isRunning.mockRestore();
      terminate.mockRestore();
    });
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
        apply: true,
        approvalHash: hash,
      }),
    ).rejects.toThrow("not reachable");
  });

  test("migrate apply wraps engine shutdown failures", async () => {
    const cwd = preparedWorkspace();
    writeLegacyStore(cwd);
    const hash = branchMigrationApprovalHash(
      "main",
      "main",
      path.join(cwd, ".kb", "branches", "main"),
      branchStorePath(cwd, "main"),
    );
    const socket = engineSocketPath(cwd, "main");
    mkdirSync(path.dirname(socket), { recursive: true });
    writeFileSync(socket, "");
    const start = spyOn(EngineClient.prototype, "start").mockRejectedValue(
      "socket exploded",
    );
    const isRunning = spyOn(EngineClient.prototype, "isRunning").mockReturnValue(
      false,
    );
    const terminate = spyOn(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    restores.push(() => {
      start.mockRestore();
      isRunning.mockRestore();
      terminate.mockRestore();
    });
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
        apply: true,
        approvalHash: hash,
      }),
    ).rejects.toThrow("engine shutdown failed");
  });

  test("migrate apply refuses a source that changes after engine shutdown", async () => {
    const cwd = preparedWorkspace();
    const source = writeLegacyStore(cwd);
    const hash = branchMigrationApprovalHash(
      "main",
      "main",
      source,
      branchStorePath(cwd, "main"),
    );
    const socket = engineSocketPath(cwd, "main");
    mkdirSync(path.dirname(socket), { recursive: true });
    writeFileSync(socket, "");
    const start = spyOn(EngineClient.prototype, "start").mockImplementation(
      (async () => {
        writeFileSync(path.join(source, "kb.rdf"), "changed-after-stop\n");
      }) as never,
    );
    const stop = spyOn(EngineClient.prototype, "stop").mockResolvedValue(
      undefined as never,
    );
    const isRunning = spyOn(EngineClient.prototype, "isRunning").mockReturnValue(
      true,
    );
    const terminate = spyOn(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    restores.push(() => {
      start.mockRestore();
      stop.mockRestore();
      isRunning.mockRestore();
      terminate.mockRestore();
    });
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
        apply: true,
        approvalHash: hash,
      }),
    ).rejects.toThrow("source changed after engine shutdown");
  });

  test("migrate apply leaves a journal when the published manifest does not match", async () => {
    const cwd = preparedWorkspace();
    writeLegacyStore(cwd);
    const hash = branchMigrationApprovalHash(
      "main",
      "main",
      path.join(cwd, ".kb", "branches", "main"),
      branchStorePath(cwd, "main"),
    );
    const matches = spyOn(locator, "branchStoreManifestMatches").mockReturnValue(
      false,
    );
    restores.push(() => matches.mockRestore());
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        from: "main",
        to: "main",
        apply: true,
        approvalHash: hash,
      }),
    ).rejects.toThrow("recover");
  });

  test("recover apply rebuilds from authored sources and writes an audit", async () => {
    const cwd = preparedWorkspace();
    await branchEnsureCommand({ workspaceRoot: cwd });
    writeFileSync(
      path.join(branchStorePath(cwd, "main"), "kb.rdf"),
      "not-rdf\n",
    );
    const io = captureIo();
    restores.push(io.restore);
    const sync = spyOn(syncModule, "syncCommand")
      .mockResolvedValueOnce({ success: false } as never)
      .mockResolvedValueOnce({ success: true } as never)
      .mockResolvedValueOnce({ success: false } as never)
      .mockResolvedValue({ success: true } as never);
    restores.push(() => sync.mockRestore());
    await expect(
      branchRecoverCommand({ workspaceRoot: cwd, apply: true }),
    ).rejects.toThrow("did not complete successfully");
    await expect(
      branchRecoverCommand({ workspaceRoot: cwd, apply: true }),
    ).rejects.toThrow("fresh checkpoint");
    await branchRecoverCommand({ workspaceRoot: cwd, apply: true });
    expect(io.logText()).toContain("Recovered exact branch KB");
    expect(
      existsSync(path.join(cwd, ".kb", "migrations", "main.recovery.json")),
    ).toBe(true);
  });

  test("recover fails when the active branch cannot be resolved", async () => {
    const cwd = preparedWorkspace();
    process.env.KIBI_BRANCH = "bad name";
    restores.push(() => {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    });
    await expect(
      branchRecoverCommand({ workspaceRoot: cwd }),
    ).rejects.toThrow("Failed to resolve active branch");
  });

  test("recover journal restores a verified backup when the published target is invalid", async () => {
    const cwd = preparedWorkspace();
    const target = branchStorePath(cwd, "main");
    const backup = path.join(cwd, ".kb", "recovery", "backup-invalid");
    mkdirSync(target, { recursive: true });
    mkdirSync(backup, { recursive: true });
    writeFileSync(path.join(target, "kb.rdf"), "bad-target\n");
    writeFileSync(
      path.join(backup, "branch.json"),
      `${JSON.stringify(expectedBranchStoreManifest("main"), null, 2)}\n`,
    );
    writeJournal(cwd, "invalid-target", {
      version: 2,
      state: "legacy_quarantined",
      to: "main",
      sourcePath: ".kb/branches/main",
      targetPath: path.relative(cwd, target),
      stagingPath: ".kb/branches/missing-staging",
      backupPath: path.relative(cwd, backup),
    });
    const matches = spyOn(locator, "branchStoreManifestMatches").mockReturnValue(
      false,
    );
    restores.push(() => matches.mockRestore());
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "invalid-target",
        apply: true,
      }),
    ).rejects.toThrow("verified legacy backup restored");
  });

  test("recover journal refuses a published staging store with the wrong identity", async () => {
    const cwd = preparedWorkspace();
    const source = writeLegacyStore(cwd);
    const target = branchStorePath(cwd, "main");
    const staging = `${target}.staging-identity`;
    const backup = path.join(cwd, ".kb", "recovery", "backup-identity");
    mkdirSync(staging, { recursive: true });
    writeFileSync(path.join(staging, "branch.json"), "{}\n");
    writeJournal(cwd, "bad-staging", {
      version: 2,
      state: "prepared",
      to: "main",
      sourcePath: path.relative(cwd, source),
      targetPath: path.relative(cwd, target),
      stagingPath: path.relative(cwd, staging),
      backupPath: path.relative(cwd, backup),
    });
    await expect(
      branchMigrateCommand({
        workspaceRoot: cwd,
        recoverJournal: "bad-staging",
        apply: true,
      }),
    ).rejects.toThrow("does not match the exact branch identity");
  });

  test("restore from process.cwd previews when no quarantine key exists", async () => {
    const cwd = preparedWorkspace();
    await expect(withCwd(cwd, () => branchRestoreCommand({ branch: "main" }))).rejects.toThrow(
      "No quarantined store found",
    );
  });

  test("skips quarantined stores whose metadata cannot be parsed", async () => {
    const cwd = preparedWorkspace();
    const keyRoot = path.join(
      cwd,
      ".kb",
      "quarantine",
      "branches",
      path.basename(branchStorePath(cwd, "main")),
    );
    mkdirSync(path.join(keyRoot, "broken"), { recursive: true });
    writeFileSync(path.join(keyRoot, "broken", "quarantine.json"), "{not json");
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "main" }),
    ).rejects.toThrow("No quarantined store found");
  });
});
