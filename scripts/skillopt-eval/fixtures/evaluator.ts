import { createHash } from "node:crypto";
import type { parseTaskSpec } from "./contracts";

type FixtureTaskSpec = ReturnType<typeof parseTaskSpec>;

const VARIANTS = ["baseline", "one-shot", "skillopt"] as const;
const SLOTS = ["variant-a", "variant-b", "variant-c"] as const;

class VariantOrderError extends Error {
  readonly name = "VariantOrderError";
}

const REQUIRED_TOOLS = {
  "kibi-usage": ["kb_search", "kb_query", "kb_check"],
  "kibi-freshness": ["kb_status", "kb_query", "kb_check"],
  "kibi-traceability": ["kb_search", "kb_query", "kb_graph", "kb_check"],
  "init-kibi": ["kb_autopilot_generate", "kb_upsert", "kb_check"],
  bundle: ["kb_autopilot_generate", "kb_search", "kb_query", "kb_check"],
} as const;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// implements REQ-skillopt-codex-optimization
export function blindedVariantOrder(seed: string) {
  const ordered = VARIANTS.map((variant) => ({
    variant,
    rank: sha256(`${seed}:${variant}`),
  })).sort((left, right) => left.rank.localeCompare(right.rank));
  const [first, second, third] = ordered;
  if (first === undefined || second === undefined || third === undefined) {
    throw new VariantOrderError(
      "canonical variant set must contain three entries",
    );
  }
  return [
    { slot: SLOTS[0], variant: first.variant },
    { slot: SLOTS[1], variant: second.variant },
    { slot: SLOTS[2], variant: third.variant },
  ] as const;
}

function adversarialAssessments(task: FixtureTaskSpec) {
  const staleApplicable =
    task.skill === "kibi-freshness" || task.family.includes("repair");
  const dirtyApplicable =
    task.skill === "kibi-freshness" || task.family.includes("completion");
  return [
    {
      class: "malformed-task-descriptor" as const,
      applicable: false,
      reason:
        "The typed descriptor boundary rejects malformed input before materialization.",
    },
    {
      class: "prompt-injection" as const,
      applicable: true,
      reason:
        "Task text is serialized as inert JSON data and never interpreted as a path or command.",
    },
    {
      class: "generated-stale-state" as const,
      applicable: staleApplicable,
      reason: staleApplicable
        ? "This family includes an explicit stale generated-state fixture."
        : "This family does not evaluate freshness or bootstrap repair behavior.",
    },
    {
      class: "dirty-worktree" as const,
      applicable: dirtyApplicable,
      reason: dirtyApplicable
        ? "This family includes a dirty-worktree state marker."
        : "Dirty-worktree handling is outside this family's scored behavior.",
    },
    {
      class: "long-materialization" as const,
      applicable: false,
      reason:
        "Corpus generation is bounded local I/O with no timing-based scoring.",
    },
    {
      class: "misleading-success-output" as const,
      applicable: true,
      reason:
        "Critical final-state queries override agent-reported success text.",
    },
    {
      class: "mid-operation-interruption" as const,
      applicable: false,
      reason:
        "Interruption cleanup is a materializer harness concern, not agent task behavior.",
    },
  ];
}

// implements REQ-skillopt-codex-optimization
export function buildPrivateManifest(input: {
  readonly task: FixtureTaskSpec;
  readonly publicManifestHash: string;
  readonly workspaceHash: string;
}) {
  const tools = REQUIRED_TOOLS[input.task.skill];
  const criticalKey = `final-${input.task.family}`;
  return {
    schemaVersion: "1.0.0",
    taskId: input.task.id,
    scorerKey: `scorer-${sha256(`${input.task.fixtureSeed}:scorer`).slice(0, 16)}`,
    publicManifestHash: input.publicManifestHash,
    workspaceHash: input.workspaceHash,
    fixtureSeedHash: sha256(input.task.fixtureSeed),
    expectedFinalState: [
      {
        key: criticalKey,
        query: `state://${input.task.skill}/${input.task.family}/complete`,
        expected: true,
        critical: true,
      },
      {
        key: "workspace-isolated",
        query: "workspace://isolation/sentinel-count",
        expected: 0,
        critical: true,
      },
    ],
    orderedMcpPredicates: {
      required: tools.map((tool, index) => ({
        tool,
        predicate: `sequence=${index + 1}`,
      })),
      forbidden: [
        {
          tool: "kb_delete",
          predicate: "unless task explicitly requires removal",
        },
        { tool: "kb_upsert", predicate: "before discovery or approval" },
      ],
    },
    isolationSentinels: [
      `PRIVATE_SENTINEL_${sha256(`${input.task.fixtureSeed}:private`).slice(0, 20)}`,
      `SIBLING_SENTINEL_${sha256(`${input.task.fixtureSeed}:sibling`).slice(0, 20)}`,
    ],
    rubric: [
      {
        key: "critical-final-state",
        points: 40,
        criticalAssertionKeys: [criticalKey],
      },
      { key: "ordered-mcp-workflow", points: 30, criticalAssertionKeys: [] },
      {
        key: "isolation-and-integrity",
        points: 20,
        criticalAssertionKeys: ["workspace-isolated"],
      },
      { key: "evidence-quality", points: 10, criticalAssertionKeys: [] },
    ],
    blindedVariants: [...blindedVariantOrder(input.task.fixtureSeed)],
    adversarialAssessments: adversarialAssessments(input.task),
  };
}
