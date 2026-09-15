import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { type ArtifactPath, prepareArtifactPath } from "./artifact-path";
import {
  type BaselineInsertionPlan,
  BaselineInsertionValidationError,
  composeBaselineInsertion,
  validateBaselineInsertionAnchor,
  validateBaselineInsertionParagraph,
} from "./baseline-insertion";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import {
  JsonValueSchema,
  Sha256Schema,
  contractHash,
} from "./contracts/common";
import { runBoundedProcess } from "./runtime/process";

const CampaignInsertionSchema = z
  .object({
    headingAnchor: z.string().min(1),
    paragraph: z.string().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (!/^ {0,3}#{1,6}[ \t]+\S.*$/.test(value.headingAnchor)) {
      context.addIssue({ code: "custom", message: "heading_anchor_invalid" });
    }
    if (Buffer.byteLength(value.paragraph, "utf8") > 1_600) {
      context.addIssue({ code: "custom", message: "paragraph_too_large" });
    }
  });

const ModelProvenanceSchema = z
  .object({
    kind: z.literal("model"),
    modelSource: z.literal("runCodexSkillOptStep"),
    objectiveHash: Sha256Schema,
    modelReceipt: z.record(z.string(), JsonValueSchema),
  })
  .strict();

const HostProvenanceSchema = z
  .object({
    kind: z.literal("host-composed"),
    modelSource: z.literal("none"),
  })
  .strict();

export const CampaignManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-campaign-manifest"),
    skill: z.enum(CANONICAL_SKILLS),
    baselineBodyHash: Sha256Schema,
    frontmatterHash: Sha256Schema,
    resourcesHash: Sha256Schema,
    insertions: z.array(CampaignInsertionSchema).min(1).max(4),
    frozenBody: z.string().min(1),
    frozenBodyHash: Sha256Schema,
    provenance: z.union([ModelProvenanceSchema, HostProvenanceSchema]),
  })
  .strict();

export type CampaignInsertion = z.infer<typeof CampaignInsertionSchema>;
export type CampaignManifest = z.infer<typeof CampaignManifestSchema>;
export type CampaignModelProvenance = z.infer<typeof ModelProvenanceSchema>;
export type CampaignSourceSurface = Readonly<{
  body: string;
  frontmatterHash: string;
  resourcesHash: string;
}>;

const BundleManifestEntrySchema = z.discriminatedUnion("arm", [
  z
    .object({
      skill: z.enum(CANONICAL_SKILLS),
      arm: z.literal("baseline"),
    })
    .strict(),
  z
    .object({
      skill: z.enum(CANONICAL_SKILLS),
      arm: z.literal("candidate"),
      manifestPath: z.string().min(1),
    })
    .strict(),
]);

export const BundleManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-bundle-manifest"),
    entries: z.array(BundleManifestEntrySchema).length(CANONICAL_SKILLS.length),
  })
  .strict()
  .superRefine((value, context) => {
    const skills = value.entries.map((entry) => entry.skill);
    if (new Set(skills).size !== CANONICAL_SKILLS.length) {
      context.addIssue({ code: "custom", message: "bundle_skill_duplicate" });
    }
  });

export type BundleManifest = z.infer<typeof BundleManifestSchema>;
export type BundleCandidateManifest = Readonly<{
  bundle: BundleManifest;
  candidates: ReadonlyMap<CanonicalSkill, CampaignManifest>;
}>;

export class CampaignArtifactError extends Error {
  readonly name = "CampaignArtifactError";

  constructor(readonly code: string) {
    super(code);
  }
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function manifestHash(manifest: CampaignManifest): string {
  return contractHash(JsonValueSchema.parse(manifest));
}

function composePlan(
  surface: CampaignSourceSurface,
  headingAnchor: string,
): BaselineInsertionPlan {
  return {
    currentBaselineBodyHash: sha256Text(surface.body),
    frontmatterHash: surface.frontmatterHash,
    resourcesHash: surface.resourcesHash,
    headingAnchor,
    objective: "Compose a baseline-preserving insertion.",
  };
}

/**
 * Each model paragraph is validated and located against the same immutable
 * source body. Applying offsets in descending order makes composition
 * independent of the other insertions; the inverse pass proves exact recovery.
 */
// implements REQ-skillopt-codex-optimization; narrow campaign MR ownership.
export function composeCampaignManifest(
  input: Readonly<{
    skill: CanonicalSkill;
    surface: CampaignSourceSurface;
    insertions: readonly CampaignInsertion[];
    provenance: CampaignManifest["provenance"];
  }>,
): CampaignManifest {
  if (input.insertions.length < 1 || input.insertions.length > 4) {
    throw new CampaignArtifactError("insertion_count_invalid");
  }
  const composed = input.insertions.map((insertion) => {
    const plan = composePlan(input.surface, insertion.headingAnchor);
    try {
      validateBaselineInsertionAnchor(input.surface.body, plan.headingAnchor);
      validateBaselineInsertionParagraph(insertion.paragraph, plan);
      return {
        insertion,
        result: composeBaselineInsertion({
          baselineBody: input.surface.body,
          paragraph: insertion.paragraph,
          plan,
        }),
      };
    } catch (error) {
      if (error instanceof BaselineInsertionValidationError) {
        throw new CampaignArtifactError(error.message);
      }
      throw error;
    }
  });
  const offsets = composed.map(({ result }) => result.insertionOffset);
  if (new Set(offsets).size !== offsets.length) {
    throw new CampaignArtifactError("insertion_anchor_duplicate");
  }

  let frozenBody = input.surface.body;
  const descending = [...composed].sort(
    (left, right) => right.result.insertionOffset - left.result.insertionOffset,
  );
  for (const { result } of descending) {
    frozenBody =
      frozenBody.slice(0, result.insertionOffset) +
      result.insertion +
      frozenBody.slice(result.insertionOffset);
  }

  let inverse = frozenBody;
  for (const { result } of [...composed].sort(
    (left, right) => left.result.insertionOffset - right.result.insertionOffset,
  )) {
    const expected = inverse.slice(
      result.insertionOffset,
      result.insertionOffset + result.insertion.length,
    );
    if (expected !== result.insertion) {
      throw new CampaignArtifactError("composition_inverse_mismatch");
    }
    inverse =
      inverse.slice(0, result.insertionOffset) +
      inverse.slice(result.insertionOffset + result.insertion.length);
  }
  if (inverse !== input.surface.body) {
    throw new CampaignArtifactError("composition_baseline_changed");
  }

  const manifest = CampaignManifestSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign-manifest",
    skill: input.skill,
    baselineBodyHash: sha256Text(input.surface.body),
    frontmatterHash: input.surface.frontmatterHash,
    resourcesHash: input.surface.resourcesHash,
    insertions: input.insertions.map(({ headingAnchor, paragraph }) => ({
      headingAnchor,
      paragraph,
    })),
    frozenBody,
    frozenBodyHash: sha256Text(frozenBody),
    provenance: input.provenance,
  });
  return manifest;
}

// implements REQ-skillopt-codex-optimization; narrow campaign MR ownership.
export function validateCampaignManifestAgainstSurface(
  manifest: CampaignManifest,
  surface: CampaignSourceSurface,
): void {
  const parsed = CampaignManifestSchema.parse(manifest);
  if (
    parsed.baselineBodyHash !== sha256Text(surface.body) ||
    parsed.frontmatterHash !== surface.frontmatterHash ||
    parsed.resourcesHash !== surface.resourcesHash
  ) {
    throw new CampaignArtifactError("manifest_surface_mismatch");
  }
  if (parsed.frozenBodyHash !== sha256Text(parsed.frozenBody)) {
    throw new CampaignArtifactError("manifest_body_hash_mismatch");
  }
  const recomposed = composeCampaignManifest({
    skill: parsed.skill,
    surface,
    insertions: parsed.insertions,
    provenance: parsed.provenance,
  });
  if (
    recomposed.frozenBodyHash !== parsed.frozenBodyHash ||
    recomposed.frozenBody !== parsed.frozenBody
  ) {
    throw new CampaignArtifactError("manifest_composition_mismatch");
  }
}

export async function readCampaignManifest(
  path: string,
): Promise<CampaignManifest> {
  try {
    return CampaignManifestSchema.parse(
      JSON.parse(await readFile(resolve(path), "utf8")),
    );
  } catch (error) {
    if (error instanceof CampaignArtifactError) throw error;
    throw new CampaignArtifactError("manifest_invalid");
  }
}

export async function readBundleCandidateManifest(
  path: string,
): Promise<BundleCandidateManifest> {
  const bundle = await readBundleManifest(path);
  const candidates = new Map<CanonicalSkill, CampaignManifest>();
  for (const entry of bundle.entries) {
    if (entry.arm === "baseline") continue;
    const manifest = await readCampaignManifest(
      resolveBundleCampaignManifestPath(path, entry.manifestPath),
    );
    if (manifest.skill !== entry.skill) {
      throw new CampaignArtifactError("bundle_candidate_skill_mismatch");
    }
    candidates.set(entry.skill, manifest);
  }
  return { bundle, candidates };
}

export async function readBundleManifest(
  path: string,
): Promise<BundleManifest> {
  try {
    return BundleManifestSchema.parse(
      JSON.parse(await readFile(resolve(path), "utf8")),
    );
  } catch (error) {
    if (error instanceof CampaignArtifactError) throw error;
    throw new CampaignArtifactError("bundle_manifest_invalid");
  }
}

export function resolveBundleCampaignManifestPath(
  bundleManifestPath: string,
  manifestPath: string,
): string {
  return resolve(dirname(resolve(bundleManifestPath)), manifestPath);
}

const FeedbackItemSchema = z
  .object({
    family: z.string().min(1).max(200),
    observation: z.string().min(1).max(4_000),
    hypothesis: z.string().min(1).max(4_000).optional(),
    toolSequence: z.array(z.string().min(1).max(200)).max(32).optional(),
  })
  .strict();

export const PublicFeedbackSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    observations: z.array(FeedbackItemSchema).max(32),
  })
  .strict();
export type PublicFeedback = z.infer<typeof PublicFeedbackSchema>;

function rejectPrivateFeedback(value: unknown): void {
  if (typeof value === "string") {
    if (
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
        value,
      ) ||
      /\b(?:task|episode|run|fixture|private|held[- ]?out)[-_][a-z0-9-]*\d/i.test(
        value,
      )
    ) {
      throw new CampaignArtifactError("public_feedback_private_id");
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) rejectPrivateFeedback(item);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (/(?:id|run|episode|fixture|private|heldout|task)/i.test(key)) {
        throw new CampaignArtifactError("public_feedback_private_field");
      }
      rejectPrivateFeedback(item);
    }
  }
}

// implements REQ-skillopt-codex-optimization; narrow campaign MR ownership.
export function parsePublicFeedback(value: unknown): PublicFeedback {
  rejectPrivateFeedback(value);
  return PublicFeedbackSchema.parse(value);
}

export async function readPublicFeedback(
  path: string,
): Promise<PublicFeedback> {
  try {
    return parsePublicFeedback(
      JSON.parse(await readFile(resolve(path), "utf8")),
    );
  } catch (error) {
    if (error instanceof CampaignArtifactError) throw error;
    throw new CampaignArtifactError("public_feedback_invalid");
  }
}

export function feedbackTrajectories(feedback: PublicFeedback) {
  return feedback.observations.map((item) => ({
    taskId: item.family,
    family: item.family,
    reflection: [item.observation, item.hypothesis].filter(Boolean).join("\n"),
    toolSequence: item.toolSequence ?? [],
  }));
}

export type SourceFence = Readonly<{
  head: string;
  treeHash: string;
  files: number;
}>;

// implements REQ-skillopt-codex-optimization; narrow campaign MR ownership.
export async function defaultSourceFence(root: string): Promise<SourceFence> {
  const [headResult, treeResult] = await Promise.all([
    runBoundedProcess({
      argv: ["git", "rev-parse", "HEAD"],
      cwd: root,
      env: process.env,
      timeoutMs: 10_000,
    }),
    runBoundedProcess({
      argv: ["git", "ls-tree", "-r", "-z", "HEAD", "--"],
      cwd: root,
      env: process.env,
      timeoutMs: 10_000,
    }),
  ]);
  if (headResult.exitCode !== 0)
    throw new CampaignArtifactError(`git_head:${headResult.stderr.trim()}`);
  if (treeResult.exitCode !== 0)
    throw new CampaignArtifactError(`git_tree:${treeResult.stderr.trim()}`);
  const entries = treeResult.stdout
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separator = entry.indexOf("\t");
      if (separator < 0) throw new CampaignArtifactError("git_tree_invalid");
      const [mode, type, object] = entry.slice(0, separator).split(" ");
      const path = entry.slice(separator + 1);
      if (
        mode === undefined ||
        type === undefined ||
        object === undefined ||
        path.length === 0
      ) {
        throw new CampaignArtifactError("git_tree_invalid");
      }
      return { mode, type, object, path };
    });
  const head = headResult.stdout.trim();
  if (!/^[0-9a-f]{7,64}$/.test(head))
    throw new CampaignArtifactError("git_head_invalid");
  return {
    head,
    treeHash: contractHash(JsonValueSchema.parse(entries)),
    files: entries.length,
  };
}

export class CampaignArtifactStore {
  private constructor(readonly artifactPath: ArtifactPath) {}

  static async open(
    options: Readonly<{ artifactRoot: string; sourceRoot: string }>,
  ) {
    const artifactPath = await prepareArtifactPath({
      artifactRoot: options.artifactRoot,
      sourceRoot: options.sourceRoot,
      canonicalRoots: [options.sourceRoot],
    });
    try {
      const existing = JSON.parse(await artifactPath.readText("campaign.json"));
      if (existing?.status === "complete") {
        await artifactPath.close();
        throw new CampaignArtifactError("artifact_run_complete");
      }
    } catch (error) {
      if (
        !(error instanceof CampaignArtifactError) &&
        !(error instanceof SyntaxError)
      ) {
        const code =
          error instanceof Error && "code" in error ? error.code : undefined;
        if (code !== "ENOENT") {
          await artifactPath.close();
          throw error;
        }
      } else if (error instanceof CampaignArtifactError) {
        throw error;
      }
    }
    return new CampaignArtifactStore(artifactPath);
  }

  get root(): string {
    return this.artifactPath.path;
  }

  async writeJson(name: string, value: unknown): Promise<void> {
    await this.artifactPath.writeText(
      name,
      `${JSON.stringify(value, null, 2)}\n`,
    );
  }

  async writeText(name: string, value: string): Promise<void> {
    await this.artifactPath.writeText(name, value);
  }

  async close(): Promise<void> {
    await this.artifactPath.close();
  }
}
