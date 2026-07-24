import { createHash, randomUUID } from "node:crypto";
import {
  cp,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { YAML } from "bun";
import canonicalize from "canonicalize";
import { z } from "zod";
import { type ValidateApprovalInput, validateApproval } from "./approval";
import type { CanonicalSkill } from "./catalog";
import { validateCandidateBody } from "./variants";
import type { FrozenVariant } from "./variants";

const MIRROR_TARGETS = ["cursor", "codex"] as const;

export type AdoptionInput = ValidateApprovalInput &
  Readonly<{
    repoRoot: string;
  }>;

export type AdoptionPlan = Readonly<{
  skill: CanonicalSkill;
  canonicalPath: string;
  currentBodyHash: string;
  candidateBodyHash: string;
  mutationRequired: boolean;
}>;

export type AdoptionReceipt = AdoptionPlan &
  Readonly<{
    status: "adopted" | "unchanged";
  }>;

export type RunMirrorSync = (repoRoot: string) => Promise<void>;

export type AdoptionDependencies = Readonly<{
  runMirrorSync: RunMirrorSync;
}>;

export type AutoAdoptionInput = Readonly<{
  repoRoot: string;
  candidate: FrozenVariant;
  frontmatterHash: string;
  resourcesHash: string;
}>;

type CanonicalSnapshot = AdoptionPlan &
  Readonly<{
    markdown: string;
    frontmatter: string;
    candidateMarkdown: string;
  }>;

type MirrorSnapshot = Readonly<{
  path: string;
  backupPath: string;
  existed: boolean;
}>;

export class AdoptionIntegrityError extends Error {
  readonly name = "AdoptionIntegrityError";
}

export class AdoptionTransactionError extends Error {
  readonly name = "AdoptionTransactionError";

  constructor(readonly transactionCause: unknown) {
    super("adoption transaction failed", { cause: transactionCause });
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined) {
    throw new AdoptionIntegrityError("canonical skill surface is invalid");
  }
  return sha256(serialized);
}

function stringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
    ? value
    : undefined;
}

function canonicalManifest(data: Record<string, unknown>) {
  const resources = stringArray(data.resources);
  const tags = stringArray(data.tags);
  const manifest = {
    id: String(data.id),
    name: String(data.name),
    description: String(data.description),
    version: String(data.version),
    kibiCompatibility: String(data.kibiCompatibility),
    ...(tags === undefined ? {} : { tags }),
    ...(resources === undefined ? {} : { resources }),
  };
  return { manifest, resources: resources ?? [] };
}

async function loadCanonicalSnapshot(
  input: AdoptionInput,
): Promise<CanonicalSnapshot> {
  validateApproval(input);
  return loadCanonicalSurface({
    repoRoot: input.repoRoot,
    candidate: input.candidate,
    frontmatterHash: input.candidate.frontmatterHash,
    resourcesHash: input.candidate.resourcesHash,
  });
}

async function loadCanonicalSurface(
  input: AutoAdoptionInput,
): Promise<CanonicalSnapshot> {
  if (input.candidate.variant !== "skillopt") {
    throw new AdoptionIntegrityError("automatic adoption requires skillopt candidate");
  }
  if (
    input.candidate.frontmatterHash !== input.frontmatterHash ||
    input.candidate.resourcesHash !== input.resourcesHash
  ) {
    throw new AdoptionIntegrityError("candidate surface hash mismatch");
  }
  validateCandidateBody(input.candidate.body);
  const canonicalPath = join(
    input.repoRoot,
    "packages/cli/src/public/skills",
    input.candidate.skill,
    "SKILL.md",
  );
  const markdown = await readFile(canonicalPath, "utf8");
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  if (frontmatterMatch === null) {
    throw new AdoptionIntegrityError("canonical frontmatter is missing");
  }
  const prefix = frontmatterMatch[0];
  const frontmatterData = z
    .record(z.string(), z.unknown())
    .parse(YAML.parse(frontmatterMatch[1] ?? ""));
  const body = markdown.slice(prefix.length);
  const { manifest, resources } = canonicalManifest(frontmatterData);
  const canonicalResources = Object.fromEntries(
    await Promise.all(
      [...resources]
        .sort()
        .map(async (resource) => [
          resource,
          await readFile(join(dirname(canonicalPath), resource), "utf8"),
        ]),
    ),
  );
  const frontmatterHash = canonicalHash(manifest);
  const resourcesHash = canonicalHash(canonicalResources);
  if (
    frontmatterHash !== input.frontmatterHash ||
    frontmatterHash !== input.candidate.frontmatterHash
  ) {
    throw new AdoptionIntegrityError("canonical frontmatter hash mismatch");
  }
  if (
    resourcesHash !== input.resourcesHash ||
    resourcesHash !== input.candidate.resourcesHash
  ) {
    throw new AdoptionIntegrityError("canonical resource hash mismatch");
  }
  return {
    skill: input.candidate.skill,
    canonicalPath,
    currentBodyHash: sha256(body),
    candidateBodyHash: input.candidate.bodyHash,
    mutationRequired: body !== input.candidate.body,
    markdown,
    frontmatter: prefix,
    candidateMarkdown: prefix + input.candidate.body,
  };
}

async function defaultRunMirrorSync(repoRoot: string): Promise<void> {
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
    if (snapshot.existed) {
      await cp(snapshot.backupPath, snapshot.path, { recursive: true });
    }
  }
}

function publicPlan(snapshot: CanonicalSnapshot): AdoptionPlan {
  return {
    skill: snapshot.skill,
    canonicalPath: snapshot.canonicalPath,
    currentBodyHash: snapshot.currentBodyHash,
    candidateBodyHash: snapshot.candidateBodyHash,
    mutationRequired: snapshot.mutationRequired,
  };
}

// implements REQ-skillopt-codex-optimization
export async function planSkillAdoption(
  input: AdoptionInput,
): Promise<AdoptionPlan> {
  const snapshot = await loadCanonicalSnapshot(input);
  return publicPlan(snapshot);
}

async function adoptSnapshot(
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

// implements REQ-skillopt-codex-optimization
export async function adoptApprovedSkill(
  input: AdoptionInput,
  dependencies: AdoptionDependencies = { runMirrorSync: defaultRunMirrorSync },
): Promise<AdoptionReceipt> {
  const snapshot = await loadCanonicalSnapshot(input);
  return adoptSnapshot(
    input.repoRoot,
    snapshot,
    dependencies,
  );
}

// implements REQ-skillopt-automatic-adoption
export async function adoptSkillOptCandidate(
  input: AutoAdoptionInput,
  dependencies: AdoptionDependencies = { runMirrorSync: defaultRunMirrorSync },
): Promise<AdoptionReceipt> {
  const snapshot = await loadCanonicalSurface(input);
  return adoptSnapshot(input.repoRoot, snapshot, dependencies);
}
