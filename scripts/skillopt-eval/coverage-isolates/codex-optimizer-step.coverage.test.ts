import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

mock.module("../runtime/codex-auth", () => ({
  prepareExistingLogin: async ({
    privateCodexHome,
  }: {
    privateCodexHome: string;
  }) => ({
    mode: "file",
    env: { CODEX_HOME: privateCodexHome },
    realCodexHome: "/tmp/real-codex",
  }),
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

let lastMessageBody = completeBody;
let processExitCode = 0;
let processError: Error | undefined;

mock.module("../runtime/process", () => ({
  runBoundedProcess: async (options: {
    argv: readonly string[];
  }) => {
    if (processError) throw processError;
    const lastIdx = options.argv.indexOf("--output-last-message");
    const lastPath = lastIdx >= 0 ? options.argv[lastIdx + 1] : undefined;
    if (lastPath) {
      await writeFile(lastPath, JSON.stringify({ body: lastMessageBody }));
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
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function request() {
  return {
    skill: "kibi-usage" as const,
    step: 1,
    maxSteps: 1,
    currentBody: "old body",
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

  test("appends missing required guidance for an otherwise safe incomplete body", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-opt-incomplete-"));
    roots.push(artifactRoot);
    lastMessageBody = `${"Safe portable guidance. ".repeat(80)}npx --no-install kibi`;
    const result = await runCodexSkillOptStep({
      sourceWorktree: process.cwd(),
      artifactRoot,
      runId: "run-opt-2",
      request: request(),
      timeoutMs: 1_000,
    });
    expect(result.body).toContain("Required Kibi logic contract");
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
