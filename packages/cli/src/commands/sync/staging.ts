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

import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { copyFileSync } from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { copyCleanSnapshot } from "../../utils/branch-resolver.js";

interface StagingDeps {
  copyCleanSnapshot: typeof copyCleanSnapshot;
  copyFileSync: typeof copyFileSync;
  cwd: () => string;
  existsSync: typeof existsSync;
  fg: typeof fg;
  isProcessAlive: (pid: number) => boolean;
  mkdirSync: typeof mkdirSync;
  moduleDir: string;
  renameSync: typeof renameSync;
  rmSync: typeof rmSync;
}

function resolveDeps(overrides?: Partial<StagingDeps>): StagingDeps {
  return {
    copyCleanSnapshot,
    copyFileSync,
    cwd: () => process.cwd(),
    existsSync,
    fg,
    isProcessAlive: (pid: number) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        return !(
          error instanceof Error &&
          "code" in error &&
          error.code === "ESRCH"
        );
      }
    },
    mkdirSync,
    moduleDir: import.meta.dirname,
    renameSync,
    rmSync,
    ...overrides,
  };
}

// implements REQ-003
export function createUniqueStagingPath(
  currentBranch: string,
  rootDir: string,
  pid = process.pid,
  now = Date.now(),
): string {
  return path.join(
    rootDir,
    ".kb",
    "branches",
    `${currentBranch}.staging.${pid}.${now}`,
  );
}

// implements REQ-003
export async function cleanupAbandonedStagingDirectories(
  stagingPath: string,
  deps?: Partial<StagingDeps>,
): Promise<void> {
  const resolved = resolveDeps(deps);
  const stagingDir = path.dirname(stagingPath);
  const stagingBase = path.basename(stagingPath);
  const match = /^(?<branch>.+)\.staging\.(?<pid>\d+)\.(?<timestamp>\d+)$/.exec(
    stagingBase,
  );

  if (!match?.groups) {
    return;
  }

  const branch = match.groups.branch;
  if (!branch) {
    return;
  }

  const candidates = await resolved.fg(`${branch}.staging.*`, {
    cwd: stagingDir,
    absolute: true,
    onlyDirectories: true,
    suppressErrors: true,
  });

  for (const candidate of candidates) {
    if (candidate === stagingPath) {
      continue;
    }

    const candidateBase = path.basename(candidate);
    const candidateMatch = new RegExp(
      `^${escapeRegex(branch)}\\.staging\\.(\\d+)\\.(\\d+)$`,
    ).exec(candidateBase);

    if (!candidateMatch) {
      continue;
    }

    const candidatePidText = candidateMatch[1];
    if (!candidatePidText) {
      continue;
    }

    const candidatePid = Number.parseInt(candidatePidText, 10);
    if (!Number.isFinite(candidatePid) || resolved.isProcessAlive(candidatePid)) {
      continue;
    }

    cleanupStaging(candidate, resolved);
  }
}

export async function prepareStagingEnvironment(
  // implements REQ-003
  stagingPath: string,
  livePath: string,
  rebuild: boolean,
  deps?: Partial<StagingDeps>,
): Promise<void> {
  const resolved = resolveDeps(deps);
  await cleanupAbandonedStagingDirectories(stagingPath, resolved);
  cleanupStaging(stagingPath, resolved);
  resolved.mkdirSync(stagingPath, { recursive: true });

  if (!rebuild && resolved.existsSync(livePath)) {
    // Use existing live path if available
    resolved.copyCleanSnapshot(livePath, stagingPath);
  } else {
    // Start fresh with schema only
    await copySchemaToStaging(stagingPath, resolved);
  }
}

async function copySchemaToStaging(
  stagingPath: string,
  deps: StagingDeps,
): Promise<void> {
  const possibleSchemaPaths = [
    path.resolve(deps.cwd(), "node_modules", "kibi-cli", "schema"),
    path.resolve(deps.cwd(), "..", "..", "schema"),
    path.resolve(deps.moduleDir, "..", "..", "schema"),
    path.resolve(deps.cwd(), "packages", "cli", "schema"),
  ];

  let schemaSourceDir: string | null = null;
  for (const p of possibleSchemaPaths) {
    if (deps.existsSync(p)) {
      schemaSourceDir = p;
      break;
    }
  }

  if (!schemaSourceDir) {
    return;
  }

  const schemaFiles = await deps.fg("*.pl", {
    cwd: schemaSourceDir,
    absolute: false,
  });

  const schemaDestDir = path.join(stagingPath, "schema");
  if (!deps.existsSync(schemaDestDir)) {
    deps.mkdirSync(schemaDestDir, { recursive: true });
  }

  for (const file of schemaFiles) {
    const sourcePath = path.join(schemaSourceDir, file);
    const destPath = path.join(schemaDestDir, file);
    deps.copyFileSync(sourcePath, destPath);
  }
}

export function atomicPublish(
  // implements REQ-003
  stagingPath: string,
  livePath: string,
  deps?: Partial<StagingDeps>,
): void {
  const resolved = resolveDeps(deps);
  const liveParent = path.dirname(livePath);
  if (!resolved.existsSync(liveParent)) {
    resolved.mkdirSync(liveParent, { recursive: true });
  }

  if (resolved.existsSync(livePath)) {
    const tempPath = `${livePath}.old.${Date.now()}`;
    resolved.renameSync(livePath, tempPath);
    resolved.renameSync(stagingPath, livePath);
    resolved.rmSync(tempPath, { recursive: true, force: true });
  } else {
    resolved.renameSync(stagingPath, livePath);
  }
}

export function cleanupStaging(
  // implements REQ-003
  stagingPath: string,
  deps?: Partial<StagingDeps>,
): void {
  const resolved = resolveDeps(deps);
  if (resolved.existsSync(stagingPath)) {
    resolved.rmSync(stagingPath, { recursive: true, force: true });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
