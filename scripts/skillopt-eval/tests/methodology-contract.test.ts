import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const evaluationRoot = join(repoRoot, "documentation/evaluations/skillopt");
const methodologyPath = join(
  repoRoot,
  ".kb/facts/FACT-skillopt-methodology.md",
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
          },
        },
      },
    });
    expect(JSON.parse(reportSchema)).toMatchObject({ type: "object" });
    expect(JSON.parse(preflightSchema)).toMatchObject({ type: "object" });
  });

  test("carries no assembled-bundle gate, phase or result in the offline contracts", () => {
    const methodology = readFileSync(methodologyPath, "utf8");
    expect(methodology).not.toMatch(/bundle/i);
    for (const fileName of [
      "contract-definitions.schema.json",
      "run-lock.schema.json",
      "run-state.schema.json",
      "ledger-entry.schema.json",
      "report.schema.json",
      "proposal.schema.json",
      "approval.schema.json",
      "episode-request.schema.json",
    ]) {
      expect(readEvaluationFile(fileName)).not.toContain("bundle");
    }
    const definitions = JSON.parse(
      readEvaluationFile("contract-definitions.schema.json"),
    );
    expect(definitions.$defs.offlineSchemaVersion).toEqual({ const: "1.1.0" });
    for (const fileName of [
      "run-lock.schema.json",
      "run-state.schema.json",
      "ledger-entry.schema.json",
      "proposal.schema.json",
      "approval.schema.json",
    ]) {
      expect(
        JSON.parse(readEvaluationFile(fileName)).properties.schemaVersion,
      ).toEqual({
        $ref: "contract-definitions.schema.json#/$defs/offlineSchemaVersion",
      });
    }
  });
});
