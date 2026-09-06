// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type WorkflowDependencies,
  runWorkflowCommand,
} from "../cli-workflow";

const roots: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("runWorkflowCommand remaining held-out cellRunner injection", () => {
  test("forwards the workflow cellRunner into evaluateHeldOut", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-cli-heldout-"));
    roots.push(artifactRoot);
    const writes: string[] = [];
    spies.push(
      spyOn(process.stdout, "write").mockImplementation((chunk) => {
        writes.push(String(chunk));
        return true;
      }),
    );

    let forwarded: unknown;
    const cellRunner: WorkflowDependencies["cellRunner"] = async () => {
      throw new Error("cell runner should only be forwarded");
    };
    const dependencies: WorkflowDependencies = {
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
      runRealOptimization: async (_options, inner) => {
        await (
          inner as { evaluateHeldOut(input: never): Promise<unknown> }
        ).evaluateHeldOut({ variants: [] } as never);
        return {
          status: "evaluated",
          runId: "00000000-0000-4000-8000-000000000301",
          skills: ["kibi-usage"],
          candidates: [],
          heldOutEligibility: "eligible",
          paidModelCalls: 0,
        };
      },
      evaluateHeldOut: async (input) => {
        forwarded = input;
        return { eligibility: "HELD_OUT_MATRIX_INELIGIBLE", cellCount: 0 };
      },
      cellRunner,
      createCodexRuntimeLease: async ({ artifactRoot: root }) => ({
        root: join(root, ".runtime/test-runtime"),
        codexExecutable: join(root, ".runtime/test-runtime/codex"),
        bwrapExecutable: join(
          root,
          ".runtime/test-runtime/codex-resources/bwrap",
        ),
        cleanup: async () => undefined,
      }),
    };

    const exitCode = await runWorkflowCommand(
      "optimize",
      {
        runId: "00000000-0000-4000-8000-000000000301",
        artifactRoot,
        artifactRootExplicit: true,
        fake: false,
        skill: "kibi-usage",
        allowPaid: true,
        maxSteps: 1,
        cellRuntime: { fixtureRunRoot: join(artifactRoot, "fixtures") },
      } as never,
      dependencies,
    );
    expect(exitCode).toBe(0);
    expect(forwarded).toEqual(
      expect.objectContaining({
        variants: [],
        cellRunner,
      }),
    );
    expect(writes.join("")).toContain('"status":"evaluated"');
  });
});
