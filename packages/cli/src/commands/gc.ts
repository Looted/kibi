import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
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

function localBranches(workspaceRoot: string): Set<string> {
  const result = spawnSync(
    "git",
    ["branch", "--format=%(refname:short)"],
    { encoding: "utf8", cwd: workspaceRoot, stdio: ["pipe", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "unable to list local Git branches");
  }
  const output = result.stdout ?? "";
  const live = new Set(
    output
      .split("\n")
      .map((branch) => branch.trim())
      .filter(Boolean),
  );
  // A branch checked out in another worktree is live even when it is not the
  // current worktree's symbolic HEAD. Remote-only refs are deliberately not
  // included: they have no local authored checkout to protect.
  const worktrees = spawnSync("git", ["worktree", "list", "--porcelain"], {
    encoding: "utf8",
    cwd: workspaceRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (worktrees.status === 0) {
    for (const line of (worktrees.stdout ?? "").split("\n")) {
      const match = line.match(/^branch refs\/heads\/(.+)$/);
      if (match?.[1]) live.add(match[1]);
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
        if (metadata.quarantinedAt) {
          const parsed = Date.parse(metadata.quarantinedAt);
          if (Number.isFinite(parsed)) quarantinedAt = parsed;
        }
      } catch {
        // A missing or malformed journal falls back to the directory mtime.
      }
      if (retentionDays > 0 && quarantinedAt > cutoff) continue;
      fs.rmSync(candidate, { recursive: true, force: true });
      purged += 1;
    }
    if (fs.readdirSync(keyPath).length === 0) {
      fs.rmSync(keyPath, { recursive: true, force: true });
    }
  }
  return purged;
}

export async function gcCommand(options: GcOptions = {}): Promise<void> {
  const workspaceRoot = process.cwd();
  const retentionDays =
    Number.isFinite(options.retentionDays) && (options.retentionDays ?? 0) >= 0
      ? Math.floor(options.retentionDays as number)
      : DEFAULT_RETENTION_DAYS;
  const branchesRoot = branchStoresRoot(workspaceRoot);

  try {
    if (!fs.existsSync(branchesRoot)) {
      console.log("No branch KBs found (.kb/branches does not exist)");
      process.exitCode = 0;
      return;
    }
    const live = localBranches(workspaceRoot);
    const candidates: Array<{ branch: string; path: string; legacy: boolean }> = [];
    const visit = (dir: string, relativeBranch: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const candidatePath = path.join(dir, entry.name);
        if (!entry.isDirectory()) continue;
        const manifest = readBranchStoreManifest(candidatePath);
        if (manifest !== null) {
          candidates.push({ branch: manifest.branch, path: candidatePath, legacy: false });
          continue;
        }
        const next = relativeBranch ? `${relativeBranch}/${entry.name}` : entry.name;
        if (
          fs.existsSync(path.join(candidatePath, "kb.rdf")) ||
          fs.existsSync(path.join(candidatePath, "storage.json"))
        ) {
          candidates.push({ branch: next, path: candidatePath, legacy: true });
        } else {
          visit(candidatePath, next);
        }
      }
    };
    visit(branchesRoot, "");

    const stale = candidates.filter(({ branch }) => !live.has(branch));
    if (!options.force && !options.purge) {
      console.log(`Found ${stale.length} stale branch KB(s) (dry run - not quarantined)`);
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
