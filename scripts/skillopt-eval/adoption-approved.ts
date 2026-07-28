import { randomUUID } from "node:crypto";
import { cp, mkdtemp, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CanonicalSnapshot, publicPlan } from "./adoption-snapshot";
import {
  type AdoptionDependencies,
  type AdoptionReceipt,
  AdoptionTransactionError,
} from "./adoption-types";

const MIRROR_TARGETS = ["cursor", "codex"] as const;

type MirrorSnapshot = Readonly<{
  path: string;
  backupPath: string;
  existed: boolean;
}>;

export async function defaultRunMirrorSync(repoRoot: string): Promise<void> {
  const process = Bun.spawn(
    ["bun", "run", join(repoRoot, "scripts/sync-agent-skills.ts"), "--write"],
    { cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
  );
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(process.stderr).text();
    throw new AdoptionTransactionError(
      new Error(`skill mirror sync failed (${exitCode}): ${stderr.trim()}`),
    );
  }
}

async function snapshotMirrors(repoRoot: string, backupRoot: string) {
  return Promise.all(
    MIRROR_TARGETS.map(async (target): Promise<MirrorSnapshot> => {
      const path = join(repoRoot, `packages/${target}/skills`);
      const backupPath = join(backupRoot, target);
      const existed = await stat(path).then(
        () => true,
        () => false,
      );
      if (existed) await cp(path, backupPath, { recursive: true });
      return { path, backupPath, existed };
    }),
  );
}

async function restoreMirrors(
  snapshots: readonly MirrorSnapshot[],
): Promise<void> {
  for (const snapshot of snapshots) {
    await rm(snapshot.path, { recursive: true, force: true });
    if (snapshot.existed)
      await cp(snapshot.backupPath, snapshot.path, { recursive: true });
  }
}

export async function adoptApprovedSnapshot(
  repoRoot: string,
  snapshot: CanonicalSnapshot,
  dependencies: AdoptionDependencies,
): Promise<AdoptionReceipt> {
  const plan = publicPlan(snapshot);
  if (!snapshot.mutationRequired) return { ...plan, status: "unchanged" };
  const backupRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-backup-"));
  const tempCanonicalPath = `${snapshot.canonicalPath}.adoption-${randomUUID()}`;
  let mirrorSnapshots: readonly MirrorSnapshot[] = [];
  try {
    mirrorSnapshots = await snapshotMirrors(repoRoot, backupRoot);
    await writeFile(tempCanonicalPath, snapshot.candidateMarkdown, "utf8");
    await rename(tempCanonicalPath, snapshot.canonicalPath);
    await dependencies.runMirrorSync(repoRoot);
    return { ...plan, status: "adopted" };
  } catch (error) {
    await writeFile(tempCanonicalPath, snapshot.markdown, "utf8");
    await rename(tempCanonicalPath, snapshot.canonicalPath);
    await restoreMirrors(mirrorSnapshots);
    throw new AdoptionTransactionError(error);
  } finally {
    await rm(tempCanonicalPath, { force: true });
    await rm(backupRoot, { recursive: true, force: true });
  }
}
