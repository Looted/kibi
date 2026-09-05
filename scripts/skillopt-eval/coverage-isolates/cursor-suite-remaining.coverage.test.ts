// implements REQ-skillopt-cursor-compat
import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildHeldOutCatalog, buildSkillCatalog } from "../catalog";
import type { CursorCellReceipt, CursorVariant } from "../cursor/types";
import { evaluatorManifest } from "../tests/fixtures/evaluator-authority-fixtures";

const HASH = "a".repeat(64);

mock.module("../runtime/task-fixture", () => ({
  resolveTaskFixture: async ({
    taskId,
    publicClaim,
  }: {
    taskId: string;
    publicClaim: { workspaceHash: string };
  }) => ({
    workspaceRoot: `/tmp/skillopt-cursor-fixture/${taskId}`,
    workspaceHash: publicClaim.workspaceHash,
    evaluatorManifest: evaluatorManifest("predicate"),
    publicClaim,
    fixtureClaim: { taskId },
  }),
}));

mock.module("../cursor/runner", () => ({
  runCursorCell: async (options: {
    request: { taskId: string; variant: CursorVariant; runId: string };
  }) => ({
    artifactDirectory: "/tmp/skillopt-cursor-episode",
    receipt: {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-cursor-cell",
      host: "cursor-agent",
      hostVersion: "test",
      episodeId: `ep-${options.request.taskId}-${options.request.variant}`,
      runId: options.request.runId,
      variant: options.request.variant,
      skill: "kibi-usage",
      taskId: options.request.taskId,
      candidateBodyHash: HASH,
      startedAt: "2026-08-24T00:00:00Z",
      finishedAt: "2026-08-24T00:01:00Z",
      exitCode: 0,
      termination: "exit",
      result: {
        outcome: options.request.variant === "skillopt" ? "pass" : "fail",
        score: options.request.variant === "skillopt" ? 90 : 40,
        hard: options.request.variant === "skillopt" ? 1 : 0,
        criticalFailures:
          options.request.variant === "baseline" ? ["sentinel-leak"] : [],
        terminalCategory: null,
      },
      evidenceHashes: {
        brokerTrace: HASH,
        diagnosticReceipt: HASH,
        finalState: HASH,
        transcript: HASH,
      },
    } satisfies CursorCellReceipt,
  }),
}));

const {
  evaluateCursorVerdict,
  persistCursorCompatibilityReport,
  runCursorCompatibilityGate,
  summarizeCursorCells,
} = await import("../cursor/suite");

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

function publicTaskFields(task: ReturnType<typeof buildSkillCatalog>[number]) {
  return {
    id: task.id,
    skill: task.skill,
    family: task.family,
    split: task.split,
    prompt: task.prompt,
    activationMode: task.activationMode,
    initialState: task.initialState,
    allowedPublicFiles: task.allowedPublicFiles,
    taskData: task.taskData,
    host: "codex" as const,
  };
}

function manifestFor(
  task: ReturnType<typeof buildSkillCatalog>[number],
  split: "train" | "development" | "held-out" = task.split,
) {
  return {
    schemaVersion: "1.1.0",
    workspaceHash: HASH,
    blindVariantSlots: ["variant-a", "variant-b", "variant-c"],
    task: {
      ...publicTaskFields(task),
      split,
    },
  };
}

async function writeTask(
  fixtureRunRoot: string,
  location: "train" | "development" | "held-out",
  task: ReturnType<typeof buildSkillCatalog>[number],
  body: unknown,
): Promise<void> {
  const dir =
    location === "held-out"
      ? join(fixtureRunRoot, "held-out", "tasks", task.id)
      : join(fixtureRunRoot, "public", location, "tasks", task.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "task.json"), `${JSON.stringify(body)}\n`, "utf8");
}

describe("cursor suite leftover branches", () => {
  test("evaluateCursorVerdict and summarizeCursorCells cover floors and sentinels", () => {
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
      }).reasons,
    ).toEqual(["cursor:no-candidate-cells"]);
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
      }).verdict,
    ).toBe("informational");
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
    const summarized = summarizeCursorCells([
      {
        taskId: "t1",
        variant: "baseline",
        result: { hard: 0, score: 20, criticalFailures: ["sentinel-leak"] },
      } as never,
      {
        taskId: "t2",
        variant: "one-shot",
        result: { hard: 1, score: 50, criticalFailures: [] },
      } as never,
      {
        taskId: "t3",
        variant: "skillopt",
        result: { hard: 1, score: 80, criticalFailures: ["isolation-escape"] },
      } as never,
    ]);
    expect(summarized).toHaveLength(3);
    expect(summarized.find((row) => row.variant === "baseline")?.securityFailures).toBe(
      1,
    );
    expect(summarized.find((row) => row.variant === "skillopt")?.securityFailures).toBe(
      1,
    );
  });

  test("runCursorCompatibilityGate walks train/development/held-out manifests", async () => {
    const fixtureRunRoot = await mkdtemp(join(tmpdir(), "skillopt-cursor-fix-"));
    roots.push(fixtureRunRoot);
    const artifactRoot = join(fixtureRunRoot, "artifacts");
    const development = buildSkillCatalog("kibi-usage").filter(
      (task) => task.split === "development",
    );
    const [trainFallback, developmentOnly, , lastDevelopment] = development;
    if (
      trainFallback === undefined ||
      developmentOnly === undefined ||
      lastDevelopment === undefined
    ) {
      throw new Error("expected four kibi-usage development tasks");
    }

    await writeTask(
      fixtureRunRoot,
      "train",
      trainFallback,
      manifestFor(trainFallback, "held-out"),
    );
    await writeTask(
      fixtureRunRoot,
      "development",
      developmentOnly,
      manifestFor(developmentOnly),
    );
    for (const task of development.slice(2)) {
      await writeTask(fixtureRunRoot, "train", task, manifestFor(task));
    }

    const report = await runCursorCompatibilityGate({
      runId: "00000000-0000-4000-8000-000000000401",
      skill: "kibi-usage",
      phase: "development",
      fixtureRunRoot,
      sourceWorktree: process.cwd(),
      artifactRoot,
      cursorExecutable: "cursor-agent",
      hostVersion: "test-host",
      candidates: [
        { variant: "baseline", body: "baseline" },
        { variant: "one-shot", body: "one-shot" },
        { variant: "skillopt", body: "skillopt" },
      ],
      qualification: qualification(),
    });
    expect(report.cells.length).toBe(development.length * 3);
    expect(report.variants.map((row) => row.variant)).toEqual([
      "baseline",
      "one-shot",
      "skillopt",
    ]);
    expect(report.verdict).toBe("compatible");

    const heldOut = buildHeldOutCatalog().filter(
      (task) => task.skill === "kibi-usage" && task.split === "held-out",
    );
    for (const task of heldOut) {
      await writeTask(fixtureRunRoot, "held-out", task, manifestFor(task));
    }
    const heldOutReport = await runCursorCompatibilityGate({
      runId: "00000000-0000-4000-8000-000000000402",
      skill: "kibi-usage",
      phase: "held-out",
      fixtureRunRoot,
      sourceWorktree: process.cwd(),
      artifactRoot: join(fixtureRunRoot, "artifacts-held"),
      cursorExecutable: "cursor-agent",
      hostVersion: "test-host",
      candidates: [
        { variant: "baseline", body: "baseline" },
        { variant: "skillopt", body: "skillopt" },
      ],
      qualification: qualification(),
    });
    expect(heldOutReport.phase).toBe("held-out");
    expect(heldOutReport.verdict).toBe("informational");
    expect(
      heldOutReport.cells.every((cell) => cell.variant === "skillopt"),
    ).toBe(true);
    expect(heldOutReport.cells.length).toBe(heldOut.length);

    const empty = await runCursorCompatibilityGate({
      runId: "empty-candidates",
      skill: "kibi-usage",
      phase: "held-out",
      fixtureRunRoot: join(fixtureRunRoot, "missing"),
      sourceWorktree: process.cwd(),
      artifactRoot: join(fixtureRunRoot, "artifacts-empty"),
      cursorExecutable: "cursor-agent",
      hostVersion: "test",
      candidates: [{ variant: "baseline", body: "baseline" }],
      qualification: qualification("no-go"),
    });
    expect(empty.cells).toEqual([]);
    const path = await persistCursorCompatibilityReport(
      join(fixtureRunRoot, "persist"),
      empty,
    );
    expect(path).toEndWith("cursor-compat.json");
    const stored = JSON.parse(await readFile(path, "utf8")) as typeof empty;
    expect(stored.runId).toBe("empty-candidates");
  });

  test("loadTaskManifest reports missing and invalid task fixtures", async () => {
    const fixtureRunRoot = await mkdtemp(join(tmpdir(), "skillopt-cursor-miss-"));
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

    const bogus = buildSkillCatalog("kibi-usage").find(
      (task) => task.split === "development",
    );
    if (bogus === undefined) throw new Error("development task missing");
    await mkdir(
      join(fixtureRunRoot, "public", "train", "tasks", bogus.id),
      { recursive: true },
    );
    await writeFile(
      join(fixtureRunRoot, "public", "train", "tasks", bogus.id, "task.json"),
      "{not-json",
      "utf8",
    );
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
