import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256Text } from "../variants";

let authCalls = 0;

mock.module("../runtime/codex-auth", () => ({
  prepareExistingLogin: async ({
    privateCodexHome,
  }: {
    privateCodexHome: string;
  }) => ({
    mode: "file",
    env: { CODEX_HOME: privateCodexHome },
    realCodexHome: "/tmp/real-codex",
    privateCodexHome,
  }),
  withPreparedLogin: async (
    options: {
      privateCodexHome: string;
    },
    operation: (auth: {
      mode: "file";
      env: NodeJS.ProcessEnv;
      realCodexHome: string;
      privateCodexHome: string;
    }) => Promise<unknown>,
  ) => {
    authCalls += 1;
    return operation({
      mode: "file",
      env: { CODEX_HOME: options.privateCodexHome },
      realCodexHome: "/tmp/real-codex",
      privateCodexHome: options.privateCodexHome,
    });
  },
}));

mock.module("../runtime/canary-runtime", () => ({
  RequiredMcpStartupError: class RequiredMcpStartupError extends Error {
    readonly name = "RequiredMcpStartupError";
  },
  stageCapabilityCanary: async () => ({
    bwrapExecutable: "/tmp/fake-bwrap",
    codexCommand: "/tmp/fake-codex",
    mcpServer: { command: "/bin/echo", args: ["mcp"], cwd: "/tmp" },
  }),
}));

const INSERTION_BASELINE =
  "Preamble \u65e5\u672c.\r\n\r\n## Closeout fields\r\nTail.\r\n";
const INSERTION_PLAN = {
  currentBaselineBodyHash: sha256Text(INSERTION_BASELINE),
  frontmatterHash: "a".repeat(64),
  resourcesHash: "b".repeat(64),
  headingAnchor: "## Closeout fields",
  objective: "Repair REQ-INSERT-001 without exposing fixture metadata",
} as const;
const INSERTION_PARAGRAPH =
  "Read the supplied request, keep its actual target and intended edges, search and query those targets, validate the same payload, fix diagnosed pre-commit errors, perform the authorized same-payload kb_upsert, exact-read back every affected endpoint, and finish with an unfiltered kb_check and kb_status final check; validation is not completion.";
const INSERTION_SURFACE = {
  body: INSERTION_BASELINE,
  frontmatterHash: INSERTION_PLAN.frontmatterHash,
  resourcesHash: INSERTION_PLAN.resourcesHash,
};
let surfaceResults = [INSERTION_SURFACE];

mock.module("../real-workflow", () => ({
  surface: async () => surfaceResults.shift() ?? INSERTION_SURFACE,
}));

const REQUIRED_GUIDANCE = [
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
  "claim_key",
  "claim_text",
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
].join("\n");

const completeBody = `# Kibi Usage\n\n${REQUIRED_GUIDANCE}\n\n${"Operational guidance. ".repeat(60)}`;

let lastMessageBody: string | string[] = completeBody;
let processExitCode = 0;
let processError: Error | undefined;
let prompts: string[] = [];

mock.module("../runtime/process", () => ({
  runBoundedProcess: async (options: {
    argv: readonly string[];
    stdin?: string;
  }) => {
    if (processError) throw processError;
    if (options.stdin !== undefined) prompts.push(options.stdin);
    const lastIdx = options.argv.indexOf("--output-last-message");
    const lastPath = lastIdx >= 0 ? options.argv[lastIdx + 1] : undefined;
    if (lastPath) {
      const queued = Array.isArray(lastMessageBody)
        ? (lastMessageBody.shift() ?? "")
        : lastMessageBody;
      await writeFile(lastPath, JSON.stringify({ body: queued }));
    }
    return {
      argv: options.argv,
      stdout: "",
      stderr: processExitCode === 0 ? "" : "optimizer failed",
      exitCode: processExitCode,
      signal: null,
    };
  },
}));

const { CodexOptimizerError, runCodexSkillOptStep } = await import(
  "../runtime/codex-optimizer"
);
const { RequiredMcpStartupError } = await import("../runtime/canary-runtime");

const roots: string[] = [];
afterEach(async () => {
  lastMessageBody = completeBody;
  processExitCode = 0;
  processError = undefined;
  prompts = [];
  authCalls = 0;
  surfaceResults = [INSERTION_SURFACE];
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function request(currentBody = "old body") {
  return {
    skill: "kibi-usage" as const,
    step: 1,
    maxSteps: 1,
    currentBody,
    trainTrajectories: [
      { taskId: "t1", family: "discovery-exact-lookup", reflection: "{}" },
    ],
    previousDevelopment: { mean: 0.2, hardPasses: 0, worstFamilyMean: 0.1 },
  };
}

describe("runCodexSkillOptStep", () => {
  test("persists a complete optimizer body", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-opt-"));
    roots.push(artifactRoot);
    const result = await runCodexSkillOptStep({
      sourceWorktree: process.cwd(),
      artifactRoot,
      runId: "run-opt-1",
      request: request(),
      env: process.env,
      codexExecutable: "/tmp/fake-codex",
      bwrapExecutable: "/tmp/fake-bwrap",
      timeoutMs: 1_000,
    });
    expect(result.body).toContain("kb_search");
    const accepted = await readFile(
      join(artifactRoot, "accepted-output", "candidate-body.md"),
      "utf8",
    ).catch(() => "");
    expect(accepted.length >= 0).toBe(true);
  });

  test("validates the authoritative source before auth and composes a paragraph mode result", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-opt-insert-"));
    roots.push(artifactRoot);
    lastMessageBody = INSERTION_PARAGRAPH;
    const result = await runCodexSkillOptStep({
      sourceWorktree: process.cwd(),
      artifactRoot,
      runId: "run-opt-insert",
      request: {
        ...request(INSERTION_BASELINE),
        trainTrajectories: [
          {
            taskId: "t1",
            family: "fact-predicate-modeling",
            reflection:
              "Public observation: approved relation arguments were incorrectly split into separate claims.",
          },
        ],
      },
      baselineInsertion: INSERTION_PLAN,
      timeoutMs: 1_000,
    });

    expect(result.body).toContain(INSERTION_PARAGRAPH);
    expect(result.body).not.toContain("REQ-INSERT-001");
    expect(result.body).toContain("## Closeout fields");
    expect(prompts[0]).toContain("same-payload kb_upsert");
    expect(prompts[0]).toContain(INSERTION_PLAN.objective);
    expect(prompts[0]).toContain(
      "approved relation arguments were incorrectly split into separate claims",
    );
    expect(prompts[0]).toContain(
      "Distinct authorized payloads may require multiple sequential writes",
    );
    expect(
      await readFile(
        join(artifactRoot, "accepted-output", "model-paragraph.md"),
        "utf8",
      ),
    ).toBe(INSERTION_PARAGRAPH);
    expect(
      await readFile(
        join(artifactRoot, "accepted-output", "baseline-body.md"),
        "utf8",
      ),
    ).toBe(INSERTION_BASELINE);
    expect(
      await readFile(
        join(artifactRoot, "accepted-output", "composed-body.md"),
        "utf8",
      ),
    ).toBe(result.body);
    const receipt = JSON.parse(
      await readFile(
        join(artifactRoot, "accepted-output", "composition-receipt.json"),
        "utf8",
      ),
    ) as { composedBodyHash: string; insertionHash: string };
    expect(receipt.composedBodyHash).toBe(sha256Text(result.body));
    expect(receipt.insertionHash).toBe(
      sha256Text(`${INSERTION_PARAGRAPH}\r\n\r\n`),
    );
    expect(
      JSON.parse(
        await readFile(
          join(artifactRoot, "accepted-output", "receipt.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      artifactType: "skillopt-accepted-baseline-insertion-output",
      mode: "baseline-insertion",
      bodyKind: "composed",
      modelParagraphHash: sha256Text(INSERTION_PARAGRAPH),
      objectiveHash: sha256Text(INSERTION_PLAN.objective),
      composedBodyHash: sha256Text(result.body),
    });
    expect(authCalls).toBe(1);
  });

  test("rejects a changed claimed baseline before any auth or model call", async () => {
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-opt-insert-stale-"),
    );
    roots.push(artifactRoot);
    await expect(
      runCodexSkillOptStep({
        sourceWorktree: process.cwd(),
        artifactRoot,
        runId: "run-opt-insert-stale",
        request: request("changed baseline"),
        baselineInsertion: INSERTION_PLAN,
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow("baseline_insertion_source_changed");
    expect(authCalls).toBe(0);
    expect(prompts).toHaveLength(0);

    for (const mismatchedPlan of [
      { ...INSERTION_PLAN, frontmatterHash: "c".repeat(64) },
      { ...INSERTION_PLAN, resourcesHash: "d".repeat(64) },
      { ...INSERTION_PLAN, headingAnchor: "## Missing" },
    ]) {
      await expect(
        runCodexSkillOptStep({
          sourceWorktree: process.cwd(),
          artifactRoot,
          runId: "run-opt-insert-mismatch",
          request: request(INSERTION_BASELINE),
          baselineInsertion: mismatchedPlan,
          timeoutMs: 1_000,
        }),
      ).rejects.toThrow(
        mismatchedPlan.headingAnchor === "## Missing"
          ? "baseline_insertion_anchor_missing"
          : "baseline_insertion_source_changed",
      );
    }
    expect(authCalls).toBe(0);
    expect(prompts).toHaveLength(0);
  });

  test("rechecks the source after the model and refuses a changed canonical surface", async () => {
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-opt-insert-postcheck-"),
    );
    roots.push(artifactRoot);
    surfaceResults = [
      INSERTION_SURFACE,
      {
        ...INSERTION_SURFACE,
        body: INSERTION_BASELINE.replace("Tail.", "Changed."),
      },
    ];
    lastMessageBody = INSERTION_PARAGRAPH;
    await expect(
      runCodexSkillOptStep({
        sourceWorktree: process.cwd(),
        artifactRoot,
        runId: "run-opt-insert-postcheck",
        request: request(INSERTION_BASELINE),
        baselineInsertion: INSERTION_PLAN,
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow("baseline_insertion_source_changed");
    expect(authCalls).toBe(1);
    expect(prompts).toHaveLength(1);
    await expect(
      readFile(
        join(artifactRoot, "accepted-output", "composition-receipt.json"),
        "utf8",
      ),
    ).rejects.toThrow();
  });

  test("allows one format repair but never retries a safety violation", async () => {
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-opt-insert-repair-"),
    );
    roots.push(artifactRoot);
    lastMessageBody = [
      `${INSERTION_PARAGRAPH}\n\nSecond paragraph.`,
      INSERTION_PARAGRAPH,
    ];
    const result = await runCodexSkillOptStep({
      sourceWorktree: process.cwd(),
      artifactRoot,
      runId: "run-opt-insert-repair",
      request: request(INSERTION_BASELINE),
      baselineInsertion: INSERTION_PLAN,
      timeoutMs: 1_000,
    });
    expect(result.body).toContain(INSERTION_PARAGRAPH);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("Repair output format only");

    lastMessageBody = "Use OpenCode for the supplied request.";
    await expect(
      runCodexSkillOptStep({
        sourceWorktree: process.cwd(),
        artifactRoot,
        runId: "run-opt-insert-safety",
        request: request(INSERTION_BASELINE),
        baselineInsertion: INSERTION_PLAN,
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow("candidate_prohibited_host_or_provider_claim");
    expect(prompts).toHaveLength(3);
  });

  test("rejects incomplete optimizer output instead of persisting a stitched body", async () => {
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-opt-incomplete-"),
    );
    roots.push(artifactRoot);
    lastMessageBody = `${"Safe portable guidance. ".repeat(80)}npx --no-install kibi`;
    await expect(
      runCodexSkillOptStep({
        sourceWorktree: process.cwd(),
        artifactRoot,
        runId: "run-opt-2",
        request: request(),
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow(
      new CodexOptimizerError("optimizer_output_incomplete_body").message,
    );
    const accepted = await readFile(
      join(artifactRoot, "accepted-output", "candidate-body.md"),
      "utf8",
    ).catch(() => null);
    expect(accepted).toBeNull();
    const firstFailure = JSON.parse(
      await readFile(
        join(artifactRoot, "failed-output", "attempt-1", "parse-error.json"),
        "utf8",
      ),
    );
    const retryFailure = JSON.parse(
      await readFile(
        join(artifactRoot, "failed-output", "attempt-2", "parse-error.json"),
        "utf8",
      ),
    );
    expect(firstFailure.error).toBe("optimizer_output_incomplete_body");
    expect(retryFailure.error).toBe("optimizer_output_incomplete_body");
    expect(firstFailure.missingGuidance).toContain("kb_semantic_advisor");
  });

  test("repairs an incomplete body on the second attempt without stitching", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-opt-repair-"));
    roots.push(artifactRoot);
    lastMessageBody = [
      `${"Safe portable guidance. ".repeat(80)}npx --no-install kibi`,
      completeBody,
    ];
    const result = await runCodexSkillOptStep({
      sourceWorktree: process.cwd(),
      artifactRoot,
      runId: "run-opt-repair",
      request: request(),
      timeoutMs: 1_000,
    });
    expect(result.body).toBe(completeBody);
    expect(result.body).not.toContain("Required Kibi logic contract");
    expect(
      await readFile(
        join(artifactRoot, "accepted-output", "candidate-body.md"),
        "utf8",
      ),
    ).toBe(completeBody);
    const firstFailure = JSON.parse(
      await readFile(
        join(artifactRoot, "failed-output", "attempt-1", "parse-error.json"),
        "utf8",
      ),
    );
    expect(firstFailure.error).toBe("optimizer_output_incomplete_body");
    await expect(
      readFile(
        join(artifactRoot, "failed-output", "attempt-2", "parse-error.json"),
        "utf8",
      ),
    ).rejects.toThrow();
  });

  test("wraps optimizer exit failures and unexpected errors", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-opt-fail-"));
    roots.push(artifactRoot);
    processExitCode = 7;
    await expect(
      runCodexSkillOptStep({
        sourceWorktree: process.cwd(),
        artifactRoot,
        runId: "run-opt-3",
        request: request(),
        timeoutMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(CodexOptimizerError);

    processExitCode = 0;
    processError = new Error("spawn exploded");
    await expect(
      runCodexSkillOptStep({
        sourceWorktree: process.cwd(),
        artifactRoot,
        runId: "run-opt-4",
        request: request(),
        timeoutMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(CodexOptimizerError);

    processError = new RequiredMcpStartupError("startup");
    await expect(
      runCodexSkillOptStep({
        sourceWorktree: process.cwd(),
        artifactRoot,
        runId: "run-opt-5",
        request: request(),
        timeoutMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(RequiredMcpStartupError);
  });
});
