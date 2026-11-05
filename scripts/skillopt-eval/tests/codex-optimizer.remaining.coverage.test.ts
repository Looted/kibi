import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as realWorkflow from "../real-workflow";
import * as canaryRuntime from "../runtime/canary-runtime";
import * as codexAuth from "../runtime/codex-auth";
import {
  CodexOptimizerError,
  completeSkillOptStep,
  parseBaselineInsertionParagraph,
  runCodexSkillOptStep,
  validateBaselineInsertionSource,
} from "../runtime/codex-optimizer";
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

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  while (restores.length > 0) restores.pop()?.();
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function temporaryRoot(): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "skillopt-codex-optimizer-")),
  );
  roots.push(root);
  return root;
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
    runId: "run-codex-opt",
    request: request(),
    ...extra,
  };
}

function failingSurface(failure: unknown) {
  const spy = spyOn(realWorkflow, "surface").mockImplementation((async () => {
    throw failure;
  }) as never);
  restores.push(() => spy.mockRestore());
}

describe("baseline insertion checks", () => {
  test("a reply without a body field is a missing body", () => {
    expect(() =>
      parseBaselineInsertionParagraph("not json", INSERTION_PLAN),
    ).toThrow(new CodexOptimizerError("optimizer_output_missing_body"));
  });

  test("the source check needs a plan", async () => {
    await expect(
      validateBaselineInsertionSource(await options()),
    ).rejects.toThrow(
      new CodexOptimizerError("baseline_insertion_plan_missing"),
    );
  });

  test("an unreadable source is reported as an optimizer error", async () => {
    const base = await options({
      request: request(INSERTION_BASELINE),
      baselineInsertion: INSERTION_PLAN,
    });
    failingSurface(new Error("skill surface unreadable"));
    await expect(validateBaselineInsertionSource(base)).rejects.toThrow(
      new CodexOptimizerError("skill surface unreadable"),
    );
    restores.pop()?.();
    failingSurface("not an error");
    await expect(validateBaselineInsertionSource(base)).rejects.toThrow(
      new CodexOptimizerError("baseline_insertion_source_invalid"),
    );
  });
});

describe("completeSkillOptStep", () => {
  test("a reply that is not JSON gets one format repair with the previous output", async () => {
    const prompts: string[] = [];
    const replies = ["not json", JSON.stringify({ body: COMPLETE_BODY })];
    const result = await completeSkillOptStep(
      await options(),
      async (prompt) => {
        prompts.push(prompt);
        return {
          result: { exitCode: 0, stderr: "" },
          lastMessage: replies.shift() ?? "",
        };
      },
    );
    expect(result.body).toBe(COMPLETE_BODY);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain(
      "Your previous response was not valid JSON with a body field.",
    );
    expect(prompts[1]).toContain("Previous output:\nnot json");
    expect(prompts[1]).toContain("Current body:\nold body");
  });
});

describe("runCodexSkillOptStep", () => {
  test("a run that leaves no last message is a missing body after the repair", async () => {
    const login = spyOn(codexAuth, "withPreparedLogin").mockImplementation(
      (async (
        login: { privateCodexHome: string },
        operation: (auth: unknown) => Promise<unknown>,
      ) =>
        operation({
          mode: "file",
          env: { CODEX_HOME: login.privateCodexHome },
          realCodexHome: "/tmp/real-codex",
          privateCodexHome: login.privateCodexHome,
        })) as never,
    );
    const stage = spyOn(
      canaryRuntime,
      "stageCapabilityCanary",
    ).mockImplementation((async () => ({
      bwrapExecutable: "/opt/bwrap",
      codexCommand: "/opt/codex",
      mcpServer: { command: "/bin/echo", args: ["mcp"], cwd: "/" },
    })) as never);
    const argvs: string[][] = [];
    const run = spyOn(processRunner, "runBoundedProcess").mockImplementation(
      (async (call: { argv: readonly string[]; cwd: string }) => {
        argvs.push([...call.argv]);
        await rm(join(call.cwd, ".optimizer-output-last-message.json"));
        return {
          argv: call.argv,
          stdout: "",
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      }) as never,
    );
    restores.push(
      () => login.mockRestore(),
      () => stage.mockRestore(),
      () => run.mockRestore(),
    );
    await expect(
      runCodexSkillOptStep(await options({ env: {} })),
    ).rejects.toThrow(new CodexOptimizerError("optimizer_output_missing_body"));
    expect(argvs).toHaveLength(2);
    expect(argvs[0]?.[0]).toBe("/opt/codex");
  });
});
