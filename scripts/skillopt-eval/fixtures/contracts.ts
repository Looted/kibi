import { z } from "zod";
import { CANONICAL_SKILLS } from "../catalog";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const VariantSchema = z.enum(["baseline", "one-shot", "skillopt"]);
const TaskSpecSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    skill: z.enum([...CANONICAL_SKILLS, "bundle"]),
    family: z.string().regex(/^[a-z0-9-]+$/),
    split: z.enum(["train", "development", "held-out"]),
    fixtureSeed: Sha256Schema,
    prompt: z.string().min(1).max(100_000),
  })
  .strict();

const PublicTaskManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    task: TaskSpecSchema.omit({ fixtureSeed: true }).extend({
      host: z.literal("codex"),
    }),
    workspaceHash: Sha256Schema,
    blindVariantSlots: z.tuple([
      z.literal("variant-a"),
      z.literal("variant-b"),
      z.literal("variant-c"),
    ]),
  })
  .strict();

const AssertionSchema = z
  .object({
    key: z.string().min(1),
    query: z.string().min(1),
    expected: z.union([z.string(), z.number(), z.boolean()]),
    critical: z.boolean(),
  })
  .strict();

const McpPredicateSchema = z
  .object({
    tool: z.string().regex(/^kb_[a-z_]+$/),
    predicate: z.string().min(1),
  })
  .strict();

const RubricItemSchema = z
  .object({
    key: z.string().min(1),
    points: z.int().positive(),
    criticalAssertionKeys: z.array(z.string().min(1)),
  })
  .strict();

const AdversarialAssessmentSchema = z
  .object({
    class: z.enum([
      "malformed-task-descriptor",
      "prompt-injection",
      "generated-stale-state",
      "dirty-worktree",
      "long-materialization",
      "misleading-success-output",
      "mid-operation-interruption",
    ]),
    applicable: z.boolean(),
    reason: z.string().min(1),
  })
  .strict();

const PrivateEvaluatorManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    taskId: z.string().min(1),
    scorerKey: z.string().regex(/^scorer-[a-f0-9]{16}$/),
    publicManifestHash: Sha256Schema,
    workspaceHash: Sha256Schema,
    fixtureSeedHash: Sha256Schema,
    expectedFinalState: z.array(AssertionSchema).min(1),
    orderedMcpPredicates: z
      .object({
        required: z.array(McpPredicateSchema).min(1),
        forbidden: z.array(McpPredicateSchema).min(1),
      })
      .strict(),
    isolationSentinels: z.array(z.string().min(1)).min(2),
    rubric: z
      .array(RubricItemSchema)
      .min(1)
      .refine(
        (items) => items.reduce((sum, item) => sum + item.points, 0) === 100,
        "rubric points must sum to 100",
      ),
    blindedVariants: z.tuple([
      z
        .object({ slot: z.literal("variant-a"), variant: VariantSchema })
        .strict(),
      z
        .object({ slot: z.literal("variant-b"), variant: VariantSchema })
        .strict(),
      z
        .object({ slot: z.literal("variant-c"), variant: VariantSchema })
        .strict(),
    ]),
    adversarialAssessments: z.array(AdversarialAssessmentSchema).length(7),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (!manifest.expectedFinalState.some((assertion) => assertion.critical)) {
      context.addIssue({
        code: "custom",
        message: "at least one final-state assertion must be critical",
      });
    }
    if (
      new Set(manifest.blindedVariants.map(({ variant }) => variant)).size !== 3
    ) {
      context.addIssue({
        code: "custom",
        message: "blinded variants must contain every variant exactly once",
      });
    }
  });

const CorpusIndexSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    corpusHash: Sha256Schema,
    tasks: z.array(
      z
        .object({
          taskId: z.string().min(1),
          manifestHash: Sha256Schema,
          workspaceHash: Sha256Schema,
        })
        .strict(),
    ),
  })
  .strict();

type PublicTaskManifest = Readonly<z.infer<typeof PublicTaskManifestSchema>>;
type PrivateEvaluatorManifest = Readonly<
  z.infer<typeof PrivateEvaluatorManifestSchema>
>;
type FixtureTaskSpec = Readonly<z.infer<typeof TaskSpecSchema>>;

// implements REQ-skillopt-codex-optimization
export function parseTaskSpec(value: unknown): FixtureTaskSpec {
  return TaskSpecSchema.parse(value);
}

// implements REQ-skillopt-codex-optimization
export function parsePublicTaskManifest(text: string): PublicTaskManifest {
  return PublicTaskManifestSchema.parse(JSON.parse(text));
}

// implements REQ-skillopt-codex-optimization
export function parsePrivateEvaluatorManifest(
  text: string,
): PrivateEvaluatorManifest {
  return PrivateEvaluatorManifestSchema.parse(JSON.parse(text));
}

// implements REQ-skillopt-codex-optimization
export function parsePublicTaskManifestValue(value: unknown) {
  return PublicTaskManifestSchema.parse(value);
}

// implements REQ-skillopt-codex-optimization
export function parsePrivateEvaluatorManifestValue(value: unknown) {
  return PrivateEvaluatorManifestSchema.parse(value);
}

// implements REQ-skillopt-codex-optimization
export function parseCorpusIndexValue(value: unknown) {
  return CorpusIndexSchema.parse(value);
}
