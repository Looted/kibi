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

import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  writeFileSync: typeof writeFileSync;
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
    writeFileSync,
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
    if (
      !Number.isFinite(candidatePid) ||
      resolved.isProcessAlive(candidatePid)
    ) {
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

  // Every new staging generation uses the journaled store format.  This also
  // makes `--rebuild` publish a native RDF database instead of recreating the
  // legacy full-snapshot path.
  const markerPath = path.join(stagingPath, "storage.json");
  const canWriteMetadata =
    deps === undefined || deps.writeFileSync !== undefined;
  if (
    canWriteMetadata &&
    resolved.existsSync(stagingPath) &&
    !resolved.existsSync(markerPath)
  ) {
    resolved.mkdirSync(path.join(stagingPath, "rdf"), { recursive: true });
    resolved.writeFileSync(
      markerPath,
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
      { mode: 0o600 },
    );
    const generation = rebuild
      ? `generation-${process.pid}-${Date.now()}`
      : "generation-1";
    resolved.writeFileSync(
      path.join(stagingPath, "CURRENT"),
      `${generation}:0\n`,
      { mode: 0o600 },
    );
    resolved.writeFileSync(
      path.join(stagingPath, "kb.rdf"),
      "KIBI_STORAGE_FORMAT=kibi.rdf-journal.v1\n",
      { mode: 0o600 },
    );
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

/**
 * Publish a rebuilt journal generation without replacing the branch directory.
 * The legacy backup, sync metadata, and sentinel stay in place; only the
 * journal database and CURRENT pointer move.  A short-lived rollback pair is
 * retained until both moves succeed so an interrupted publication can be
 * repaired on the next engine start.
 */
export function atomicPublishGeneration(
  stagingPath: string,
  livePath: string,
  deps?: Partial<StagingDeps>,
): void {
  const resolved = resolveDeps(deps);
  const liveParent = path.dirname(livePath);
  if (!resolved.existsSync(liveParent)) {
    resolved.mkdirSync(liveParent, { recursive: true });
  }
  if (!resolved.existsSync(livePath)) {
    resolved.renameSync(stagingPath, livePath);
    return;
  }

  const generationStamp = `${Date.now()}.${process.pid}`;
  const liveRdf = path.join(livePath, "rdf");
  const stagedRdf = path.join(stagingPath, "rdf");
  const oldRdf = `${liveRdf}.old.${generationStamp}`;
  const liveCurrent = path.join(livePath, "CURRENT");
  const stagedCurrent = path.join(stagingPath, "CURRENT");
  const oldCurrent = `${liveCurrent}.old.${generationStamp}`;

  if (!resolved.existsSync(stagedRdf) || !resolved.existsSync(stagedCurrent)) {
    throw new Error("Rebuilt journal generation is missing rdf or CURRENT");
  }

  let oldRdfMoved = false;
  let oldCurrentMoved = false;
  try {
    if (resolved.existsSync(liveRdf)) {
      resolved.renameSync(liveRdf, oldRdf);
      oldRdfMoved = true;
    }
    resolved.renameSync(stagedRdf, liveRdf);

    if (resolved.existsSync(liveCurrent)) {
      resolved.renameSync(liveCurrent, oldCurrent);
      oldCurrentMoved = true;
    }
    resolved.renameSync(stagedCurrent, liveCurrent);
  } catch (error) {
    // Restore the old pointer/database whenever publication fails.  If the
    // process itself crashes, ensureJournaledBranchStoreAsync performs the
    // same recovery from the `.old.<stamp>` siblings.
    try {
      if (resolved.existsSync(liveCurrent))
        resolved.rmSync(liveCurrent, { force: true });
      if (oldCurrentMoved && resolved.existsSync(oldCurrent))
        resolved.renameSync(oldCurrent, liveCurrent);
      if (resolved.existsSync(liveRdf))
        resolved.rmSync(liveRdf, { recursive: true, force: true });
      if (oldRdfMoved && resolved.existsSync(oldRdf))
        resolved.renameSync(oldRdf, liveRdf);
    } catch {
      // Preserve the original publication error; startup recovery will report
      // the remaining sibling paths if the rollback itself was interrupted.
    }
    throw error;
  }

  if (resolved.existsSync(oldRdf))
    resolved.rmSync(oldRdf, { recursive: true, force: true });
  if (resolved.existsSync(oldCurrent))
    resolved.rmSync(oldCurrent, { force: true });
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
