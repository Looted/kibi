import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CliDependencies, main } from "../cli";
import { parseWorkflowOptions } from "../cli-options";
import { EvaluationInfrastructureError } from "../evaluation-infrastructure";
import type { RealOptimizationDependencies } from "../real-workflow";
import {
  type CapabilityCanaryReceipt,
  OPTIMIZER_MODEL,
  TARGET_MODEL,
} from "../runtime/permissions";

let preflightCalls = 0;
let canaryCalls = 0;
let realOptimizationCalls = 0;
let realOptimizationDependencies:
  | Partial<RealOptimizationDependencies>
  | undefined;
let stagedRuntimeCleanups = 0;
let realOptimizationOptions:
  | Parameters<CliDependencies["runRealOptimization"]>[0]
  | undefined;

function fakeDependencies(): CliDependencies {
  return {
    runPreflight: async ({ runId }) => {
      preflightCalls += 1;
      return {
        verdict: "pass",
        runId,
        targetModel: TARGET_MODEL,
        optimizerModel: OPTIMIZER_MODEL,
        skilloptCommit: "b860a5cf88ce75e2bd02ca981ac21fb28cffba83",
        codexVersion: "codex 1.0.0",
        authMode: "file",
        bwrap: true,
        sourceClean: true,
        configValid: true,
        paidModelCalls: 0,
      };
    },
    runCapabilityCanary: async ({ runId }) => {
      canaryCalls += 1;
      return {
        verdict: "pass",
        runId,
        targetModel: TARGET_MODEL,
        optimizerModel: OPTIMIZER_MODEL,
        authMode: "file",
        paidModelCalls: 2,
        modelRuns: [],
        events: [],
      } satisfies CapabilityCanaryReceipt;
    },
    runRealOptimization: async (options, dependencies) => {
      realOptimizationCalls += 1;
      realOptimizationOptions = options;
      realOptimizationDependencies = dependencies;
      return {
        status: "evaluated",
        runId: options.runId,
        skills: options.skills,
        candidates: [],
        heldOutEligibility: "eligible",
        paidModelCalls: 2,
      };
    },
    evaluateHeldOut: async (input) => ({
      eligibility: "HELD_OUT_MATRIX_INELIGIBLE",
      cellCount: input.variants.length * 32,
    }),
    cellRunner: async () => {
      throw new Error(
        "fake cell runner should be reached only by held-out evaluation",
      );
    },
    createCodexRuntimeLease: async ({ artifactRoot }) => ({
      root: join(artifactRoot, ".runtime/test-runtime"),
      codexExecutable: join(artifactRoot, ".runtime/test-runtime/codex"),
      bwrapExecutable: join(
        artifactRoot,
        ".runtime/test-runtime/codex-resources/bwrap",
      ),
      cleanup: async () => {
        stagedRuntimeCleanups += 1;
      },
    }),
  };
}

describe("SkillOpt workflow CLI", () => {
  afterEach(() => {
    preflightCalls = 0;
    canaryCalls = 0;
    realOptimizationCalls = 0;
    realOptimizationDependencies = undefined;
    stagedRuntimeCleanups = 0;
    realOptimizationOptions = undefined;
  });

  test("supports help and zero cost dry run", async () => {
    expect(await main(["--help"])).toBe(0);
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-"));
    try {
      expect(
        await main([
          "dry-run",
          "--run-id",
          "00000000-0000-4000-8000-000000000092",
          "--artifact-root",
          root,
        ]),
      ).toBe(0);
      expect(await readFile(join(root, "dry-run.json"), "utf8")).toContain(
        '"mode":"dry-run"',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("prepare materializes a strict prepared root", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-prepare-"));
    const source = await mkdtemp(join(tmpdir(), "skillopt-cli-source-"));
    try {
      const process = Bun.spawn(["git", "init", "--quiet"], { cwd: source });
      await process.exited;
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
        await main([
          "prepare",
          "--run-id",
          "00000000-0000-4000-8000-000000000096",
          "--artifact-root",
          root,
          "--source-root",
          source,
        ]),
      ).toBe(0);
      expect(
        await readFile(join(root, "prepared-root.json"), "utf8"),
      ).toContain("skillopt-prepared-root");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(source, { recursive: true, force: true });
    }
  });

  test("rejects real optimize until paid mode is acknowledged", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-paid-"));
    try {
      expect(
        await main(
          [
            "optimize",
            "--skill",
            "kibi-usage",
            "--run-id",
            "00000000-0000-4000-8000-000000000094",
            "--artifact-root",
            root,
          ],
          fakeDependencies(),
        ),
      ).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given a fixture run root When workflow options are parsed Then the runtime has no singular evaluator manifest", () => {
    // Given
    const args = [
      "--run-id",
      "00000000-0000-4000-8000-000000000097",
      "--fixture-run-root",
      "/tmp/fixture-run",
    ];

    // When
    const options = parseWorkflowOptions(args);

    // Then
    expect(options.cellRuntime).toEqual({ fixtureRunRoot: "/tmp/fixture-run" });
    expect(() =>
      parseWorkflowOptions([
        "--run-id",
        "00000000-0000-4000-8000-000000000098",
        "--evaluator-manifest",
        "/tmp/stale.json",
      ]),
    ).toThrow("Unknown workflow option");
  });

  test("Given a non-kibi-usage optimize target When paid mode is acknowledged Then it rejects before the canary", async () => {
    // Given

    // When
    const exitCode = await main(
      [
        "optimize",
        "--allow-paid",
        "--skill",
        "kibi-freshness",
        "--run-id",
        "00000000-0000-4000-8000-000000000099",
        "--fixture-run-root",
        "/tmp/fixture-run",
      ],
      fakeDependencies(),
    );

    // Then
    expect(exitCode).toBe(2);
    expect(canaryCalls).toBe(0);
  });

  test("rejects smoke before invoking its paid capability canary", async () => {
    // Given

    // When
    const exitCode = await main(
      ["smoke", "--run-id", "00000000-0000-4000-8000-000000000095"],
      fakeDependencies(),
    );

    // Then
    expect(exitCode).toBe(2);
    expect(canaryCalls).toBe(0);
  });

  test("injects preflight, canary, real optimization, and held-out cell dependencies", async () => {
    // Given
    const dependencies = fakeDependencies();
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-inject-"));

    // When
    const exitCode = await main(
      [
        "optimize",
        "--allow-paid",
        "--skill",
        "kibi-usage",
        "--run-id",
        "00000000-0000-4000-8000-000000000096",
        "--artifact-root",
        root,
        "--fixture-run-root",
        "/tmp/fixture-run",
      ],
      dependencies,
    );
    try {
      // Then
      expect(exitCode).toBe(0);
      expect(preflightCalls).toBe(1);
      expect(canaryCalls).toBe(1);
      expect(realOptimizationCalls).toBe(1);
      expect(stagedRuntimeCleanups).toBe(1);
      expect(realOptimizationOptions?.cellRuntime).toMatchObject({
        codexExecutable: expect.stringContaining(".runtime/test-runtime/codex"),
        bwrapExecutable: expect.stringContaining(
          ".runtime/test-runtime/codex-resources/bwrap",
        ),
      });
      expect(realOptimizationDependencies?.evaluateHeldOut).toEqual(
        expect.any(Function),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("returns a structured no-go and cleans the shared runtime after an infrastructure failure", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-infra-"));
    const dependencies: CliDependencies = {
      ...fakeDependencies(),
    };
    let cleaned = 0;
    const createCodexRuntimeLease = async ({
      artifactRoot,
    }: { artifactRoot: string }) => ({
      root: join(artifactRoot, ".runtime/failing-runtime"),
      codexExecutable: join(artifactRoot, ".runtime/failing-runtime/codex"),
      bwrapExecutable: join(
        artifactRoot,
        ".runtime/failing-runtime/codex-resources/bwrap",
      ),
      cleanup: async () => {
        cleaned += 1;
      },
    });
    const runRealOptimization: CliDependencies["runRealOptimization"] =
      async () => {
        throw new EvaluationInfrastructureError({
          stage: "held-out",
          taskId: "task-1",
          variant: "skillopt",
          status: "infrastructure-failure",
          criticalFailures: ["missing_diagnostic_receipt"],
          receiptPath: "/tmp/receipt.json",
        });
      };

    try {
      expect(
        await main(
          [
            "optimize",
            "--allow-paid",
            "--skill",
            "kibi-usage",
            "--run-id",
            "00000000-0000-4000-8000-000000000097",
            "--artifact-root",
            root,
            "--fixture-run-root",
            "/tmp/fixture-run",
          ],
          {
            ...dependencies,
            createCodexRuntimeLease,
            runRealOptimization,
          },
        ),
      ).toBe(1);
      expect(cleaned).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("runs and resumes the fake workflow through its CLI surface", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-run-"));
    try {
      const args = [
        "run",
        "--fake",
        "--run-id",
        "00000000-0000-4000-8000-000000000093",
        "--artifact-root",
        root,
      ];
      expect(await main(args)).toBe(0);
      expect(
        await main(args.map((value) => (value === "run" ? "resume" : value))),
      ).toBe(0);
      expect(
        await main([
          "status",
          "--run-id",
          "00000000-0000-4000-8000-000000000093",
          "--artifact-root",
          root,
        ]),
      ).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("publishes a fake report, exact approval, and adoption dry run", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-review-"));
    const runId = "00000000-0000-4000-8000-000000000094";
    const args = ["--fake", "--run-id", runId, "--artifact-root", root];
    try {
      expect(await main(["report", ...args])).toBe(0);
      expect(await main(["approve", ...args])).toBe(0);
      expect(await main(["adopt", ...args])).toBe(0);
      expect(await readFile(join(root, "report.json"), "utf8")).toContain(
        '"artifactType":"report"',
      );
      const approval = JSON.parse(
        await readFile(join(root, "approval.json"), "utf8"),
      ) as { decision?: string };
      expect(approval.decision).toBe("approved");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given an explicit artifact root When running and status-checking Then state persists between invocations", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-run-rs-"));
    const runId = "00000000-0000-4000-8000-000000000099";
    const args = ["--fake", "--run-id", runId, "--artifact-root", root];
    try {
      expect(await main(["run", ...args])).toBe(0);
      expect(await main(["status", ...args])).toBe(0);
      expect(await main(["resume", ...args])).toBe(0);
      expect(await main(["status", ...args])).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given a stateful command without explicit artifact root When invoked Then it returns exit code 2", async () => {
    const runId = "00000000-0000-4000-8000-000000000099";
    expect(await main(["run", "--fake", "--run-id", runId])).toBe(2);
    expect(await main(["status", "--run-id", runId])).toBe(2);
    expect(await main(["resume", "--fake", "--run-id", runId])).toBe(2);
  });

  test("Given a stateless command without explicit artifact root When invoked Then the temp root is cleaned up", async () => {
    const runId = "00000000-0000-4000-8000-000000000099";
    const before = (await readdir(tmpdir())).filter((n) =>
      n.startsWith("kibi-skillopt-"),
    );

    // When
    expect(await main(["dry-run", "--run-id", runId])).toBe(0);

    // Then: no new temp dirs leaked
    const after = (await readdir(tmpdir())).filter((n) =>
      n.startsWith("kibi-skillopt-"),
    );
    expect(after.length).toBeLessThanOrEqual(before.length);
  });
});
