// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateCursorVerdict,
  persistCursorCompatibilityReport,
  runCursorCompatibilityGate,
  summarizeCursorCells,
} from "../cursor/suite";
import type { CursorCellReceipt } from "../cursor/types";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function qualification(verdict: "pass" | "no-go" = "pass") {
  return {
    schemaVersion: "1.0.0" as const,
    artifactType: "skillopt-cursor-qualification" as const,
    verdict,
    cursorVersion: "test",
    reasons: verdict === "pass" ? [] : ["cursor_not_authenticated"],
    checks: [],
    paidModelCalls: 0 as const,
  };
}

describe("cursor suite leftovers", () => {
  test("evaluateCursorVerdict reports missing skillopt cells and persist writes the report", async () => {
    expect(
      evaluateCursorVerdict({
        phase: "development",
        qualification: qualification(),
        summaries: [],
      }),
    ).toMatchObject({
      verdict: "incompatible",
      reasons: ["cursor:no-candidate-cells"],
    });
    expect(
      evaluateCursorVerdict({
        phase: "development",
        qualification: qualification(),
        summaries: [
          {
            variant: "skillopt",
            cells: 0,
            hardPasses: 0,
            meanScore: 0,
            securityFailures: 0,
          },
        ],
      }),
    ).toMatchObject({ reasons: ["cursor:no-candidate-cells"] });
    expect(
      evaluateCursorVerdict({
        phase: "development",
        qualification: qualification(),
        summaries: [
          {
            variant: "skillopt",
            cells: 4,
            hardPasses: 1,
            meanScore: 40,
            securityFailures: 0,
          },
        ],
      }).reasons,
    ).toEqual(
      expect.arrayContaining([
        "cursor:mean-below-floor",
        "cursor:hard-pass-rate-below-floor",
      ]),
    );

    expect(
      evaluateCursorVerdict({
        phase: "development",
        qualification: qualification("no-go"),
        summaries: [],
      }),
    ).toMatchObject({
      verdict: "not-qualified",
      reasons: ["cursor_not_authenticated"],
    });
    expect(
      evaluateCursorVerdict({
        phase: "held-out",
        qualification: qualification(),
        summaries: [],
      }),
    ).toMatchObject({ verdict: "informational", reasons: [] });
    expect(
      evaluateCursorVerdict({
        phase: "development",
        qualification: qualification(),
        summaries: [
          {
            variant: "skillopt",
            cells: 2,
            hardPasses: 2,
            meanScore: 90,
            securityFailures: 1,
          },
        ],
      }).reasons,
    ).toContain("cursor:security-failures");
    expect(
      evaluateCursorVerdict({
        phase: "development",
        qualification: qualification(),
        summaries: [
          {
            variant: "skillopt",
            cells: 2,
            hardPasses: 2,
            meanScore: 90,
            securityFailures: 0,
          },
        ],
      }).verdict,
    ).toBe("compatible");

    expect(summarizeCursorCells([])).toEqual([]);
    const isolated = summarizeCursorCells([
      {
        taskId: "t1",
        variant: "skillopt",
        result: {
          hard: 1,
          score: 80,
          criticalFailures: ["isolation-escape"],
        },
      } as never,
    ]);
    expect(isolated[0]?.securityFailures).toBe(1);

    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-cursor-persist-"));
    roots.push(artifactRoot);
    const report = await runCursorCompatibilityGate({
      runId: "empty-candidates",
      skill: "kibi-usage",
      phase: "held-out",
      fixtureRunRoot: join(artifactRoot, "missing"),
      sourceWorktree: process.cwd(),
      artifactRoot,
      cursorExecutable: "cursor-agent",
      hostVersion: "test",
      candidates: [
        { variant: "baseline", body: "baseline" },
        { variant: "skillopt", body: "candidate" },
      ],
      qualification: qualification("no-go"),
    });
    expect(report.phase).toBe("held-out");
    expect(report.cells).toEqual([]);
    const path = await persistCursorCompatibilityReport(artifactRoot, report);
    expect(path).toEndWith("cursor-compat.json");
    const stored = JSON.parse(await readFile(path, "utf8")) as typeof report;
    expect(stored.runId).toBe("empty-candidates");
  });

  test("loadTaskManifest reads train/development/held-out locations and missing files", async () => {
    const fixtureRunRoot = await mkdtemp(join(tmpdir(), "skillopt-cursor-fix-"));
    roots.push(fixtureRunRoot);
    await expect(
      runCursorCompatibilityGate({
        runId: "missing-task",
        skill: "kibi-usage",
        phase: "development",
        fixtureRunRoot,
        sourceWorktree: process.cwd(),
        artifactRoot: join(fixtureRunRoot, "artifacts"),
        cursorExecutable: "cursor-agent",
        hostVersion: "test",
        candidates: [{ variant: "skillopt", body: "body" }],
        qualification: qualification(),
      }),
    ).rejects.toThrow(/cursor_task_fixture_missing:/);

    const bogusTaskDir = join(
      fixtureRunRoot,
      "public",
      "train",
      "tasks",
      "kibi-usage-fact-predicate-modeling-development-1",
    );
    await mkdir(bogusTaskDir, { recursive: true });
    await writeFile(join(bogusTaskDir, "task.json"), "{not-json", "utf8");
    await expect(
      runCursorCompatibilityGate({
        runId: "bad-json",
        skill: "kibi-usage",
        phase: "development",
        fixtureRunRoot,
        sourceWorktree: process.cwd(),
        artifactRoot: join(fixtureRunRoot, "artifacts-2"),
        cursorExecutable: "cursor-agent",
        hostVersion: "test",
        candidates: [{ variant: "skillopt", body: "body" }],
        qualification: qualification(),
      }),
    ).rejects.toThrow();
  });
});

export type { CursorCellReceipt };
