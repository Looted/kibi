import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  DETACHED_SNAPSHOT_KB_BRANCH,
  resolveReadBranchAttachment,
} from "../utils/branch-resolver.js";
import {
  branchStoreKey,
  branchStoresRoot,
  readBranchStoreManifest,
} from "../utils/branch-store-locator.js";

const DEFAULT_RETENTION_DAYS = 30;

type GcOptions = {
  dryRun?: boolean;
  force?: boolean;
  purge?: boolean;
  retentionDays?: number;
};

/** One Git invocation; stderr is null when Git could not be spawned. */
export type GcGitRunner = (
  args: readonly string[],
  cwd: string,
) => { status: number | null; stdout: string; stderr: string | null };

const runGit: GcGitRunner = (args, cwd) =>
  spawnSync("git", args, { encoding: "utf8", cwd });

function localBranches(workspaceRoot: string, git: GcGitRunner): Set<string> {
  const result = git(["branch", "--format=%(refname:short)"], workspaceRoot);
  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() || "unable to list local Git branches",
    );
  }
  // A blank line adds "", which names no branch store.
  const live = new Set(
    result.stdout.split("\n").map((branch) => branch.trim()),
  );
  // A branch checked out in another worktree is live even when it is not the
  // current worktree's symbolic HEAD. Remote-only refs are deliberately not
  // included: they have no local authored checkout to protect.
  const worktrees = git(["worktree", "list", "--porcelain"], workspaceRoot);
  if (worktrees.status === 0) {
    for (const line of worktrees.stdout.split("\n")) {
      // `.+` stops at the end of the line, which split already cut.
      const match = line.match(/^branch refs\/heads\/(.+)/);
      if (match) live.add(match[1] as string);
    }
  }
  return live;
}

function quarantineRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".kb", "quarantine", "branches");
}

function quarantineBranch(
  workspaceRoot: string,
  sourcePath: string,
  branch: string,
): string {
  const target = path.join(
    quarantineRoot(workspaceRoot),
    branchStoreKey(branch),
    new Date().toISOString().replaceAll(":", "-"),
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(sourcePath, target);
  fs.writeFileSync(
    path.join(target, "quarantine.json"),
    `${JSON.stringify(
      {
        version: 1,
        branch,
        key: branchStoreKey(branch),
        quarantinedAt: new Date().toISOString(),
        sourcePath: path.relative(workspaceRoot, sourcePath),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  return target;
}

function purgeQuarantine(workspaceRoot: string, retentionDays: number): number {
  const root = quarantineRoot(workspaceRoot);
  if (!fs.existsSync(root)) return 0;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let purged = 0;
  for (const key of fs.readdirSync(root, { withFileTypes: true })) {
    if (!key.isDirectory()) continue;
    const keyPath = path.join(root, key.name);
    for (const entry of fs.readdirSync(keyPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(keyPath, entry.name);
      const metadataPath = path.join(candidate, "quarantine.json");
      let quarantinedAt = fs.statSync(candidate).mtimeMs;
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as {
          quarantinedAt?: string;
        };
        // A missing or empty time parses to NaN and keeps the mtime.
        const parsed = Date.parse(metadata.quarantinedAt as string);
        if (Number.isFinite(parsed)) quarantinedAt = parsed;
      } catch {
        // A missing or malformed journal falls back to the directory mtime.
      }
      if (retentionDays > 0 && quarantinedAt > cutoff) continue;
      fs.rmSync(candidate, { recursive: true });
      purged += 1;
    }
    if (fs.readdirSync(keyPath).length === 0) {
      fs.rmSync(keyPath, { recursive: true });
    }
  }
  return purged;
}

export async function gcCommand(
  options: GcOptions = {},
  git: GcGitRunner = runGit,
): Promise<void> {
  const workspaceRoot = process.cwd();
  const retentionDays =
    Number.isFinite(options.retentionDays) &&
    (options.retentionDays as number) >= 0
      ? Math.floor(options.retentionDays as number)
      : DEFAULT_RETENTION_DAYS;
  const branchesRoot = branchStoresRoot(workspaceRoot);

  try {
    if (!fs.existsSync(branchesRoot)) {
      console.log("No branch KBs found (.kb/branches does not exist)");
      process.exitCode = 0;
      return;
    }
    const live = localBranches(workspaceRoot, git);
    // The detached-HEAD snapshot is a regenerable read cache: live while this
    // checkout is detached on it, stale (collectable) once a branch is out.
    const readAttachment = resolveReadBranchAttachment(workspaceRoot);
    if (!("error" in readAttachment) && readAttachment.readOnly !== undefined) {
      live.add(DETACHED_SNAPSHOT_KB_BRANCH);
    }
    const candidates: Array<{ branch: string; path: string }> = [];
    const visit = (dir: string, relativeBranch: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const candidatePath = path.join(dir, entry.name);
        if (!entry.isDirectory()) continue;
        const manifest = readBranchStoreManifest(candidatePath);
        if (manifest !== null) {
          candidates.push({ branch: manifest.branch, path: candidatePath });
          continue;
        }
        const next = relativeBranch
          ? `${relativeBranch}/${entry.name}`
          : entry.name;
        if (
          fs.existsSync(path.join(candidatePath, "kb.rdf")) ||
          fs.existsSync(path.join(candidatePath, "storage.json"))
        ) {
          candidates.push({ branch: next, path: candidatePath });
        } else {
          visit(candidatePath, next);
        }
      }
    };
    visit(branchesRoot, "");

    const stale = candidates.filter(({ branch }) => !live.has(branch));
    if (!options.force && !options.purge) {
      console.log(
        `Found ${stale.length} stale branch KB(s) (dry run - not quarantined)`,
      );
      for (const candidate of stale) {
        console.log(`  - ${candidate.branch}: ${candidate.path}`);
      }
      process.exitCode = 0;
      return;
    }

    if (options.force && !options.purge) {
      for (const candidate of stale) {
        const destination = quarantineBranch(
          workspaceRoot,
          candidate.path,
          candidate.branch,
        );
        console.log(`Quarantined ${candidate.branch}: ${destination}`);
      }
    }
    if (options.purge) {
      const purged = purgeQuarantine(workspaceRoot, retentionDays);
      console.log(
        `Purged ${purged} quarantined branch store(s) older than ${retentionDays} day(s)`,
      );
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Branch GC failed: ${message}`);
    process.exitCode = 1;
  }
}

export default gcCommand;
