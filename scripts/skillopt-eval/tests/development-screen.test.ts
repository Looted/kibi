import { describe, expect, test } from "bun:test";
import {
  type ScreenCell,
  type ScreenSample,
  runDevelopmentScreen,
  summarizeScreen,
} from "../development-screen";
import type { PublicTaskDescriptor } from "../real-workflow-types";
import { parseScreenArgs } from "../screen-history";
import {
  type FrozenVariant,
  createBaselineVariant,
  freezeCandidateVariant,
} from "../variants";

const SURFACE = {
  frontmatterHash: "f".repeat(64),
  resourcesHash: "e".repeat(64),
};

type Checkpoint = {
  attemptedCells: number;
  cells: readonly ScreenCell[];
  status: "running" | "completed" | "failed";
  error?: string;
};

function publicDevelopmentTasks(): PublicTaskDescriptor[] {
  return [
    { id: "task-1", family: "family-1", split: "development", publicClaim: {} },
    { id: "task-2", family: "family-2", split: "development", publicClaim: {} },
    { id: "task-3", family: "family-3", split: "development", publicClaim: {} },
    { id: "task-4", family: "family-4", split: "development", publicClaim: {} },
  ];
}

function screenVariants(): FrozenVariant[] {
  const baseline = createBaselineVariant({
    skill: "kibi-usage",
    body: "Use the Kibi capability through the required interface.\n",
    ...SURFACE,
  });
  const candidateOne = freezeCandidateVariant({
    skill: "kibi-usage",
    variant: "skillopt",
    body: "Use the Kibi capability through exact lookup.\n",
    ...SURFACE,
    provenance: "skillopt",
    sourceRequestHash: "c".repeat(64),
  });
  const candidateTwo = freezeCandidateVariant({
    skill: "kibi-usage",
    variant: "skillopt",
    body: "Use the Kibi capability with bounded recovery.\n",
    ...SURFACE,
    provenance: "skillopt",
    sourceRequestHash: "d".repeat(64),
  });
  return [baseline, candidateOne, candidateTwo];
}

function sample(
  score: number,
  receiptPath = "receipt.json",
  hardPass = score >= 85,
  criticalFailures: readonly string[] = [],
): ScreenSample {
  return {
    score,
    hardPass,
    criticalFailures,
    receiptPath,
    usage: {},
  };
}

function saveCheckpoint(saved: Checkpoint[], state: Checkpoint): void {
  saved.push({ ...state, cells: [...state.cells] });
}

async function runWithTasks(
  tasks: readonly PublicTaskDescriptor[],
  evaluate: (
    variant: FrozenVariant,
    task: PublicTaskDescriptor,
    replicate: 1 | 2 | 3,
  ) => Promise<ScreenSample>,
  maxCells = 12,
): Promise<void> {
  await runDevelopmentScreen({
    variants: screenVariants(),
    tasks,
    repeats: 1,
    maxCells,
    evaluate,
    checkpoint: async () => {},
  });
}

describe("development skill screens", () => {
  test("rejects an insufficient budget before evaluating any cell", async () => {
    let evaluations = 0;
    const saved: Checkpoint[] = [];

    await expect(
      runDevelopmentScreen({
        variants: screenVariants(),
        tasks: publicDevelopmentTasks(),
        repeats: 2,
        maxCells: 23,
        evaluate: async () => {
          evaluations += 1;
          return sample(90);
        },
        checkpoint: async (state) => {
          saveCheckpoint(saved, state);
        },
      }),
    ).rejects.toThrow("screen_budget_invalid");

    expect(evaluations).toBe(0);
    expect(saved).toEqual([]);
  });

  test("requires exactly four unique public development tasks", async () => {
    const tasks = publicDevelopmentTasks();
    const invalidTaskSets: readonly PublicTaskDescriptor[][] = [
      tasks.slice(0, 3),
      tasks.map((task, index) =>
        index === 3 ? { ...task, id: tasks[0].id } : task,
      ),
      tasks.map((task, index) =>
        index === 3 ? { ...task, split: "train" as const } : task,
      ),
    ];

    for (const invalidTasks of invalidTaskSets) {
      let evaluations = 0;
      await expect(
        runWithTasks(invalidTasks, async () => {
          evaluations += 1;
          return sample(90);
        }),
      ).rejects.toThrow("screen_requires_four_public_development_tasks");
      expect(evaluations).toBe(0);
    }
  });

  test("rejects duplicate body hashes and surface mismatches before evaluation", async () => {
    const [baseline, candidateOne, candidateTwo] = screenVariants();
    const duplicateBody = freezeCandidateVariant({
      skill: "kibi-usage",
      variant: "skillopt",
      body: baseline.body,
      ...SURFACE,
      provenance: "skillopt",
    });
    const mismatchedSurface = freezeCandidateVariant({
      skill: "kibi-usage",
      variant: "skillopt",
      body: "A safe candidate with a different surface.\n",
      frontmatterHash: "a".repeat(64),
      resourcesHash: SURFACE.resourcesHash,
      provenance: "skillopt",
    });

    for (const [variants, message] of [
      [[baseline, duplicateBody, candidateTwo], "screen_duplicate_body"],
      [[baseline, candidateOne, mismatchedSurface], "screen_surface_mismatch"],
    ] as const) {
      let evaluations = 0;
      await expect(
        runDevelopmentScreen({
          variants,
          tasks: publicDevelopmentTasks(),
          repeats: 1,
          maxCells: 12,
          evaluate: async () => {
            evaluations += 1;
            return sample(90);
          },
          checkpoint: async () => {},
        }),
      ).rejects.toThrow(message);
      expect(evaluations).toBe(0);
    }
  });

  test("runs a balanced two-repeat, three-arm matrix in deterministic rotated order", async () => {
    const variants = screenVariants();
    const tasks = publicDevelopmentTasks();
    const observed: string[] = [];
    const saved: Checkpoint[] = [];
    const result = await runDevelopmentScreen({
      variants,
      tasks,
      repeats: 2,
      maxCells: 24,
      evaluate: async (variant, task, replicate) => {
        observed.push(`${replicate}:${task.id}:${variant.bodyHash}`);
        return sample(90, `receipt-${observed.length}.json`);
      },
      checkpoint: async (state) => {
        saveCheckpoint(saved, state);
      },
    });

    const expectedOrder: string[] = [];
    for (const repeat of [1, 2] as const) {
      for (const [taskIndex, task] of tasks.entries()) {
        const shift = (repeat - 1 + taskIndex) % variants.length;
        const ordered = [...variants.slice(shift), ...variants.slice(0, shift)];
        for (const variant of ordered) {
          expectedOrder.push(`${repeat}:${task.id}:${variant.bodyHash}`);
        }
      }
    }

    expect(observed).toEqual(expectedOrder);
    expect(result.attemptedCells).toBe(24);
    expect(result.cells).toHaveLength(24);
    expect(result.cells.map((cell) => cell.bodyHash)).toHaveLength(24);
    for (const variant of variants) {
      expect(
        result.cells.filter((cell) => cell.bodyHash === variant.bodyHash),
      ).toHaveLength(8);
    }
    expect(saved[0]).toMatchObject({
      attemptedCells: 1,
      cells: [],
      status: "running",
    });
    expect(saved.at(-1)).toMatchObject({
      attemptedCells: 24,
      status: "completed",
    });
    expect(saved.at(-1)?.cells).toHaveLength(24);
  });

  test("persists a failed checkpoint when a sample score is invalid", async () => {
    const saved: Checkpoint[] = [];
    let evaluations = 0;

    await expect(
      runDevelopmentScreen({
        variants: screenVariants(),
        tasks: publicDevelopmentTasks(),
        repeats: 1,
        maxCells: 12,
        evaluate: async () => {
          evaluations += 1;
          return evaluations === 1
            ? sample(80, "receipt-1.json", false)
            : sample(Number.NaN, "receipt-2.json", false);
        },
        checkpoint: async (state) => {
          saveCheckpoint(saved, state);
        },
      }),
    ).rejects.toThrow("screen_sample_invalid");

    expect(evaluations).toBe(2);
    expect(saved.at(-1)).toMatchObject({
      attemptedCells: 2,
      status: "failed",
      error: "screen_sample_invalid",
    });
    expect(saved.at(-1)?.cells).toHaveLength(1);
  });

  test("stops after an evaluator infrastructure failure and preserves successes", async () => {
    const saved: Checkpoint[] = [];
    let evaluations = 0;

    await expect(
      runDevelopmentScreen({
        variants: screenVariants(),
        tasks: publicDevelopmentTasks(),
        repeats: 1,
        maxCells: 12,
        evaluate: async () => {
          evaluations += 1;
          if (evaluations === 2) throw new Error("evaluator_unavailable");
          return sample(90, "receipt-1.json");
        },
        checkpoint: async (state) => {
          saveCheckpoint(saved, state);
        },
      }),
    ).rejects.toThrow("evaluator_unavailable");

    expect(evaluations).toBe(2);
    expect(saved.at(-1)).toMatchObject({
      attemptedCells: 2,
      status: "failed",
      error: "evaluator_unavailable",
    });
    expect(saved.at(-1)?.cells).toHaveLength(1);
  });
});

function comparisonSummary(input: {
  baselineScores: readonly number[];
  candidateScores: readonly number[];
  baselineHardPasses?: readonly boolean[];
  candidateHardPasses?: readonly boolean[];
  candidateCriticalFailures?: readonly (readonly string[])[];
  candidateSecurityFailures?: readonly (readonly string[])[];
}) {
  const [baseline, candidate] = screenVariants();
  const tasks = publicDevelopmentTasks();
  const baselineHardPasses =
    input.baselineHardPasses ?? input.baselineScores.map(() => false);
  const candidateHardPasses =
    input.candidateHardPasses ?? input.candidateScores.map(() => false);
  const candidateCriticalFailures =
    input.candidateCriticalFailures ?? input.candidateScores.map(() => []);
  const cells: ScreenCell[] = [];

  for (const [index, task] of tasks.entries()) {
    const baselineScore = input.baselineScores[index];
    const candidateScore = input.candidateScores[index];
    if (baselineScore === undefined || candidateScore === undefined) {
      throw new Error("comparison fixture requires one score per task");
    }
    cells.push({
      ...sample(baselineScore, `baseline-${index}`, baselineHardPasses[index]),
      bodyHash: baseline.bodyHash,
      taskId: task.id,
      family: task.family,
      replicate: 1,
    });
    cells.push({
      ...sample(
        candidateScore,
        `candidate-${index}`,
        candidateHardPasses[index],
        candidateCriticalFailures[index],
      ),
      bodyHash: candidate.bodyHash,
      ...(input.candidateSecurityFailures === undefined
        ? {}
        : { securityFailures: input.candidateSecurityFailures[index] }),
      taskId: task.id,
      family: task.family,
      replicate: 1,
    });
  }

  const summary = summarizeScreen(cells, [baseline, candidate])[1];
  if (summary === undefined) throw new Error("comparison summary missing");
  return summary;
}

describe("development screen summaries", () => {
  test("retains partial behavioral improvement without accepting security failures", () => {
    const input = {
      baselineScores: [40, 40, 40, 40],
      candidateScores: [45, 45, 45, 45],
      candidateCriticalFailures: [["workflow-outcome"], [], [], []],
      candidateSecurityFailures: [[], [], [], []],
    };
    expect(comparisonSummary(input).promising).toBe(true);
    expect(
      comparisonSummary({
        ...input,
        candidateSecurityFailures: [["isolation-1"], [], [], []],
      }).promising,
    ).toBe(false);
  });
  test("accepts a small positive gain without an extra hard pass or absolute floor", () => {
    const candidate = comparisonSummary({
      baselineScores: [40, 40, 40, 40],
      candidateScores: [40.1, 40.1, 40.1, 40.1],
    });

    expect(candidate.mean).toBeCloseTo(40.1);
    expect(candidate.meanDelta).toBeCloseTo(0.1);
    expect(candidate.hardPasses).toBe(0);
    expect(candidate.promising).toBe(true);
  });

  test("rejects negative gain, hard-pass loss, and critical failures", () => {
    expect(
      comparisonSummary({
        baselineScores: [40, 40, 40, 40],
        candidateScores: [39.9, 39.9, 39.9, 39.9],
      }).promising,
    ).toBe(false);
    expect(
      comparisonSummary({
        baselineScores: [90, 40, 40, 40],
        candidateScores: [90.1, 40.1, 40.1, 40.1],
        baselineHardPasses: [true, false, false, false],
        candidateHardPasses: [false, false, false, false],
      }).promising,
    ).toBe(false);
    expect(
      comparisonSummary({
        baselineScores: [40, 40, 40, 40],
        candidateScores: [40.1, 40.1, 40.1, 40.1],
        candidateCriticalFailures: [[], [], ["critical-check"], []],
      }).promising,
    ).toBe(false);
  });
});

describe("development screen CLI arguments", () => {
  test("rejects missing paid approval, invalid budgets, and duplicate hashes", () => {
    const hash = "a".repeat(64);

    expect(() =>
      parseScreenArgs(["--candidate-hash", hash, "--max-cells", "16"]),
    ).toThrow("screen_requires_allow_paid");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        hash,
        "--max-cells",
        "49",
      ]),
    ).toThrow("screen_budget_invalid");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        hash,
        "--max-cells",
        "15",
      ]),
    ).toThrow("screen_budget_invalid");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        hash,
        "--candidate-hash",
        hash,
        "--max-cells",
        "24",
      ]),
    ).toThrow("invalid_or_duplicate_candidate_hash");
  });
});
