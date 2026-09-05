// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArtifactRootRequiredError } from "../artifact-path";
import { CliUsageError } from "../cli-options";
import { EvaluationInfrastructureError } from "../evaluation-infrastructure";

mock.module("../bundle-workflow", () => ({
  runPaidBundleGate: async () => ({
    verdict: "pass",
    reportPath: "/tmp/skillopt-bundle-report.json",
    exitCode: 0,
  }),
}));

const { defaultWorkflowDependencies, runWorkflowCommand } = await import(
  "../cli-workflow"
);
import type { WorkflowDependencies } from "../cli-workflow";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function workflowOptions(
  artifactRoot: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    runId: "00000000-0000-4000-8000-000000000301",
    artifactRoot,
    artifactRootExplicit: true,
    fake: false,
    skill: "kibi-usage",
    allowPaid: true,
    maxSteps: 1,
    cellRuntime: {
      fixtureRunRoot: join(artifactRoot, "fixtures"),
    },
    ...overrides,
  } as const;
}

function dependencies(
  overrides: Partial<WorkflowDependencies> = {},
): WorkflowDependencies {
  return {
    runPreflight: async ({ runId }) =>
      ({
        verdict: "pass",
        runId,
        targetModel: "gpt",
        optimizerModel: "gpt",
        skilloptCommit: "a".repeat(40),
        codexVersion: "1",
        authMode: "file",
        bwrap: true,
        sourceClean: true,
        configValid: true,
        paidModelCalls: 0,
      }) as never,
    runCapabilityCanary: async ({ runId }) =>
      ({
        verdict: "pass",
        runId,
        targetModel: "gpt",
        optimizerModel: "gpt",
        authMode: "file",
        paidModelCalls: 0,
        modelRuns: [],
        events: [],
      }) as never,
    runRealOptimization: async () =>
      ({
        status: "evaluated",
        runId: "run",
        skills: ["kibi-usage"],
        candidates: [],
        heldOutEligibility: "eligible",
        paidModelCalls: 0,
      }) as never,
    evaluateHeldOut: async () =>
      ({
        eligibility: "eligible",
        cellCount: 1,
      }) as never,
    cellRunner: async () => {
      throw new Error("cell runner unused");
    },
    createCodexRuntimeLease: async ({ artifactRoot }) => ({
      root: join(artifactRoot, ".runtime"),
      codexExecutable: "/bin/true",
      bwrapExecutable: "/bin/true",
      cleanup: async () => undefined,
    }),
    ...overrides,
  };
}

describe("runWorkflowCommand leftover branches", () => {
  test("defaultWorkflowDependencies expose injectable seams", () => {
    expect(typeof defaultWorkflowDependencies.runPreflight).toBe("function");
    expect(typeof defaultWorkflowDependencies.runCapabilityCanary).toBe(
      "function",
    );
    expect(typeof defaultWorkflowDependencies.runRealOptimization).toBe(
      "function",
    );
    expect(typeof defaultWorkflowDependencies.evaluateHeldOut).toBe("function");
    expect(typeof defaultWorkflowDependencies.cellRunner).toBe("function");
    expect(typeof defaultWorkflowDependencies.createCodexRuntimeLease).toBe(
      "function",
    );
  });

  test("stateful commands require an explicit artifact root", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-stateful-"));
    roots.push(artifactRoot);
    await expect(
      runWorkflowCommand(
        "run",
        workflowOptions(artifactRoot, { artifactRootExplicit: false }),
        dependencies(),
      ),
    ).rejects.toThrow(ArtifactRootRequiredError);
    await expect(
      runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { artifactRootExplicit: undefined }),
        dependencies(),
      ),
    ).rejects.toThrow(/requires explicit --artifact-root/);
  });

  test("dry-run and prepare write artifacts and clean temp roots", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-dry-"));
    roots.push(artifactRoot);
    expect(
      await runWorkflowCommand(
        "dry-run",
        workflowOptions(artifactRoot, { sourceRoot: undefined }),
        dependencies(),
      ),
    ).toBe(0);

    const source = await mkdtemp(join(tmpdir(), "skillopt-wf-source-"));
    roots.push(source);
    await Bun.spawn(["git", "init", "--quiet"], { cwd: source }).exited;
    await Bun.write(join(source, "source.txt"), "prepared\n");
    for (const args of [
      ["config", "user.email", "test@example.test"],
      ["config", "user.name", "Test"],
      ["add", "source.txt"],
      ["commit", "--quiet", "-m", "source"],
    ]) {
      await Bun.spawn(["git", ...args], { cwd: source }).exited;
    }
    expect(
      await runWorkflowCommand(
        "prepare",
        workflowOptions(artifactRoot, { sourceRoot: source }),
        dependencies(),
      ),
    ).toBe(0);

    expect(
      await runWorkflowCommand(
        "dry-run",
        workflowOptions(artifactRoot, {
          artifactRootExplicit: false,
          sourceRoot: source,
        }),
        dependencies(),
      ),
    ).toBe(0);
  });

  test("rejects offline review commands without --fake", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-"));
    roots.push(artifactRoot);
    await expect(
      runWorkflowCommand(
        "report",
        workflowOptions(artifactRoot),
        dependencies(),
      ),
    ).rejects.toThrow(CliUsageError);
    await expect(
      runWorkflowCommand(
        "approve",
        workflowOptions(artifactRoot),
        dependencies(),
      ),
    ).rejects.toThrow(/requires --fake/);
    await expect(
      runWorkflowCommand(
        "adopt",
        workflowOptions(artifactRoot),
        dependencies(),
      ),
    ).rejects.toThrow(/requires --fake/);
  });

  test("optimize validates paid gates and maps staged failures", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-opt-"));
    roots.push(artifactRoot);
    await expect(
      runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { allowPaid: false }),
        dependencies(),
      ),
    ).rejects.toThrow(/requires --allow-paid/);
    await expect(
      runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { skill: undefined }),
        dependencies(),
      ),
    ).rejects.toThrow(/requires one --skill/);
    await expect(
      runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { skill: "all" }),
        dependencies(),
      ),
    ).rejects.toThrow(/requires one --skill/);
    await expect(
      runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { cellRuntime: undefined }),
        dependencies(),
      ),
    ).rejects.toThrow(/requires --fixture-run-root/);

    expect(
      await runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot),
        dependencies({
          runPreflight: async ({ runId }) =>
            ({ verdict: "fail", runId, reasons: ["preflight"] }) as never,
        }),
      ),
    ).toBe(1);

    expect(
      await runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot),
        dependencies({
          runCapabilityCanary: async ({ runId }) =>
            ({ verdict: "fail", runId, reasons: ["smoke"] }) as never,
        }),
      ),
    ).toBe(1);

    expect(
      await runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot),
        dependencies({
          createCodexRuntimeLease: async () => {
            throw new Error("lease exploded");
          },
        }),
      ),
    ).toBe(1);

    expect(
      await runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot),
        dependencies({
          createCodexRuntimeLease: async () => {
            throw "string-lease-failure";
          },
        }),
      ),
    ).toBe(1);

    expect(
      await runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { seedCandidate: "candidate.md" }),
        dependencies({
          runRealOptimization: async () => {
            throw new EvaluationInfrastructureError({
              stage: "held-out",
              taskId: "t",
              variant: "skillopt",
              status: "infrastructure-failure",
              criticalFailures: ["boom"],
              receiptPath: null,
            });
          },
        }),
      ),
    ).toBe(1);

    await expect(
      runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot),
        dependencies({
          runRealOptimization: async () => {
            throw new Error("unexpected optimizer crash");
          },
        }),
      ),
    ).rejects.toThrow(/unexpected optimizer crash/);

    expect(
      await runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { seedCandidate: "candidate.md" }),
        dependencies(),
      ),
    ).toBe(0);
  });

  test("bundle validates paid gates and succeeds through the mocked gate", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-bundle-"));
    roots.push(artifactRoot);
    await expect(
      runWorkflowCommand(
        "bundle",
        workflowOptions(artifactRoot, { allowPaid: false, skill: "all" }),
        dependencies(),
      ),
    ).rejects.toThrow(/bundle requires --allow-paid/);
    await expect(
      runWorkflowCommand(
        "bundle",
        workflowOptions(artifactRoot, { skill: "kibi-usage" }),
        dependencies(),
      ),
    ).rejects.toThrow(/requires --skill all/);
    await expect(
      runWorkflowCommand(
        "bundle",
        workflowOptions(artifactRoot, {
          skill: "all",
          cellRuntime: undefined,
        }),
        dependencies(),
      ),
    ).rejects.toThrow(/bundle requires --fixture-run-root/);

    expect(
      await runWorkflowCommand(
        "bundle",
        workflowOptions(artifactRoot, { skill: "all" }),
        dependencies({
          runPreflight: async ({ runId }) =>
            ({ verdict: "fail", runId }) as never,
        }),
      ),
    ).toBe(1);
    expect(
      await runWorkflowCommand(
        "bundle",
        workflowOptions(artifactRoot, { skill: "all" }),
        dependencies({
          runCapabilityCanary: async ({ runId }) =>
            ({ verdict: "fail", runId }) as never,
        }),
      ),
    ).toBe(1);
    expect(
      await runWorkflowCommand(
        "bundle",
        workflowOptions(artifactRoot, { skill: "all" }),
        dependencies(),
      ),
    ).toBe(0);
  });

  test("status, fake review, incomplete resume, and unknown real commands", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-status-"));
    roots.push(artifactRoot);
    expect(
      await runWorkflowCommand(
        "status",
        workflowOptions(artifactRoot),
        dependencies(),
      ),
    ).toBe(1);

    expect(
      await runWorkflowCommand(
        "run",
        workflowOptions(artifactRoot, { fake: true }),
        dependencies(),
      ),
    ).toBe(0);
    expect(
      await runWorkflowCommand(
        "status",
        workflowOptions(artifactRoot, { fake: true }),
        dependencies(),
      ),
    ).toBe(0);
    expect(
      await runWorkflowCommand(
        "report",
        workflowOptions(artifactRoot, { fake: true }),
        dependencies(),
      ),
    ).toBe(0);
    expect(
      await runWorkflowCommand(
        "approve",
        workflowOptions(artifactRoot, { fake: true }),
        dependencies(),
      ),
    ).toBe(0);
    expect(
      await runWorkflowCommand(
        "adopt",
        workflowOptions(artifactRoot, { fake: true }),
        dependencies(),
      ),
    ).toBe(0);

    const noGoRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-nogo-"));
    roots.push(noGoRoot);
    await writeFile(
      join(noGoRoot, "state.json"),
      `${JSON.stringify({
        schemaVersion: "1.0.0",
        artifactType: "run-state",
        runId: "00000000-0000-4000-8000-000000000301",
        runLockHash: "0".repeat(64),
        phase: "no-go",
        completedEpisodeIds: [],
        ledgerHeadHash: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
        interrupted: false,
      })}\n`,
    );
    expect(
      await runWorkflowCommand(
        "resume",
        workflowOptions(noGoRoot, { fake: true }),
        dependencies(),
      ),
    ).toBe(1);

    await expect(
      runWorkflowCommand(
        "resume",
        workflowOptions(artifactRoot),
        dependencies(),
      ),
    ).rejects.toThrow(/requires --fake/);
  });
});
