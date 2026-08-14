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

import * as fs from "node:fs";
import * as path from "node:path";
import { EngineClient, engineSocketPath } from "../engine.js";
import {
  copyCleanSnapshot,
  getBranchDiagnostic,
  isValidBranchName,
  resolveActiveBranch,
  resolveBranchAttachment,
} from "../utils/branch-resolver.js";
import { inspectBranchStore } from "../utils/branch-store.js";

export interface BranchEnsureOptions {
  from?: string;
  workspaceRoot?: string;
}

export interface BranchMigrateOptions {
  from?: string;
  apply?: boolean;
  workspaceRoot?: string;
}

export interface BranchRecoverOptions {
  apply?: boolean;
  workspaceRoot?: string;
}

function resolveExplicitFromBranch(fromBranch: string, workspaceRoot: string): string | null {
  if (!isValidBranchName(fromBranch)) {
    console.warn(
      `Warning: invalid branch name provided via --from: '${fromBranch}'`,
    );
    return null;
  }
  const fromPath = path.join(workspaceRoot, ".kb/branches", fromBranch);
  if (fs.existsSync(fromPath)) {
    return fromBranch;
  }
  console.warn(`Warning: --from branch '${fromBranch}' KB does not exist`);
  return null;
}

function createBranchKbFromSource(
  sourceBranch: string,
  targetBranch: string,
  workspaceRoot: string,
): void {
  const sourcePath = path.join(workspaceRoot, ".kb/branches", sourceBranch);
  const targetPath = path.join(workspaceRoot, ".kb/branches", targetBranch);
  copyCleanSnapshot(sourcePath, targetPath);
  console.log(`Created branch KB: ${targetBranch} (from ${sourceBranch})`);
}

function createEmptyBranchKb(branch: string, workspaceRoot: string): void {
  const kbPath = path.join(workspaceRoot, ".kb/branches", branch);
  fs.mkdirSync(kbPath, { recursive: true });
  console.log(`Created branch KB: ${branch} (empty schema)`);
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
      `Branch ensure blocked by legacy attachment (${branchResult.gitBranch} -> ${branchResult.kbBranch}). Run 'kibi branch migrate --from ${branchResult.kbBranch} --apply' first.`,
    );
  }
  const currentBranch = branchResult.kbBranch;
  const kbPath = path.join(workspaceRoot, ".kb/branches", currentBranch);

  if (fs.existsSync(kbPath)) {
    console.log(`Branch KB already exists: ${currentBranch}`);
    return;
  }

  if (options?.from !== undefined) {
    const sourceBranch = resolveExplicitFromBranch(options.from, workspaceRoot);
    if (!sourceBranch) {
      throw new Error(
        `Cannot copy branch KB: explicit source '${options.from}' does not exist or is invalid`,
      );
    }
    createBranchKbFromSource(sourceBranch, currentBranch, workspaceRoot);
  } else {
    createEmptyBranchKb(currentBranch, workspaceRoot);
  }
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
  const from = options.from?.trim();
  if (!from || !isValidBranchName(from)) {
    throw new Error("branch migrate requires a valid --from branch name");
  }
  const active = resolveActiveBranch(workspaceRoot);
  if ("error" in active) {
    throw new Error(`Failed to resolve active branch: ${active.error}`);
  }
  const to = active.branch;
  if (from === to) {
    throw new Error(`Source and active branch are both '${to}'`);
  }
  const root = path.join(workspaceRoot, ".kb", "branches");
  const sourcePath = path.join(root, from);
  const targetPath = path.join(root, to);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Legacy source KB does not exist: ${sourcePath}`);
  }
  if (fs.existsSync(targetPath)) {
    throw new Error(`Target branch KB already exists: ${targetPath}`);
  }
  const attachment = resolveBranchAttachment(workspaceRoot);
  if (
    "error" in attachment ||
    attachment.kind !== "legacy_compat" ||
    attachment.gitBranch !== "master" ||
    attachment.kbBranch !== from
  ) {
    throw new Error(
      "branch migrate only accepts the detected legacy master -> main attachment. Use 'kibi branch ensure --from <branch>' for an intentional new branch or 'kibi branch recover' for an unreadable target store.",
    );
  }
  console.log(`Branch KB migration preview: ${from} -> ${to}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${targetPath}`);
  if (!options.apply) {
    console.log("Preview only. Re-run with --apply to move the branch KB.");
    return;
  }
  const engine = new EngineClient({
    workspaceRoot,
    branch: from,
    timeout: 2_000,
  });
  if (fs.existsSync(engineSocketPath(workspaceRoot, from))) {
    await engine.stop(false).catch(() => undefined);
    await engine.terminate().catch(() => undefined);
  }
  fs.mkdirSync(root, { recursive: true });
  fs.renameSync(sourcePath, targetPath);
  console.log(`Migrated branch KB to exact Git branch '${to}'.`);
  console.log(`Git branch remains '${to}'; no branch rename was performed.`);
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

export default branchEnsureCommand;
