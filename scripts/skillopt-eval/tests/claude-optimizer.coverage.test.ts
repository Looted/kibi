import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { chmod, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as realWorkflow from "../real-workflow";
import {
  claudeOptimizerLastMessage,
  runClaudeSkillOptStep,
} from "../runtime/claude-optimizer";
import { CodexOptimizerError } from "../runtime/codex-optimizer";
import * as processRunner from "../runtime/process";
import { sha256Text } from "../variants";

const REQUIRED_GUIDANCE = [
  "npx --no-install kibi",
  "bunx --no-install kibi",
  "Do not read or edit files inside `.kb` directly",
  "kb_search",
  "kb_query",
  "kb_upsert",
  "kb_check",
  "kb_model",
  'mode: "analyze"',
  'mode: "predicates"',
  'mode: "requirement"',
  "dryRun: true",
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
const COMPLETE_BODY = `# Kibi Usage\n\n${REQUIRED_GUIDANCE}\n\n${"Operational guidance. ".repeat(60)}`;

const INSERTION_BASELINE = "Preamble.\n\n## Closeout fields\nTail.\n";
const INSERTION_PLAN = {
  currentBaselineBodyHash: sha256Text(INSERTION_BASELINE),
  frontmatterHash: "a".repeat(64),
  resourcesHash: "b".repeat(64),
  headingAnchor: "## Closeout fields",
  objective: "Repair the closeout without exposing fixture metadata",
} as const;
const INSERTION_PARAGRAPH =
  "Read the supplied request, keep its actual target and intended edges, search and query those targets, validate the same payload, fix diagnosed pre-commit errors, perform the authorized same-payload kb_upsert, exact-read back every affected endpoint, and finish with an unfiltered kb_check and kb_status final check; validation is not completion.";

const roots: string[] = [];
const restores: Array<() => void> = [];
const savedEnv = { ...process.env };

beforeEach(() => {
  process.env.KIBI_SKILLOPT_TARGET_MODEL = "claude-sonnet-5-5";
  process.env.KIBI_SKILLOPT_OPTIMIZER_MODEL = "claude-opus-5-5";
  process.env.KIBI_SKILLOPT_MODEL_PRICING = JSON.stringify({
    "claude-sonnet-5-5": null,
    "claude-opus-5-5": {
      inputPerMillionTokens: 4,
      cachedInputPerMillionTokens: 0.2,
      outputPerMillionTokens: 20,
    },
  });
});

afterEach(async () => {
  while (restores.length > 0) restores.pop()?.();
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

async function temporaryRoot(): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "skillopt-claude-optimizer-")),
  );
  roots.push(root);
  return root;
}

function structured(body: string): string {
  return `${[
    "not json",
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "thinking aloud" }] },
    }),
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      structured_output: { body },
    }),
  ].join("\n")}\n`;
}

type Reply = { exitCode: number; stdout: string; stderr?: string } | Error;

function stubClaude(replies: Reply[]) {
  const calls: Array<{ argv: readonly string[]; stdin?: string }> = [];
  const spy = spyOn(processRunner, "runBoundedProcess").mockImplementation(
    (async (options: { argv: readonly string[]; stdin?: string }) => {
      calls.push(options);
      const reply = replies.shift() ?? replies.at(-1);
      if (reply instanceof Error) throw reply;
      if (reply === undefined) throw "no reply";
      return {
        argv: options.argv,
        stdout: reply.stdout,
        stderr: reply.stderr ?? "",
        exitCode: reply.exitCode,
        signal: null,
      };
    }) as never,
  );
  restores.push(() => spy.mockRestore());
  return calls;
}

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

async function options(extra: Record<string, unknown> = {}) {
  const root = await temporaryRoot();
  return {
    sourceWorktree: process.cwd(),
    artifactRoot: join(root, "artifacts"),
    runId: "run-claude-opt",
    request: request(),
    env: { ...process.env, CLAUDE_CONFIG_DIR: join(root, "claude-config") },
    codexExecutable: "/opt/claude",
    timeoutMs: 1_000,
    ...extra,
  };
}

describe("claudeOptimizerLastMessage", () => {
  test("returns the last agent message, or empty without one", () => {
    expect(claudeOptimizerLastMessage(structured("final"))).toBe(
      '{"body":"final"}',
    );
    expect(claudeOptimizerLastMessage("garbage\n\n")).toBe("");
  });
});

describe("runClaudeSkillOptStep", () => {
  test("returns the structured body from a tool-less optimizer run", async () => {
    const calls = stubClaude([
      { exitCode: 0, stdout: structured(COMPLETE_BODY) },
    ]);
    const result = await runClaudeSkillOptStep(await options());
    expect(result.body).toContain("kb_search");
    const argv = calls[0]?.argv ?? [];
    expect(argv[0]).toBe("/opt/claude");
    expect(argv[argv.indexOf("--model") + 1]).toBe("claude-opus-5-5");
    expect(argv[argv.indexOf("--tools") + 1]).toBe("");
    expect(argv).not.toContain("--mcp-config");
    const schema = JSON.parse(argv[argv.indexOf("--json-schema") + 1] ?? "");
    expect(schema.properties.body).toStrictEqual({
      type: "string",
      minLength: 1,
    });
    expect(calls[0]?.stdin).toContain("Current body:\nold body\n");
  });

  test("resolves claude from the environment when no executable is given", async () => {
    const root = await temporaryRoot();
    const claude = join(root, "claude");
    await writeFile(claude, "#!/bin/sh\n");
    await chmod(claude, 0o755);
    const calls = stubClaude([
      { exitCode: 0, stdout: structured(COMPLETE_BODY) },
    ]);
    const base = await options();
    await runClaudeSkillOptStep({
      ...base,
      codexExecutable: undefined,
      env: { ...base.env, KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude },
    });
    expect(calls[0]?.argv[0]).toBe(claude);
  });

  test("a failing optimizer run surfaces as an optimizer error", async () => {
    stubClaude([{ exitCode: 2, stdout: "", stderr: "rate limited" }]);
    const error = await runClaudeSkillOptStep(await options()).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(CodexOptimizerError);
    expect(String((error as Error).message)).toStartWith("optimizer_exit:2");
  });

  test("other failures are wrapped as optimizer errors", async () => {
    stubClaude([new Error("spawn failed")]);
    await expect(runClaudeSkillOptStep(await options())).rejects.toThrow(
      new CodexOptimizerError("spawn failed"),
    );
    restores.pop()?.();
    stubClaude([]);
    await expect(runClaudeSkillOptStep(await options())).rejects.toThrow(
      new CodexOptimizerError("optimizer_failed"),
    );
  });

  test("a baseline insertion is bounded and composed into the baseline", async () => {
    const surface = spyOn(realWorkflow, "surface").mockImplementation(
      (async () => ({
        body: INSERTION_BASELINE,
        frontmatterHash: INSERTION_PLAN.frontmatterHash,
        resourcesHash: INSERTION_PLAN.resourcesHash,
      })) as never,
    );
    restores.push(() => surface.mockRestore());
    const calls = stubClaude([
      { exitCode: 0, stdout: structured(INSERTION_PARAGRAPH) },
    ]);
    const result = await runClaudeSkillOptStep(
      await options({
        request: {
          ...request(INSERTION_BASELINE),
          trainTrajectories: [
            {
              taskId: "t1",
              family: "fact-predicate-modeling",
              reflection: "Public observation: claims were split.",
            },
          ],
        },
        baselineInsertion: INSERTION_PLAN,
      }),
    );
    expect(result.body).toContain(INSERTION_PARAGRAPH);
    expect(result.body).toContain("## Closeout fields");
    const argv = calls[0]?.argv ?? [];
    const schema = JSON.parse(argv[argv.indexOf("--json-schema") + 1] ?? "");
    expect(schema.properties.body.maxLength).toBeNumber();
  });
});
