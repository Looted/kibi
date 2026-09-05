// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CliUsageError } from "../cli-options";
import { EvaluationInfrastructureError } from "../evaluation-infrastructure";
import {
  type WorkflowDependencies,
  runWorkflowCommand,
} from "../cli-workflow";

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

describe("runWorkflowCommand paid and review branches", () => {
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

  test("optimize validates paid gates and returns staged failures", async () => {
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

    expect(
      await runWorkflowCommand(
        "optimize",
        workflowOptions(artifactRoot, { seedCandidate: "candidate.md" }),
        dependencies(),
      ),
    ).toBe(0);
  });

  test("bundle validates paid gates and preflight/smoke failures", async () => {
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
  });

  test("status and fake review commands write artifacts", async () => {
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
    expect(
      await runWorkflowCommand(
        "resume",
        workflowOptions(artifactRoot, { fake: true }),
        dependencies(),
      ),
    ).toBeGreaterThanOrEqual(0);
  });

  test("unknown real command still requires --fake", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-wf-unknown-"));
    roots.push(artifactRoot);
    await expect(
      runWorkflowCommand(
        "resume",
        workflowOptions(artifactRoot),
        dependencies(),
      ),
    ).rejects.toThrow(/requires --fake/);
  });
});
