import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as skills from "../../../packages/cli/src/public/skills";
import * as candidateBody from "../candidate-body";
import * as developmentScreen from "../development-screen";
import * as historicalCandidates from "../historical-candidates";
import * as operator from "../operator";
import * as preflight from "../preflight";
import * as realWorkflow from "../real-workflow";
import * as realWorkflowSetup from "../real-workflow-setup";
import { canonicalHash } from "../real-workflow-types";
import * as codexCellRunner from "../runtime/codex-cell-runner";
import * as codexRuntime from "../runtime/codex-runtime";
import * as processRunner from "../runtime/process";
import { main, parseScreenArgs } from "../screen-history";
import * as targetEpisodeBudget from "../target-episode-budget";
import * as trainingSetup from "../training-setup";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

const GUIDANCE = [
  "npx --no-install kibi",
  "bunx --no-install kibi",
  "Do not read or edit files inside `.kb` directly",
  "kb_search",
  "kb_query",
  "kb_upsert",
  "kb_check",
  "kb_semantic_advisor",
  "kb_suggest_predicates",
  "kb_model_requirement",
  "fact_kind: predicate",
  "predicate_name",
  "predicate_args",
  "canonical_key",
  "polarity",
  "predicate_schema",
  "requires_predicate",
  "logic_claims",
  "semantic_inventory",
  "claim_key",
  "claim_text",
  "propositions",
  "interpretations",
  "projectLocalSchemas",
  "nonlogical",
  "review:ambiguity",
  "review:ontology-gap",
  "polarity: deny",
  "kibi.logic.v1",
  "fact_kind: rule_schema",
  "fact_kind: rule",
  "requires_rule",
  "rule-safety",
  "rule-verifiability",
  "semantic-completeness",
  "logic-coverage",
  "taskOutcome",
  "kbState",
  "verificationState",
  "proofState",
  "limitationDisposition",
  "quality diagnostic",
  "fixed",
  "accepted",
  "deferred",
  "contract hash",
  "freshness window",
  "temporary",
];

const CANDIDATE_BODY = `${GUIDANCE.join("\n")}\n${"Candidate body padding line for the complete-body byte floor.\n".repeat(12)}`;
const BASELINE_BODY = `${GUIDANCE.join("\n")}\nbaseline surface body padding.\n`;

const restores: Array<() => void> = [];
const scratchDirs: string[] = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
  while (scratchDirs.length > 0) {
    const dir = scratchDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function spy<T extends object>(module: T, key: keyof T, fn: unknown) {
  const restored = spyOn(module, key).mockImplementation(fn as never);
  restores.push(() => restored.mockRestore());
  return restored;
}

describe("parseScreenArgs", () => {
  test("requires the paid acknowledgement", () => {
    expect(() =>
      parseScreenArgs(["--candidate-hash", HASH_A, "--max-cells", "16"]),
    ).toThrow("screen_requires_allow_paid");
  });

  test("rejects unknown and duplicated options", () => {
    expect(() =>
      parseScreenArgs(["--allow-paid", "--nonsense", "--max-cells", "16"]),
    ).toThrow("invalid_screen_option");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--skill",
        "kibi-usage",
        "--skill",
        "kibi-usage",
        "--max-cells",
        "16",
        "--candidate-hash",
        HASH_A,
      ]),
    ).toThrow("invalid_screen_option");
    expect(() => parseScreenArgs(["--allow-paid", undefined as never])).toThrow(
      "invalid_screen_option",
    );
  });

  test("requires a value for value-taking options", () => {
    expect(() =>
      parseScreenArgs(["--allow-paid", "--max-cells", "--skill"]),
    ).toThrow("screen_option_requires_value");
    expect(() => parseScreenArgs(["--allow-paid", "--max-cells"])).toThrow(
      "screen_option_requires_value",
    );
  });

  test("validates candidate hashes", () => {
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        "zzz",
        "--max-cells",
        "16",
      ]),
    ).toThrow("invalid_or_duplicate_candidate_hash");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        HASH_A,
        "--candidate-hash",
        HASH_A,
        "--max-cells",
        "32",
      ]),
    ).toThrow("invalid_or_duplicate_candidate_hash");
  });

  test("validates the skill namespace", () => {
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--skill",
        "not-a-skill",
        "--max-cells",
        "16",
        "--candidate-hash",
        HASH_A,
      ]),
    ).toThrow("invalid_screen_skill");
  });

  test("rejects budget windows that cannot screen the variant set", () => {
    expect(() =>
      parseScreenArgs(["--allow-paid", "--candidate-hash", HASH_A]),
    ).toThrow("screen_budget_invalid");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        HASH_A,
        "--max-cells",
        "7",
      ]),
    ).toThrow("screen_budget_invalid");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        HASH_A,
        "--max-cells",
        "49",
      ]),
    ).toThrow("screen_budget_invalid");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        HASH_A,
        "--repeats",
        "0",
        "--max-cells",
        "16",
      ]),
    ).toThrow("screen_budget_invalid");
    expect(() =>
      parseScreenArgs([
        "--allow-paid",
        "--candidate-hash",
        HASH_A,
        "--repeats",
        "4",
        "--max-cells",
        "48",
      ]),
    ).toThrow("screen_budget_invalid");
  });

  test("accepts a complete paid screen request and resolves the history root", () => {
    const parsed = parseScreenArgs([
      "--allow-paid",
      "--candidate-hash",
      HASH_A,
      "--candidate-hash",
      HASH_B,
      "--candidate-hash",
      HASH_C,
      "--skill",
      "kibi-freshness",
      "--repeats",
      "2",
      "--max-cells",
      "48",
      "--history-root",
      "history-dir",
    ]);
    expect(parsed.hashes).toEqual([HASH_A, HASH_B, HASH_C]);
    expect(parsed.skill).toBe("kibi-freshness");
    expect(parsed.repeats).toBe(2);
    expect(parsed.maxCells).toBe(48);
    expect(parsed.historyRoot).toBe(join(process.cwd(), "history-dir"));
  });
});

type Harness = Readonly<{
  base: string;
  historyRoot: string;
  bodyHash: string;
  writes: string[];
  stderr: string[];
  stdout: string[];
  overrides: (customs: Record<string, unknown>) => void;
}>;

const REAL_EXEC_PATH = process.execPath;

async function startHarness(
  customs: Record<string, unknown> = {},
): Promise<Harness> {
  const base = mkdtempSync(join(tmpdir(), "screen-history-test-"));
  scratchDirs.push(base);
  const historyRoot = join(base, "history");
  mkdirSync(join(historyRoot, "candidates"), { recursive: true });
  const candidatePath = "candidates/candidate.md";
  writeFileSync(join(historyRoot, candidatePath), CANDIDATE_BODY, "utf8");
  const bodyHash = createHash("sha256").update(CANDIDATE_BODY).digest("hex");

  const manifest = { manifestVersion: 1 };
  const surfaceResult = {
    body: BASELINE_BODY,
    frontmatterHash: realWorkflowCanonicalHash(manifest),
    resourcesHash: "1".repeat(64),
  };

  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes: string[] = [];
  spy(process.stdout, "write", (chunk: string) => {
    stdout.push(String(chunk));
    return true;
  });
  spy(process.stderr, "write", (chunk: string) => {
    stderr.push(String(chunk));
    return true;
  });

  const defaults: Record<string, unknown> = {
    budget: undefined,
    clean: true,
    bundledBody: BASELINE_BODY,
    shortlist: [
      {
        skill: "kibi-usage",
        hash: bodyHash,
        origins: [
          {
            verified: true,
            path: candidatePath,
            requestHash: "2".repeat(64),
          },
        ],
      },
    ],
    uvExit: 0,
    gitExit: 0,
    gitHash: "3".repeat(40),
    gitHashSequence: undefined as unknown,
    preflightVerdict: "pass",
    readinessExit: 0,
    canaryVerdict: "pass",
    evaluateCallsCellRunner: true,
    evaluateThrows: undefined as unknown,
    ...customs,
  };

  let gitCalls = 0;

  spy(
    targetEpisodeBudget,
    "readTargetEpisodeBudget",
    async () => defaults.budget,
  );
  spy(preflight, "sourceWorktreeIsClean", async () => defaults.clean);
  spy(operator, "resolveOperatorBase", async () => base);
  spy(realWorkflow, "surface", async () => surfaceResult);
  spy(skills, "loadBundledSkillFrom", () => ({
    body: defaults.bundledBody,
    manifest,
  }));
  spy(historicalCandidates, "inspectHistoricalCandidates", async () => ({
    shortlist: defaults.shortlist,
  }));
  spy(
    processRunner,
    "runBoundedProcess",
    async (input: { argv: readonly string[] }) => {
      const [command] = input.argv;
      if (command === "uv") {
        return { exitCode: defaults.uvExit as number, stdout: "", stderr: "" };
      }
      if (command === "git") {
        gitCalls += 1;
        const sequence = defaults.gitHashSequence as
          | readonly string[]
          | undefined;
        const hash =
          sequence !== undefined
            ? (sequence[Math.min(gitCalls - 1, sequence.length - 1)] as string)
            : (defaults.gitHash as string);
        return {
          exitCode: defaults.gitExit as number,
          stdout: `${hash}\n`,
          stderr: "",
        };
      }
      if (command === REAL_EXEC_PATH) {
        return {
          exitCode: defaults.readinessExit as number,
          stdout: "",
          stderr: "",
        };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    },
  );
  spy(preflight, "runPreflight", async () => ({
    runId: "run",
    verdict: defaults.preflightVerdict,
    ...(defaults.preflightVerdict === "pass"
      ? {}
      : { reason: "runtime_missing" }),
  }));
  const realWorkflowSetupModule = realWorkflowSetup as unknown as Record<
    string,
    unknown
  >;
  void realWorkflowSetupModule;
  spy(realWorkflowSetup, "taskScopedPublicSkillDescriptors", async () => [
    { id: "task-a", family: "family-a", split: "development" },
    { id: "task-b", family: "family-b", split: "development" },
    { id: "task-c", family: "family-c", split: "development" },
    { id: "task-d", family: "family-d", split: "development" },
  ]);
  spy(codexRuntime, "createCodexRuntimeLease", async () => ({
    codexExecutable: join(base, "codex"),
    bwrapExecutable: join(base, "bwrap"),
    root: base,
    cleanup: async () => undefined,
  }));
  spy(preflight, "runCapabilityCanary", async () => ({
    verdict: defaults.canaryVerdict,
    modelInvocationAttempts: 0,
  }));
  spy(trainingSetup, "defaultEvaluateDevelopment", async (input: unknown) => {
    const evaluation = input as {
      cellRunner: (request: unknown) => Promise<unknown>;
    };
    if (defaults.evaluateThrows !== undefined) {
      throw defaults.evaluateThrows;
    }
    if (defaults.evaluateCallsCellRunner) {
      await evaluation.cellRunner({ request: {} });
    }
    return { cells: 1 };
  });
  spy(codexCellRunner, "runCodexCell", async () => ({
    receipt: {
      result: {
        score: 5,
        hardPass: true,
        criticalFailures: [] as string[],
        usage: { totalTokens: 10 },
      },
      violations: ["isolation-sentinel-read"],
    },
    receiptPath: join(base, "receipt.json"),
  }));
  spy(
    developmentScreen,
    "runDevelopmentScreen",
    async (options: {
      variants: ReadonlyArray<{ bodyHash: string }>;
      tasks: ReadonlyArray<{ id: string; family: string }>;
      evaluate: (
        variant: { bodyHash: string },
        task: { id: string; family: string },
        replicate: 1 | 2 | 3,
      ) => Promise<unknown>;
      checkpoint: (state: unknown) => Promise<void>;
    }) => {
      await options.checkpoint({
        attemptedCells: 0,
        cells: [],
        status: "running",
      });
      const sample = (await options.evaluate(
        options.variants[1] as { bodyHash: string },
        options.tasks[0] as { id: string; family: string },
        1,
      )) as Record<string, unknown>;
      const cell = {
        bodyHash: options.variants[1]?.bodyHash,
        taskId: options.tasks[0]?.id,
        family: options.tasks[0]?.family,
        ...sample,
      };
      await options.checkpoint({
        attemptedCells: 1,
        cells: [cell],
        status: "completed",
      });
      return { status: "completed", cells: [cell] };
    },
  );
  const materialize = await import("../fixtures/private");
  spy(materialize, "materializeFixtureRun", () => undefined);

  return {
    base,
    historyRoot,
    bodyHash,
    writes,
    stdout,
    stderr,
    overrides: (next: Record<string, unknown>) => {
      Object.assign(defaults, next);
    },
  };
}

function realWorkflowCanonicalHash(value: unknown): string {
  return canonicalHash(value);
}

function screenArgs(harness: Harness, extra: readonly string[] = []) {
  return [
    "--allow-paid",
    "--candidate-hash",
    harness.bodyHash,
    "--max-cells",
    "16",
    "--history-root",
    harness.historyRoot,
    ...extra,
  ];
}

function artifactRootFromStderr(harness: Harness): string {
  const line = harness.stderr.find((chunk) => chunk.includes("artifact-root="));
  if (!line) throw new Error("artifact-root line missing from stderr");
  return line.trim().split("artifact-root=")[1] as string;
}

describe("screen history main", () => {
  test("--help prints usage without running a screen", async () => {
    await expect(main(["--help"])).resolves.toBe(0);
  });

  test("runs a complete development screen and reports external-verdict gating", async () => {
    const harness = await startHarness();
    const code = await main(screenArgs(harness));
    expect(code).toBe(0);

    const artifactRoot = artifactRootFromStderr(harness);
    const lock = JSON.parse(
      readFileSync(join(artifactRoot, "screen-lock.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(lock.productionAdoption).toBe("external-verdict-required");
    expect(lock.policy).toBe("baseline-relative-development-screen.v2");
    expect(lock.sourceCommit).toBe("3".repeat(40));
    expect(typeof lock.lockHash).toBe("string");

    const review = JSON.parse(
      readFileSync(join(artifactRoot, "screen-review.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(review.artifactType).toBe("skillopt-development-screen-review");
    expect(review.heldOut).toBe("not-run");
    expect(review.summaries).toHaveLength(2);

    const failurePath = join(artifactRoot, "failure.json");
    expect(() => readFileSync(failurePath, "utf8")).toThrow();

    const output = harness.stdout.join("");
    const jsonStart = output.indexOf("{");
    const summary = JSON.parse(output.slice(jsonStart)) as Record<
      string,
      unknown
    >;
    expect(summary.productionAdoption).toBe("external-verdict-required");
    expect(summary.smokeModelInvocationAttempts).toBe(0);
  });

  test("refuses to screen when the campaign budget is insufficient", async () => {
    const harness = await startHarness({ budget: { remainingCount: 4 } });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "screen_campaign_budget_insufficient",
    );
  });

  test("refuses to screen a dirty source worktree", async () => {
    const harness = await startHarness({ clean: false });
    await expect(main(screenArgs(harness))).rejects.toThrow("source_not_clean");
  });

  test("refuses to screen against a stale built skill bundle", async () => {
    const harness = await startHarness({ bundledBody: "different body\n" });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "baseline_dist_stale",
    );
  });

  test("refuses candidates that are not shortlisted", async () => {
    const harness = await startHarness({ shortlist: [] });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      `candidate_not_shortlisted:${harness.bodyHash}`,
    );
  });

  test("refuses candidates whose body changed after inventory", async () => {
    const harness = await startHarness();
    const candidateFile = join(
      harness.historyRoot,
      "candidates",
      "candidate.md",
    );
    writeFileSync(candidateFile, `${CANDIDATE_BODY}tampered\n`, "utf8");
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "candidate_changed_after_inventory",
    );
  });

  test("refuses to screen when the skillopt pin verification fails", async () => {
    const harness = await startHarness({ uvExit: 1 });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "skillopt_pin_invalid",
    );
  });

  test("stops on a preflight no-go verdict", async () => {
    const harness = await startHarness({
      preflightVerdict: "no-go",
    });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "preflight:runtime_missing",
    );
  });

  test("stops when seeded fixture readiness fails", async () => {
    const harness = await startHarness({ readinessExit: 1 });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "seeded_fixture_readiness_failed",
    );
  });

  test("stops on a smoke no-go verdict", async () => {
    const harness = await startHarness({ canaryVerdict: "no-go" });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "screen_smoke_no_go",
    );
  });

  test("fails when the evaluate callback produces no screen receipt", async () => {
    const harness = await startHarness({ evaluateCallsCellRunner: false });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "screen_receipt_missing",
    );
  });

  test("fails when the source identity is unavailable", async () => {
    const harness = await startHarness({ gitExit: 1 });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "source_identity_unavailable",
    );
  });

  test("fails closed when the source changes during the screen", async () => {
    const harness = await startHarness({
      gitHashSequence: ["3".repeat(40), "9".repeat(40)],
    });
    await expect(main(screenArgs(harness))).rejects.toThrow(
      "source_changed_during_screen",
    );
  });

  test("writes a structured failure artifact for infrastructure errors", async () => {
    const { EvaluationInfrastructureError } = await import(
      "../evaluation-infrastructure"
    );
    const harness = await startHarness({
      evaluateThrows: new EvaluationInfrastructureError({
        stage: "runtime",
        taskId: "task-a",
        variant: "skillopt",
        status: "runtime-staging-failure",
        criticalFailures: ["boom"],
        receiptPath: null,
      }),
    });
    await expect(main(screenArgs(harness))).rejects.toThrow();
    const artifactRoot = artifactRootFromStderr(harness);
    const failure = JSON.parse(
      readFileSync(join(artifactRoot, "failure.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(failure.error).toBe("evaluation_infrastructure_failure");
    expect(failure.status).toBe("runtime-staging-failure");
    expect(failure.verdict).toBe("no-go");
    expect(failure.reason).toBe("runtime_staging_failure");
    expect(failure.criticalFailures).toEqual(["boom"]);
    expect(failure.productionAdoption).toBe("external-verdict-required");
  });
});
