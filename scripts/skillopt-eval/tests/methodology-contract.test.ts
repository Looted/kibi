import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const evaluationRoot = join(repoRoot, "documentation/evaluations/skillopt");

function readEvaluationFile(fileName: string): string {
  const filePath = join(evaluationRoot, fileName);
  expect(existsSync(filePath), `expected evaluation file ${filePath}`).toBe(
    true,
  );
  return readFileSync(filePath, "utf8");
}

describe("SkillOpt methodology contract", () => {
  test("declares the frozen corpus, score, and budget constants", () => {
    const methodology = readEvaluationFile("methodology.md");

    expect(methodology).toContain("8 train");
    expect(methodology).toContain("4 development");
    expect(methodology).toContain("16 held-out");
    expect(methodology).toContain("60 final repo/KB state");
    expect(methodology).toContain("25 required Kibi protocol behavior");
    expect(methodology).toContain("15 isolation/forbidden effects");
    expect(methodology).toContain("5417");
    expect(methodology).toContain("USD 100");
  });

  test("publishes schemas for run locks and reports", () => {
    const runLockSchema = readEvaluationFile("run-lock.schema.json");
    const reportSchema = readEvaluationFile("report.schema.json");
    const preflightSchema = readEvaluationFile("preflight.schema.json");

    expect(JSON.parse(runLockSchema)).toMatchObject({ type: "object" });
    expect(JSON.parse(reportSchema)).toMatchObject({ type: "object" });
    expect(JSON.parse(preflightSchema)).toMatchObject({ type: "object" });
  });
});
