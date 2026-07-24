import { z } from "zod";
import { CANONICAL_SKILLS } from "../catalog";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const SplitSchema = z.enum(["train", "development", "held-out"]);
const AdversarialCaseSchema = z.enum([
  "malformed-input",
  "prompt-injection",
  "dirty-state",
  "stale-state",
  "misleading-success",
  "interruption-cleanup",
  "approval-boundary",
]);

const InitialStateSchema = z
  .object({
    repository: z.enum(["cold-start", "partial", "thin", "seeded"]),
    kb: z.enum(["absent", "partial", "fresh", "stale"]),
    worktree: z.enum(["clean", "dirty"]),
    setupBoundary: z.literal("external-kibi-adapter"),
  })
  .strict();

const TaskDataSchema = z
  .object({
    objectiveCode: z.string().regex(/^[a-z0-9_]+$/),
    sourceFile: z.string().min(1),
    mutation: z.enum(["read-only", "write"]),
    approvalPhase: z.enum(["not-applicable", "pre-approval", "post-approval"]),
    adversarialCases: z.array(AdversarialCaseSchema),
  })
  .strict();

const TaskSpecObjectSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    skill: z.enum([...CANONICAL_SKILLS, "bundle"]),
    family: z.string().regex(/^[a-z0-9-]+$/),
    split: SplitSchema,
    fixtureSeed: Sha256Schema,
    prompt: z.string().min(1).max(100_000),
    activationMode: z.enum([
      "cold_start_bootstrap",
      "repair_bootstrap",
      "attached_thin_handoff",
      "attached_seeded_handoff",
    ]),
    initialState: InitialStateSchema,
    allowedPublicFiles: z.array(z.string().min(1)).min(1),
    scorerReference: z.string().regex(/^scorer-ref-[a-f0-9]{16}$/),
    taskData: TaskDataSchema,
  })
  .strict();

const TaskSpecSchema = TaskSpecObjectSchema.superRefine((task, context) => {
  if (
    task.initialState.worktree === "dirty" &&
    !task.taskData.adversarialCases.includes("dirty-state")
  ) {
    context.addIssue({
      code: "custom",
      message: "dirty state requires dirty-state metadata",
    });
  }
  if (
    task.initialState.kb === "stale" &&
    !task.taskData.adversarialCases.includes("stale-state")
  ) {
    context.addIssue({
      code: "custom",
      message: "stale KB requires stale-state metadata",
    });
  }
});

const PublicTaskSchema = TaskSpecObjectSchema.omit({
  fixtureSeed: true,
  scorerReference: true,
}).extend({ host: z.literal("codex") });

const ManifestBaseSchema = z
  .object({
    schemaVersion: z.literal("1.1.0"),
    workspaceHash: Sha256Schema,
    blindVariantSlots: z.tuple([
      z.literal("variant-a"),
      z.literal("variant-b"),
      z.literal("variant-c"),
    ]),
  })
  .strict();

const PublicTaskManifestSchema = ManifestBaseSchema.extend({
  task: PublicTaskSchema.extend({ split: z.enum(["train", "development"]) }),
}).superRefine((manifest, context) => {
  const serialized = JSON.stringify(manifest);
  if (/"(?:baseline|one-shot|skillopt)"/.test(serialized)) {
    context.addIssue({
      code: "custom",
      message: "public manifest exposes a variant label",
    });
  }
});

const HeldOutTaskManifestSchema = ManifestBaseSchema.extend({
  task: PublicTaskSchema.extend({ split: z.literal("held-out") }),
});

const CorpusEntrySchema = z
  .object({
    taskId: z.string().min(1),
    manifestHash: Sha256Schema,
    workspaceHash: Sha256Schema,
  })
  .strict();

const CorpusIndexSchema = z
  .object({
    schemaVersion: z.literal("1.1.0"),
    corpusHash: Sha256Schema,
    tasks: z.array(CorpusEntrySchema),
  })
  .strict();

type FixtureTaskSpec = Readonly<z.infer<typeof TaskSpecSchema>>;
type PublicTaskManifest = Readonly<z.infer<typeof PublicTaskManifestSchema>>;
type HeldOutTaskManifest = Readonly<z.infer<typeof HeldOutTaskManifestSchema>>;

// implements REQ-skillopt-codex-optimization
export function parseTaskSpec(value: unknown): FixtureTaskSpec {
  return TaskSpecSchema.parse(value);
}

// implements REQ-skillopt-codex-optimization
export function parsePublicTaskSpec(value: unknown): FixtureTaskSpec {
  return TaskSpecSchema.refine((task) => task.split !== "held-out", {
    message: "public APIs reject held-out task descriptors",
  }).parse(value);
}

// implements REQ-skillopt-codex-optimization
export function parseHeldOutTaskSpec(value: unknown): FixtureTaskSpec {
  return TaskSpecSchema.refine((task) => task.split === "held-out", {
    message: "held-out APIs require held-out task descriptors",
  }).parse(value);
}

// implements REQ-skillopt-codex-optimization
export function parsePublicTaskManifest(text: string): PublicTaskManifest {
  return PublicTaskManifestSchema.parse(JSON.parse(text));
}

// implements REQ-skillopt-codex-optimization
export function parseHeldOutTaskManifest(text: string): HeldOutTaskManifest {
  return HeldOutTaskManifestSchema.parse(JSON.parse(text));
}

export function parsePublicTaskManifestValue(value: unknown) {
  return PublicTaskManifestSchema.parse(value);
}

export function parseHeldOutTaskManifestValue(value: unknown) {
  return HeldOutTaskManifestSchema.parse(value);
}

export function parseCorpusIndexValue(value: unknown) {
  return CorpusIndexSchema.parse(value);
}
