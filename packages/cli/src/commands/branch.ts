/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  EngineClient,
  acquireEnginePublicationLease,
  engineSocketPath,
} from "../engine.js";
import {
  getBranchDiagnostic,
  isValidBranchName,
  resolveActiveBranch,
  resolveBranchAttachment,
} from "../utils/branch-resolver.js";
import {
  branchStoreManifestMatches,
  branchStoreManifestPath,
  branchStorePath,
  branchStoresRoot,
  ensureBranchStoreManifest,
  expectedBranchStoreManifest,
  legacyBranchStorePath,
  readBranchStoreManifest,
} from "../utils/branch-store-locator.js";
import { inspectBranchStore } from "../utils/branch-store.js";

export interface BranchEnsureOptions {
  from?: string;
  workspaceRoot?: string;
}

export interface BranchMigrateOptions {
  from?: string;
  to?: string;
  apply?: boolean;
  /** Hash-bound preview approval required for every mutating migration. */
  approvalHash?: string;
  recoverJournal?: string;
  workspaceRoot?: string;
}

export interface BranchRecoverOptions {
  apply?: boolean;
  workspaceRoot?: string;
}

export interface BranchRestoreOptions {
  branch?: string;
  apply?: boolean;
  workspaceRoot?: string;
}

function hashLegacyStore(sourcePath: string): string {
  const hash = createHash("sha256");
  const visit = (directory: string, relative = ""): void => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      const child = relative ? path.join(relative, entry.name) : entry.name;
      if (entry.isDirectory()) visit(absolute, child);
      else if (entry.isFile()) {
        hash.update(child.replaceAll(path.sep, "/"));
        hash.update("\0");
        hash.update(fs.readFileSync(absolute));
        hash.update("\0");
      }
    }
  };
  visit(sourcePath);
  return hash.digest("hex");
}

export function branchMigrationApprovalHash(
  from: string,
  to: string,
  sourcePath: string,
  targetPath: string,
): string {
  const sourceHash = hashLegacyStore(sourcePath);
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: 2,
        from,
        to,
        sourcePath,
        targetPath,
        sourceHash,
        manifestVersion: expectedBranchStoreManifest(to).version,
      }),
    )
    .digest("hex");
}

function migrationJournalPath(workspaceRoot: string, id: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) {
    throw new Error("branch migration journal ID is invalid");
  }
  return path.join(
    workspaceRoot,
    ".kb",
    "recovery",
    "branch-migrations",
    `${id}.json`,
  );
}

function writeMigrationJournal(
  journalPath: string,
  journal: Record<string, unknown>,
): void {
  fs.writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, {
    mode: 0o600,
  });
}

function recoverBranchMigration(
  workspaceRoot: string,
  id: string,
  apply: boolean,
): void {
  const journalPath = migrationJournalPath(workspaceRoot, id);
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as Record<
    string,
    unknown
  >;
  if (journal.version !== 2)
    throw new Error("Unsupported branch migration journal version");
  const root = path.resolve(workspaceRoot);
  const paths = ["sourcePath", "targetPath", "stagingPath", "backupPath"].map(
    (key) => path.resolve(root, String(journal[key])),
  );
  if (paths.some((candidate) => !candidate.startsWith(`${root}${path.sep}`))) {
    throw new Error("Branch migration journal path escapes workspace");
  }
  const [sourcePath, targetPath, stagingPath, backupPath] = paths;
  if (!sourcePath || !targetPath || !stagingPath || !backupPath) {
    throw new Error("Branch migration journal is incomplete");
  }
  console.log(`Branch migration recovery preview: ${id}`);
  console.log(`State: ${String(journal.state)}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${targetPath}`);
  console.log(`Backup: ${backupPath}`);
  if (!apply) {
    console.log("Preview only. Re-run with --apply to recover this journal.");
    return;
  }
  if (journal.state === "committed") return;
  if (journal.state === "prepared") {
    if (
      fs.existsSync(sourcePath) &&
      fs.existsSync(stagingPath) &&
      !fs.existsSync(targetPath)
    ) {
      fs.renameSync(sourcePath, backupPath);
      writeMigrationJournal(journalPath, {
        ...journal,
        state: "legacy_quarantined",
      });
    } else if (fs.existsSync(sourcePath) && fs.existsSync(targetPath)) {
      throw new Error(
        "Recovery found both legacy source and target; refusing to choose a winner",
      );
    }
  }
  if (
    fs.existsSync(backupPath) &&
    fs.existsSync(stagingPath) &&
    !fs.existsSync(targetPath)
  ) {
    fs.renameSync(stagingPath, targetPath);
    if (!branchStoreManifestMatches(targetPath, String(journal.to))) {
      throw new Error(
        "Recovered target manifest does not match the exact branch identity",
      );
    }
    writeMigrationJournal(journalPath, {
      ...journal,
      state: "target_published",
    });
  }
  if (fs.existsSync(backupPath) && fs.existsSync(targetPath)) {
    if (!branchStoreManifestMatches(targetPath, String(journal.to))) {
      const corrupt = `${targetPath}.corrupt-${Date.now()}`;
      fs.renameSync(targetPath, corrupt);
      fs.renameSync(backupPath, targetPath);
      throw new Error(
        `Invalid target moved to ${corrupt}; verified legacy backup restored`,
      );
    }
    writeMigrationJournal(journalPath, { ...journal, state: "committed" });
    return;
  }
  throw new Error(
    `Migration journal ${id} remains incomplete; rerun its recovery preview`,
  );
}

function createEmptyBranchKb(branch: string, workspaceRoot: string): void {
  const kbPath = ensureBranchStoreManifest(workspaceRoot, branch);
  console.log(`Created branch KB: ${branch} (${kbPath})`);
}

export async function branchEnsureCommand(
  options?: BranchEnsureOptions,
): Promise<void> {
  const workspaceRoot = path.resolve(options?.workspaceRoot ?? process.cwd());
  const branchResult = resolveBranchAttachment(workspaceRoot);

  if ("error" in branchResult) {
    console.error(getBranchDiagnostic(undefined, branchResult.error));
    throw new Error(`Failed to resolve active branch: ${branchResult.error}`);
  }

  if (branchResult.migrationRequired) {
    throw new Error(
      `Branch ensure blocked by legacy storage at ${branchResult.storePath}. Run an explicit 'kibi branch migrate --from ${branchResult.kbBranch} --to ${branchResult.gitBranch} --apply' first.`,
    );
  }
  const currentBranch = branchResult.kbBranch;
  const kbPath = branchResult.storePath;

  if (options?.from !== undefined) {
    throw new Error(
      "branch ensure --from was removed: new branch stores compile from the current checkout's tracked sources. Use branch migrate for an explicit legacy-store move.",
    );
  }
  if (fs.existsSync(kbPath)) {
    console.log(`Branch KB already exists: ${currentBranch}`);
    return;
  }
  createEmptyBranchKb(currentBranch, workspaceRoot);
}

/**
 * Move a legacy branch-named KB into the exact active Git branch namespace.
 * Preview is the default; --apply is required because this changes tracked
 * workspace state.
 */
export async function branchMigrateCommand(
  options: BranchMigrateOptions = {},
): Promise<void> {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  if (options.recoverJournal !== undefined) {
    recoverBranchMigration(
      workspaceRoot,
      options.recoverJournal,
      options.apply === true,
    );
    return;
  }
  const from = options.from;
  if (!from || !isValidBranchName(from)) {
    throw new Error("branch migrate requires a valid --from branch name");
  }
  const active = resolveActiveBranch(workspaceRoot);
  if ("error" in active) {
    throw new Error(`Failed to resolve active branch: ${active.error}`);
  }
  const to = options.to;
  if (!to || !isValidBranchName(to)) {
    throw new Error(
      "branch migrate requires an explicit valid --to branch name",
    );
  }
  if (active.branch !== to) {
    throw new Error(
      `branch migrate --to '${to}' does not match the active Git branch '${active.branch}'`,
    );
  }
  // `from === to` is valid for the bridge migration: it names the same exact
  // Git identity while moving a legacy literal directory into its hashed
  // compiled-store path. The explicit pair is still required; no rename is
  // inferred from commit history.
  const root = branchStoresRoot(workspaceRoot);
  const sourcePath = legacyBranchStorePath(workspaceRoot, from);
  const targetPath = branchStorePath(workspaceRoot, to);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Legacy source KB does not exist: ${sourcePath}`);
  }
  if (fs.existsSync(targetPath)) {
    throw new Error(`Target branch KB already exists: ${targetPath}`);
  }
  const approvalHash = branchMigrationApprovalHash(
    from,
    to,
    sourcePath,
    targetPath,
  );
  console.log(`Branch KB migration preview: ${from} -> ${to}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${targetPath}`);
  console.log(`Approval hash: ${approvalHash}`);
  if (!options.apply) {
    console.log("Preview only. Re-run with --apply to move the branch KB.");
    return;
  }
  if (!options.approvalHash) {
    throw new Error(
      `branch migrate requires --approval-hash from the preview (${approvalHash})`,
    );
  }
  if (options.approvalHash !== approvalHash) {
    throw new Error(
      `branch migrate approval hash mismatch; expected ${approvalHash}`,
    );
  }
  const publicationLease = acquireEnginePublicationLease(workspaceRoot, from);
  try {
    const engine = new EngineClient({
      workspaceRoot,
      branch: from,
      timeout: 2_000,
      allowPublicationLock: true,
    });
    const engineSocket = engineSocketPath(workspaceRoot, from);
    try {
      if (fs.existsSync(engineSocket)) await engine.start(false);
      if (engine.isRunning()) {
        await engine.stop(false);
      } else if (fs.existsSync(engineSocket)) {
        throw new Error(
          `Kibi engine socket remains present but is not reachable: ${engineSocket}`,
        );
      }
    } catch (error) {
      throw new Error(
        `Branch migration blocked: engine shutdown failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await engine.terminate();
    }
    if (
      branchMigrationApprovalHash(from, to, sourcePath, targetPath) !==
      approvalHash
    ) {
      throw new Error(
        "Branch migration source changed after engine shutdown; rerun the preview",
      );
    }
    fs.mkdirSync(root, { recursive: true });
    const migrationId = `${Date.now()}-${from.replaceAll("/", "__")}-${to.replaceAll("/", "__")}`;
    const journalPath = path.join(
      workspaceRoot,
      ".kb",
      "recovery",
      "branch-migrations",
      `${migrationId}.json`,
    );
    const stagingPath = `${targetPath}.staging-${process.pid}-${Date.now()}`;
    const backupPath = path.join(
      workspaceRoot,
      ".kb",
      "recovery",
      "branch-migrations",
      `${migrationId}-legacy`,
    );
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    const journal = {
      version: 2,
      from,
      to,
      sourcePath: path.relative(workspaceRoot, sourcePath),
      targetPath: path.relative(workspaceRoot, targetPath),
      stagingPath: path.relative(workspaceRoot, stagingPath),
      backupPath: path.relative(workspaceRoot, backupPath),
      approvalHash,
      state: "prepared",
    } as const;
    writeMigrationJournal(journalPath, { ...journal });
    try {
      fs.cpSync(sourcePath, stagingPath, {
        recursive: true,
        errorOnExist: true,
      });
      fs.writeFileSync(
        branchStoreManifestPath(stagingPath),
        `${JSON.stringify(expectedBranchStoreManifest(to), null, 2)}\n`,
        { mode: 0o600 },
      );
      fs.renameSync(sourcePath, backupPath);
      writeMigrationJournal(journalPath, {
        ...journal,
        state: "legacy_quarantined",
      });
      fs.renameSync(stagingPath, targetPath);
      if (!branchStoreManifestMatches(targetPath, to)) {
        throw new Error("migrated branch store manifest verification failed");
      }
      writeMigrationJournal(journalPath, {
        ...journal,
        state: "target_published",
      });
      writeMigrationJournal(journalPath, { ...journal, state: "committed" });
    } catch (error) {
      // Leave the hash-bound journal and any staging bytes for explicit crash
      // recovery; never silently select a winner between source and target.
      throw new Error(
        `Branch migration failed before authoritative completion; recover ${journalPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    console.log(`Migrated branch KB to exact Git branch '${to}'.`);
    console.log(`Legacy store preserved at ${backupPath}.`);
    console.log(`Migration journal: ${journalPath}.`);
  } finally {
    publicationLease.release();
  }
}

/**
 * Rebuild an unreadable exact branch store from the current authored sources.
 * The existing bytes are moved to a Kibi-owned recovery directory only after a
 * clean staging store has been created successfully.
 */
export async function branchRecoverCommand(
  options: BranchRecoverOptions = {},
): Promise<void> {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  const attachment = resolveBranchAttachment(workspaceRoot);
  if ("error" in attachment) {
    throw new Error(`Failed to resolve active branch: ${attachment.error}`);
  }
  if (attachment.kind !== "exact") {
    throw new Error(
      "branch recover requires an exact Git/KB attachment; migrate legacy storage before recovery.",
    );
  }
  const inspection = inspectBranchStore(workspaceRoot, attachment.kbBranch);
  if (inspection.state === "missing") {
    throw new Error(
      `Branch KB is missing at ${inspection.path}; run 'kibi branch ensure' instead.`,
    );
  }
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const backupPath = path.join(
    workspaceRoot,
    ".kb",
    "recovery",
    attachment.kbBranch,
    stamp,
  );
  console.log(`Branch KB recovery preview: ${attachment.kbBranch}`);
  console.log(`Store: ${inspection.path}`);
  console.log(
    `State: ${inspection.state}${inspection.errorCode ? ` (${inspection.errorCode})` : ""}`,
  );
  console.log(`Backup: ${backupPath}`);
  console.log(
    "Strategy: rebuild a clean journaled store from current authored sources.",
  );
  console.log(
    "Git branch remains unchanged; no branch rename will be performed.",
  );
  if (!options.apply) {
    console.log(
      "Preview only. Re-run with --apply to create the backup and publish the rebuilt store.",
    );
    return;
  }
  const { syncCommand } = await import("./sync.js");
  const result = await syncCommand({
    rebuild: true,
    recoveryBackupPath: backupPath,
    workspaceRoot,
  });
  if (!result.success) {
    throw new Error("Branch KB recovery did not complete successfully.");
  }
  // Reattach through the normal delta path after publishing the isolated
  // generation. This establishes the current checkpoint/snapshot metadata on
  // the recovered store, so recovery finishes fresh rather than merely
  // structurally readable.
  const checkpoint = await syncCommand({ workspaceRoot });
  if (!checkpoint.success) {
    throw new Error(
      "Recovered branch KB could not establish a fresh checkpoint.",
    );
  }
  const auditPath = path.join(
    workspaceRoot,
    ".kb",
    "migrations",
    `${attachment.kbBranch.replaceAll("/", "__")}.recovery.json`,
  );
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  fs.writeFileSync(
    auditPath,
    `${JSON.stringify(
      {
        version: 1,
        branch: attachment.kbBranch,
        recoveredAt: new Date().toISOString(),
        priorState: inspection.state,
        priorErrorCode: inspection.errorCode ?? null,
        backupPath: path.relative(workspaceRoot, backupPath),
        strategy: "rebuild_from_authored_sources",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`Recovered exact branch KB '${attachment.kbBranch}'.`);
  console.log(`Original bytes preserved at ${backupPath}.`);
  console.log(`Recovery audit: ${auditPath}`);
}

/** Restore the newest quarantined store for an exact branch identity. */
export async function branchRestoreCommand(
  options: BranchRestoreOptions = {},
): Promise<void> {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  const branch = options.branch;
  if (!branch || !isValidBranchName(branch)) {
    throw new Error("branch restore requires a valid --branch identity");
  }
  const targetPath = branchStorePath(workspaceRoot, branch);
  if (fs.existsSync(targetPath)) {
    throw new Error(`Target branch store already exists: ${targetPath}`);
  }
  const keyRoot = path.join(
    workspaceRoot,
    ".kb",
    "quarantine",
    "branches",
    path.basename(targetPath),
  );
  const candidates = fs.existsSync(keyRoot)
    ? fs
        .readdirSync(keyRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(keyRoot, entry.name))
        .sort()
        .reverse()
    : [];
  const source = candidates.find((candidate) => {
    try {
      const metadata = JSON.parse(
        fs.readFileSync(path.join(candidate, "quarantine.json"), "utf8"),
      ) as { branch?: string };
      return metadata.branch === branch;
    } catch {
      return false;
    }
  });
  if (!source) throw new Error(`No quarantined store found for '${branch}'.`);
  console.log(`Branch restore preview: ${branch}`);
  console.log(`Source: ${source}`);
  console.log(`Target: ${targetPath}`);
  if (!options.apply) {
    console.log("Preview only. Re-run with --apply to restore the store.");
    return;
  }
  const manifest = readBranchStoreManifest(source);
  if (manifest === null || !branchStoreManifestMatches(source, branch)) {
    throw new Error(`Quarantined store identity mismatch for '${branch}'.`);
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.renameSync(source, targetPath);
  console.log(`Restored exact branch store for '${branch}'.`);
}

export default branchEnsureCommand;
