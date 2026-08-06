import { z } from "zod";

// implements REQ-skillopt-codex-optimization
export const DEVELOPMENT_ADMISSION_GATE = {
  tasksTotal: 4,
  meanMinimum: 0.85,
  hardPassesMinimum: 3,
  worstFamilyMeanMinimum: 0.75,
} as const;

// implements REQ-skillopt-codex-optimization
export const CODEX_GATES = {
  heldOutTasksPerVariant: 16,
  familySlices: 4,
  bundleTasks: 8,
  candidate: {
    meanMinimum: 85,
    hardPassesMinimum: 13,
    hardPassesTotal: 16,
    meanDeltaMinimum: { baseline: 8, oneShot: 5 },
    hardPassDeltaMinimum: { baseline: 2, oneShot: 1 },
  },
  bootstrap: {
    resamples: 10_000,
    seed: 5417,
    confidenceLevel: 0.95,
    sidedness: "one-sided",
    lowerBoundExclusiveMinimum: 0,
    clusterUnit: "task",
  },
  familyGuard: { maxMeanRegression: 3, maxHardPassRegression: 1 },
  bundle: {
    meanMinimum: 85,
    hardPassesMinimum: 7,
    hardPassesTotal: 8,
    meanDeltaMinimum: { baseline: 3, oneShot: 3 },
    allowHardPassLoss: false,
    maxCriticalFailures: 0,
  },
} as const;

// implements REQ-skillopt-codex-optimization
export const CodexGatesSchema = z
  .object({
    heldOutTasksPerVariant: z.literal(16),
    familySlices: z.literal(4),
    bundleTasks: z.literal(8),
    candidate: z
      .object({
        meanMinimum: z.literal(85),
        hardPassesMinimum: z.literal(13),
        hardPassesTotal: z.literal(16),
        meanDeltaMinimum: z
          .object({ baseline: z.literal(8), oneShot: z.literal(5) })
          .strict(),
        hardPassDeltaMinimum: z
          .object({ baseline: z.literal(2), oneShot: z.literal(1) })
          .strict(),
      })
      .strict(),
    bootstrap: z
      .object({
        resamples: z.literal(10_000),
        seed: z.literal(5417),
        confidenceLevel: z.literal(0.95),
        sidedness: z.literal("one-sided"),
        lowerBoundExclusiveMinimum: z.literal(0),
        clusterUnit: z.literal("task"),
      })
      .strict(),
    familyGuard: z
      .object({
        maxMeanRegression: z.literal(3),
        maxHardPassRegression: z.literal(1),
      })
      .strict(),
    bundle: z
      .object({
        meanMinimum: z.literal(85),
        hardPassesMinimum: z.literal(7),
        hardPassesTotal: z.literal(8),
        meanDeltaMinimum: z
          .object({ baseline: z.literal(3), oneShot: z.literal(3) })
          .strict(),
        allowHardPassLoss: z.literal(false),
        maxCriticalFailures: z.literal(0),
      })
      .strict(),
  })
  .strict();
