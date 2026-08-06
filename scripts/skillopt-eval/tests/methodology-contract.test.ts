import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const evaluationRoot = join(repoRoot, "documentation/evaluations/skillopt");
const methodologyPath = join(
  repoRoot,
  "documentation/facts/FACT-skillopt-methodology.md",
);

function readEvaluationFile(fileName: string): string {
  const filePath = join(evaluationRoot, fileName);
  expect(existsSync(filePath), `expected evaluation file ${filePath}`).toBe(
    true,
  );
  return readFileSync(filePath, "utf8");
}

describe("SkillOpt methodology contract", () => {
  test("publishes the Codex gate contract as machine-readable JSON", () => {
    expect(
      existsSync(methodologyPath),
      `expected methodology file ${methodologyPath}`,
    ).toBe(true);
    const methodology = readFileSync(methodologyPath, "utf8");
    const contractBlock = methodology.match(
      /```json skillopt-codex-gates\n(?<contract>[\s\S]*?)\n```/,
    )?.groups?.contract;

    const runLockSchema = JSON.parse(
      readEvaluationFile("run-lock.schema.json"),
    );

    expect(contractBlock).toBeDefined();
    expect(JSON.parse(contractBlock ?? "null")).toEqual(
      runLockSchema.properties.gates.const,
    );
  });

  test("publishes schemas for run locks and reports", () => {
    const runLockSchema = readEvaluationFile("run-lock.schema.json");
    const reportSchema = readEvaluationFile("report.schema.json");
    const preflightSchema = readEvaluationFile("preflight.schema.json");

    expect(JSON.parse(runLockSchema)).toMatchObject({ type: "object" });
    expect(JSON.parse(runLockSchema)).toMatchObject({
      properties: {
        hosts: { const: ["codex"] },
        gates: {
          const: {
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
            familyGuard: {
              maxMeanRegression: 3,
              maxHardPassRegression: 1,
            },
            bundle: {
              meanMinimum: 85,
              hardPassesMinimum: 7,
              hardPassesTotal: 8,
              meanDeltaMinimum: { baseline: 3, oneShot: 3 },
              allowHardPassLoss: false,
              maxCriticalFailures: 0,
            },
          },
        },
      },
    });
    expect(JSON.parse(reportSchema)).toMatchObject({ type: "object" });
    expect(JSON.parse(preflightSchema)).toMatchObject({ type: "object" });
  });
});
