import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gcCommand } from "../../src/commands/gc.js";
import {
  branchStoreKey,
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

function writeLegacyStore(cwd: string, branch: string): string {
  const store = path.join(cwd, ".kb", "branches", branch);
  mkdirSync(store, { recursive: true });
  writeFileSync(path.join(store, "kb.rdf"), "legacy\n");
  return store;
}

describe("gcCommand", () => {
  test("reports when no branch stores exist", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace("keep-branch");
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => gcCommand({}));
    expect(process.exitCode ?? 0).toBe(0);
    expect(io.logText()).toContain("No branch KBs found");
  });

  test("dry-run lists stale stores and force quarantines them", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace("keep-branch");
    roots.push(cwd);
    writeLegacyStore(cwd, "keep-branch");
    writeLegacyStore(cwd, "old-branch");
    writeLegacyStore(cwd, "nested/stale");
    const io = captureIo();
    restores.push(io.restore);

    await withCwd(cwd, () => gcCommand({ dryRun: true }));
    expect(io.logText()).toMatch(/Found \d+ stale branch KB/);
    expect(io.logText()).toContain("old-branch");

    await withCwd(cwd, () => gcCommand({ force: true }));
    expect(io.logText()).toContain("Quarantined old-branch");
    const quarantine = path.join(
      cwd,
      ".kb",
      "quarantine",
      "branches",
      branchStoreKey("old-branch"),
    );
    expect(await import("node:fs").then((fs) => fs.existsSync(quarantine))).toBe(
      true,
    );

    writeFileSync(path.join(quarantine, "not-a-dir"), "file\n");
    await withCwd(cwd, () => gcCommand({ purge: true, retentionDays: 0 }));
    expect(io.logText()).toMatch(/Purged \d+ quarantined branch store/);
  });

  test("keeps live branches and reports git listing failures", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace("keep-branch");
    roots.push(cwd);
    writeLegacyStore(cwd, "keep-branch");
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => gcCommand({ force: true }));
    expect(io.logText()).not.toContain("Quarantined keep-branch");

    const orphan = createTempDir("kibi-gc-orphan-");
    roots.push(orphan);
    mkdirSync(path.join(orphan, ".kb", "branches"), { recursive: true });
    await withCwd(orphan, () => gcCommand({ force: true }));
    expect(process.exitCode).toBe(1);
    expect(io.errorText()).toContain("Branch GC failed");
  });

  test("falls back to directory mtime when quarantine metadata is malformed", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace("keep-branch");
    roots.push(cwd);
    const keyRoot = path.join(
      cwd,
      ".kb",
      "quarantine",
      "branches",
      "deadbeef",
    );
    const candidate = path.join(keyRoot, "2020-01-01T00-00-00.000Z");
    mkdirSync(candidate, { recursive: true });
    writeFileSync(path.join(candidate, "quarantine.json"), "{not json", "utf8");
    mkdirSync(path.join(cwd, ".kb", "branches"), { recursive: true });
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => gcCommand({ purge: true, retentionDays: 0 }));
    expect(io.logText()).toContain("Purged 1");
  });

  test("enumerates hashed branch stores from their identity manifest", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace("keep-branch");
    roots.push(cwd);
    writeLegacyStore(cwd, "keep-branch");
    const hashed = branchStorePath(cwd, "stale-hashed");
    mkdirSync(hashed, { recursive: true });
    writeFileSync(
      path.join(hashed, "branch.json"),
      `${JSON.stringify(expectedBranchStoreManifest("stale-hashed"), null, 2)}\n`,
    );
    writeFileSync(path.join(hashed, "kb.rdf"), "hashed\n");
    writeFileSync(path.join(cwd, ".kb", "branches", "not-a-dir"), "file\n");
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => gcCommand({}));
    expect(io.logText()).toContain("stale-hashed");
    expect(io.logText()).toContain(hashed);
  });
});
