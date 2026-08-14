import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const VariantSchema = z.enum(["baseline", "one-shot", "skillopt"]);
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
const AssessmentSchema = z
  .object({
    class: z.enum([
      "malformed-task-descriptor",
      "prompt-injection",
      "generated-stale-state",
      "dirty-worktree",
      "long-materialization",
      "misleading-success-output",
      "mid-operation-interruption",
      "approval-boundary",
    ]),
    applicable: z.boolean(),
    reason: z.string().min(1),
    fixturePath: z.string().min(1).nullable(),
    approvalPhase: z.enum(["not-applicable", "pre-approval", "post-approval"]),
  })
  .strict();

const RubricSchema = z.tuple([
  z
    .object({
      key: z.literal("final_state"),
      points: z.literal(60),
      criticalAssertionKeys: z.array(z.string().min(1)).min(1),
    })
    .strict(),
  z
    .object({
      key: z.literal("protocol"),
      points: z.literal(25),
      criticalAssertionKeys: z.array(z.string().min(1)),
    })
    .strict(),
  z
    .object({
      key: z.literal("isolation"),
      points: z.literal(15),
      criticalAssertionKeys: z.array(z.string().min(1)).min(1),
    })
    .strict(),
]);

const PredicateExpectationSchema = z
  .object({
    semanticClass: z.enum([
      "builtin_relational",
      "strict_scalar_counterexample",
      "project_local_schema",
      "deny_polarity",
      "ambiguous",
      "ontology_gap",
      "keyword_false_positive",
    ]),
    expectedLane: z.enum([
      "predicate",
      "strict_property",
      "observation",
      "ontology_gap_observation",
      "rule",
    ]),
    expectedPredicateName: z.string().min(1).nullable(),
    expectedPredicateArgs: z.array(z.string().min(1)).nullable(),
    expectedPolarity: z.enum(["assert", "deny"]).nullable(),
    expectedEdges: z.array(
      z
        .object({
          relationship: z.string().min(1),
          target: z.string().min(1),
        })
        .strict(),
    ),
    expectedGroundFactKinds: z.array(
      z.enum([
        "subject",
        "property_value",
        "predicate",
        "rule_schema",
        "rule",
        "observation",
      ]),
    ),
    expectedLogicClaimCount: z.number().int().nonnegative(),
    privateRationale: z.string().min(1),
    expectedRuleSemanticKey: z
      .string()
      .regex(/^SEM-[A-F0-9]{24}$/)
      .nullable()
      .optional(),
    expectedRuleHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable()
      .optional(),
    coverageFamilies: z.array(z.string().min(1)).default([]),
  })
  .strict();

const WorkflowExpectationSchema = z
  .object({
    expectedOutcome: z.enum(["complete", "interim", "blocked"]),
    expectedKbState: z.enum([
      "clean_fresh",
      "stale",
      "dirty",
      "legacy_compat",
      "not_evaluated",
    ]),
    expectedVerificationState: z.enum([
      "fresh",
      "dirty",
      "unavailable",
      "not_evaluated",
    ]),
    expectedProofState: z.enum([
      "proven",
      "mixed",
      "unresolved",
      "not_evaluated",
    ]),
    expectedLimitationDisposition: z.enum([
      "none",
      "accepted",
      "unaccepted",
      "not_applicable",
    ]),
    closeout: z
      .object({
        taskOutcome: z.enum(["complete", "interim", "blocked"]),
        kbState: z.enum([
          "clean_fresh",
          "stale",
          "dirty",
          "legacy_compat",
          "not_evaluated",
        ]),
        verificationState: z.enum([
          "fresh",
          "dirty",
          "unavailable",
          "not_evaluated",
        ]),
        proofState: z.enum(["proven", "mixed", "unresolved", "not_evaluated"]),
        limitationDisposition: z.enum([
          "none",
          "accepted",
          "unaccepted",
          "not_applicable",
        ]),
      })
      .strict(),
    requiredSignals: z.array(z.string().min(1)),
    forbiddenActions: z.array(z.string().min(1)),
  })
  .strict();

const PrivateEvaluatorManifestSchema = z
  .object({
    schemaVersion: z.literal("1.1.0"),
    taskId: z.string().min(1),
    scorerKey: z.string().regex(/^scorer-[a-f0-9]{16}$/),
    scorerReference: z.string().regex(/^scorer-ref-[a-f0-9]{16}$/),
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
    rubric: RubricSchema,
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
    adversarialAssessments: z.array(AssessmentSchema).length(8),
    predicateExpectation: PredicateExpectationSchema.nullable().default(null),
    workflowExpectation: WorkflowExpectationSchema.nullable().default(null),
  })
  .strict()
  .superRefine((manifest, context) => {
    const critical = new Set(
      manifest.expectedFinalState
        .filter((assertion) => assertion.critical)
        .map((assertion) => assertion.key),
    );
    const rubricKeys = new Set(
      manifest.rubric.flatMap((item) => item.criticalAssertionKeys),
    );
    if ([...critical].some((key) => !rubricKeys.has(key))) {
      context.addIssue({
        code: "custom",
        message: "critical final-state keys must be allocated",
      });
    }
    if (
      new Set(manifest.blindedVariants.map(({ variant }) => variant)).size !== 3
    ) {
      context.addIssue({
        code: "custom",
        message: "blinded variants must be unique",
      });
    }
  });

type PrivateEvaluatorManifest = Readonly<
  z.infer<typeof PrivateEvaluatorManifestSchema>
>;

// implements REQ-skillopt-codex-optimization
export function parsePrivateEvaluatorManifest(
  text: string,
): PrivateEvaluatorManifest {
  return PrivateEvaluatorManifestSchema.parse(JSON.parse(text));
}

export function parsePrivateEvaluatorManifestValue(value: unknown) {
  return PrivateEvaluatorManifestSchema.parse(value);
}
