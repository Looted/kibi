// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import {
  type TaskSpec,
  buildHeldOutCatalog,
  buildPublicCatalog,
} from "../catalog";
import { OBJECTIVE_CASE_CONTRACTS } from "../fixtures/case-contracts";
import {
  parseHeldOutTaskSpec,
  parsePublicTaskSpec,
} from "../fixtures/contracts";
import { buildPrivateManifest } from "../fixtures/evaluator";
import { OBJECTIVE_WORKFLOWS } from "../fixtures/objective-expectations";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import {
  DECISION_CASES,
  QUOTED_GATE_OUTPUT,
  ruleQuoteKey,
} from "../fixtures/task-definitions-decisions";
import { writePublicWorkspace } from "../fixtures/workspace";
import { resultPayload } from "../runtime/case-signals";
import {
  sealDefaultCellEvidence,
  verifierEnvironment,
} from "../runtime/codex-cell-defaults";
import { readWorkspaceSources } from "../runtime/codex-cell-runner";
import {
  DECISION_SETUP_MODES,
  type DecisionSetupMode,
  isDecisionSetupMode,
  setupDecisionFixture,
} from "../runtime/decision-fixture-setup";
import {
  DECISION_FIXTURE_SOURCE,
  DECISION_FIXTURE_TEST,
  DECISION_IDS,
  DECISION_RULE_TITLE,
  IMPACT_REVIEW_PATH,
} from "../runtime/decision-seeds";
import { runIndependentFinalState } from "../runtime/final-state";
import { DEFAULT_FINAL_STATE_REQUESTS } from "../runtime/final-state-requests";
import {
  FIXTURE_BRANCH,
  fixtureCliEnv,
  stopFixtureEngine,
} from "../runtime/fixture-kb-setup";
import { appendTraceReceipt } from "../runtime/jsonrpc";
import { REQUIRED_KIBI_TOOLS } from "../runtime/mcp-broker";
import { stageKibiMcpRuntime } from "../runtime/staged-mcp";
import { type CellEvidence, requiredCallViolations } from "../scoring/cell";

const execFileAsync = promisify(execFile);
const REPOSITORY = resolve(import.meta.dir, "../../..");
const CLI_ROOT = join(REPOSITORY, "packages", "cli");
const SKILL_ROOT = join(REPOSITORY, "packages/cli/src/public/skills");
const NEW_SKILLS = new Set(["kibi-decisions", "kibi-commit-review"]);
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const ALL_TASKS: readonly TaskSpec[] = [
  ...buildPublicCatalog(),
  ...buildHeldOutCatalog(),
];
const NEW_TASKS = ALL_TASKS.filter((task) => NEW_SKILLS.has(task.skill));

function manifestFor(task: TaskSpec) {
  return parsePrivateEvaluatorManifest(
    JSON.stringify(
      buildPrivateManifest({
        task: task as never,
        publicManifestHash: "a".repeat(64),
        workspaceHash: "b".repeat(64),
      }),
    ),
  );
}

function taskById(id: string): TaskSpec {
  const task = ALL_TASKS.find((candidate) => candidate.id === id);
  if (task === undefined) throw new Error(`missing task ${id}`);
  return task;
}

function setupModeOf(task: TaskSpec): DecisionSetupMode {
  const mode = manifestFor(task).fixtureSetup;
  if (!isDecisionSetupMode(mode)) throw new Error(`no decision setup: ${mode}`);
  return mode;
}

async function cli(
  workspace: string,
  args: readonly string[],
): Promise<Readonly<{ exitCode: number; output: string }>> {
  await stopFixtureEngine(workspace);
  const child = Bun.spawn(
    [process.execPath, join(CLI_ROOT, "dist", "cli.js"), ...args],
    {
      cwd: workspace,
      env: fixtureCliEnv(workspace),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  await stopFixtureEngine(workspace);
  return { exitCode, output: `${stdout}${stderr}` };
}

async function git(workspace: string, args: readonly string[]) {
  await execFileAsync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd: workspace,
  });
}

/** A seeded workspace for `task`, staged by its evaluator-owned setup. */
async function stagedWorkspace(task: TaskSpec) {
  const root = await mkdtemp(join(tmpdir(), "skillopt-decision-"));
  roots.push(root);
  const workspace = join(root, "workspace");
  writePublicWorkspace({
    root: workspace,
    task:
      task.split === "held-out"
        ? parseHeldOutTaskSpec(task)
        : parsePublicTaskSpec(task),
    canonicalSkillRoot: SKILL_ROOT,
  });
  try {
    await setupDecisionFixture(workspace, CLI_ROOT, setupModeOf(task));
  } finally {
    await stopFixtureEngine(workspace);
  }
  const privateEvidence = join(root, "private");
  await mkdir(privateEvidence, { recursive: true });
  const launch = await stageKibiMcpRuntime(
    { target: workspace, privateEvidence },
    REPOSITORY,
  );
  const env = verifierEnvironment(
    { ...process.env, KIBI_BRANCH: FIXTURE_BRANCH },
    workspace,
  );
  return { root, workspace, privateEvidence, launch, env };
}

type Staged = Awaited<ReturnType<typeof stagedWorkspace>>;

function line(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * A scripted agent: real MCP calls against the staged server, recorded as a
 * hash-chained broker trace and a Codex-style transcript.
 */
class ScriptedAgent {
  private readonly events: string[] = [];
  private sequence = 0;
  readonly tracePath: string;

  constructor(
    private readonly staged: Staged,
    private readonly client: Client,
  ) {
    this.tracePath = join(staged.privateEvidence, "broker-trace.jsonl");
  }

  async call(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.sequence += 1;
    const id = `rpc-${this.sequence}`;
    await appendTraceReceipt(this.tracePath, {
      correlationId: id,
      direction: "target_to_server",
      kind: "request",
      method: "tools/call",
      toolName: tool,
      payload: { params: { name: tool, arguments: args } },
    });
    const result = (await this.client.callTool(
      { name: tool, arguments: args },
      undefined,
      { timeout: 180_000 },
    )) as Record<string, unknown>;
    await appendTraceReceipt(this.tracePath, {
      correlationId: id,
      direction: "server_to_target",
      kind: "response",
      method: "tools/call",
      toolName: tool,
      payload: { result },
    });
    this.events.push(
      line({
        type: "item.completed",
        item: {
          id: `call-${this.sequence}`,
          type: "mcp_tool_call",
          server: "kibi",
          tool,
          arguments: args,
        },
      }),
    );
    if (result.isError === true)
      throw new Error(
        `${tool} failed: ${JSON.stringify(result).slice(0, 1500)}`,
      );
    return result;
  }

  /** The typed `data` of a successful call. */
  async data(tool: string, args: Record<string, unknown>) {
    const payload = resultPayload(await this.call(tool, args));
    if (payload === null) throw new Error(`${tool} returned no payload`);
    return payload;
  }

  async edit(path: string, content: string): Promise<void> {
    const target = join(this.staged.workspace, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    this.sequence += 1;
    this.events.push(
      line({
        type: "item.completed",
        item: {
          id: `edit-${this.sequence}`,
          type: "file_change",
          changes: [{ path, kind: "update" }],
        },
      }),
    );
  }

  transcript(answer: string): string {
    return [
      ...this.events,
      line({
        type: "item.completed",
        item: {
          id: "final",
          type: "agent_message",
          text: line({ completed: true, answer }),
        },
      }),
    ].join("\n");
  }
}

async function withAgent(
  staged: Staged,
  script: (agent: ScriptedAgent) => Promise<string>,
): Promise<Readonly<{ transcript: string; brokerTrace: string }>> {
  const client = new Client({ name: "fixture-agent", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: staged.launch.command,
      args: [...staged.launch.args],
      cwd: staged.workspace,
      env: staged.env,
      stderr: "pipe",
    }),
  );
  const agent = new ScriptedAgent(staged, client);
  let answer: string;
  try {
    answer = await script(agent);
  } finally {
    await client.close();
    await stopFixtureEngine(staged.workspace);
  }
  return {
    transcript: agent.transcript(answer),
    brokerTrace: await readFile(agent.tracePath, "utf8"),
  };
}

let finalStateRound = 0;

async function finalState(staged: Staged): Promise<string> {
  finalStateRound += 1;
  const receipt = await runIndependentFinalState({
    launch: {
      command: staged.launch.command,
      args: [...staged.launch.args],
      cwd: staged.workspace,
      env: staged.env,
    },
    receiptPath: join(staged.privateEvidence, `final-${finalStateRound}.json`),
    requests: DEFAULT_FINAL_STATE_REQUESTS.map((request) => ({
      tool: request.tool,
      args: { ...request.args },
    })),
    timeoutMs: 180_000,
  });
  await stopFixtureEngine(staged.workspace);
  return JSON.stringify(receipt);
}

function seal(
  task: TaskSpec,
  evidence: Readonly<{
    finalState: string;
    brokerTrace?: string;
    transcript?: string;
    workspaceFiles: Readonly<Record<string, string>>;
  }>,
) {
  const manifest = manifestFor(task);
  const sealed = sealDefaultCellEvidence(
    {
      evaluatorManifest: manifest,
      finalStateRequests: DEFAULT_FINAL_STATE_REQUESTS,
    },
    {
      finalState: evidence.finalState,
      brokerTrace: evidence.brokerTrace ?? "",
      diagnosticReceipt: "",
      transcript: evidence.transcript ?? "",
      workspaceFiles: evidence.workspaceFiles,
    },
  );
  const claims = new Map(
    sealed.finalState.claims.map((claim) => [claim.key, claim.value]),
  );
  return { manifest, sealed, claims };
}

function signalKeys(task: TaskSpec): readonly string[] {
  const workflow = OBJECTIVE_WORKFLOWS[task.taskData.objectiveCode];
  return (workflow?.requiredSignals ?? []).map(
    (_, index) => `workflow-signal-${index + 1}`,
  );
}

/** No required signal of any task sharing this seed passes on the seed. */
function expectSeedPassesNoSignal(
  mode: DecisionSetupMode,
  seed: Readonly<{
    finalState: string;
    workspaceFiles: Readonly<Record<string, string>>;
  }>,
): void {
  const tasks = NEW_TASKS.filter((task) => setupModeOf(task) === mode);
  expect(tasks.length).toBeGreaterThan(0);
  for (const task of tasks) {
    const { claims } = seal(task, seed);
    for (const key of signalKeys(task)) {
      expect(`${task.id} ${key}=${String(claims.get(key))}`).toBe(
        `${task.id} ${key}=false`,
      );
    }
  }
}

function expectSolved(
  task: TaskSpec,
  sealedResult: ReturnType<typeof seal>,
): void {
  const { manifest, sealed, claims } = sealedResult;
  const workflow = manifest.workflowExpectation;
  if (workflow == null) throw new Error("missing workflow expectation");
  const failed = manifest.expectedFinalState
    .filter((assertion) => assertion.critical)
    .filter((assertion) => claims.get(assertion.key) !== assertion.expected)
    .map(
      (assertion) =>
        `${assertion.key} (${assertion.query}) expected ${String(assertion.expected)} got ${String(claims.get(assertion.key))}`,
    );
  expect(failed).toEqual([]);
  expect(sealed.finalState.closeout).toEqual({
    taskOutcome: workflow.expectedOutcome,
    kbState: workflow.expectedKbState,
    verificationState: workflow.expectedVerificationState,
    proofState: workflow.expectedProofState,
    limitationDisposition: workflow.expectedLimitationDisposition,
  });
  const contract = manifest.protocolContract;
  if (contract == null) throw new Error("missing protocol contract");
  expect(
    requiredCallViolations(contract, {
      broker: sealed.broker,
    } as unknown as CellEvidence),
  ).toEqual([]);
  const forbidden = new Set(contract.forbiddenTools);
  expect(
    sealed.broker.orderedCalls
      .map(({ tool }) => tool)
      .filter((tool) => forbidden.has(tool)),
  ).toEqual([]);
}

/** The gate output a commit-review prompt quotes is what the seed's gate prints. */
async function expectQuotedGateOutput(
  task: TaskSpec,
  workspace: string,
): Promise<void> {
  if (task.skill !== "kibi-commit-review") return;
  const quoted = Object.values(QUOTED_GATE_OUTPUT).find((output) =>
    task.prompt.includes(output),
  );
  if (quoted === undefined) throw new Error(`${task.id} quotes no gate output`);
  const gate = await cli(
    workspace,
    quoted === QUOTED_GATE_OUTPUT.coordinates
      ? ["check-generated", "--staged", "--changed-only"]
      : ["check", "--staged"],
  );
  // A firm-rule contradiction with current symbol evidence only warns.
  if (quoted === QUOTED_GATE_OUTPUT.conflict)
    expect(gate.exitCode, task.id).toBe(0);
  else expect(gate.exitCode, task.id).not.toBe(0);
  const printed = new Set(gate.output.split("\n"));
  for (const quotedLine of quoted.split("\n")) {
    if (quotedLine !== "")
      expect(printed.has(quotedLine), `${task.id}: ${quotedLine}`).toBe(true);
  }
}

/** Stage `task`, check the seed, run `script`, and check the solved state. */
async function solve(
  taskId: string,
  script: (agent: ScriptedAgent, staged: Staged) => Promise<string>,
): Promise<Staged> {
  const task = taskById(taskId);
  const staged = await stagedWorkspace(task);
  expectSeedPassesNoSignal(setupModeOf(task), {
    finalState: await finalState(staged),
    workspaceFiles: await readWorkspaceSources(staged.workspace),
  });
  await expectQuotedGateOutput(task, staged.workspace);
  const run = await withAgent(staged, (agent) => script(agent, staged));
  const solved = seal(task, {
    finalState: await finalState(staged),
    brokerTrace: run.brokerTrace,
    transcript: run.transcript,
    workspaceFiles: await readWorkspaceSources(staged.workspace),
  });
  expectSolved(task, solved);
  return staged;
}

function answerBlock(fields: Record<string, unknown>): string {
  return [
    "```kibi-answer",
    line({
      verdict: null,
      governing: [],
      conflict: null,
      unknowns: [],
      nextStep: null,
      proof: null,
      ...fields,
    }),
    "```",
  ].join("\n");
}

const CONFLICT_ANSWER = [
  `This request conflicts with ${DECISION_IDS.rule} (firm, set by the naming review): a fixture family name must be at most 32 characters after trimming, and a longer name is rejected.`,
  "I did not change the code or the rule. Do you want to change that rule? If so, tell me the new limit and why, and I will supersede it.",
  answerBlock({
    verdict: "conflict",
    governing: [DECISION_IDS.rule],
    conflict: "the request lifts the firm 32 character limit",
    nextStep: "ask the person whether to change the rule",
  }),
].join("\n\n");

async function ledger(agent: ScriptedAgent, prose: string) {
  const data = await agent.data("kb_model", { mode: "analyze", text: prose });
  const receipt = data.receipt as Record<string, unknown>;
  const contract = receipt.inventory_contract as Record<string, string>;
  const propositions = receipt.propositions as Record<string, unknown>[];
  return {
    semantic_text: prose,
    semantic_inventory_version: contract.version,
    semantic_source_field: contract.source_field,
    semantic_source_hash: contract.source_hash,
    semantic_inventory: propositions,
    logic_claims: propositions.map((proposition) => proposition.claim_key),
  };
}

async function discover(agent: ScriptedAgent, id: string = DECISION_IDS.rule) {
  await agent.call("kb_search", {
    query: "fixture family name",
    sourceLocations: [{ path: "src/fixture.ts" }],
  });
  await agent.call("kb_query", { id });
}

/** Record a new rule: scenario, requirement, enforcing symbol, check. */
async function recordRule(
  agent: ScriptedAgent,
  input: Readonly<{
    id: string;
    title: string;
    prose: string;
    scenario: string;
    firmness: "firm" | "default";
    quote?: string;
    supersedes?: string;
    why?: string;
  }>,
): Promise<void> {
  const scenarioId = `SCEN-${input.id.slice(4)}`;
  await agent.call("kb_upsert", {
    type: "scenario",
    id: scenarioId,
    properties: { title: input.scenario, status: "active" },
    relationships: [
      { type: "verified_by", from: scenarioId, to: DECISION_IDS.test },
    ],
    document: {
      body: `${input.scenario}. Given such a fixture family name, when fixtureFamily is called with it, then the call follows this rule.`,
    },
  });
  const body = [
    input.prose,
    "",
    "## Context",
    "",
    input.quote === undefined
      ? "The agent chose this check on its own while changing fixtureFamily in this session; nobody stated it as a rule."
      : "The person stated this rule in the session while fixtureFamily was being changed in src/fixture.ts.",
    ...(input.why === undefined
      ? []
      : ["", "## Why this changed", "", input.why]),
    ...(input.quote === undefined
      ? []
      : ["", "## Source", "", `> ${input.quote}`, "", "Session request."]),
  ].join("\n");
  await agent.call("kb_upsert", {
    type: "req",
    id: input.id,
    properties: {
      title: input.title,
      ...(await ledger(agent, input.prose)),
      status: "open",
      priority: "must",
      firmness: input.firmness,
      origin:
        input.quote === undefined
          ? { kind: "agent" }
          : { kind: "agent", ref: `session request: "${input.quote}"` },
    },
    relationships: [
      { type: "specified_by", from: input.id, to: scenarioId },
      ...(input.supersedes === undefined
        ? []
        : [{ type: "supersedes", from: input.id, to: input.supersedes }]),
    ],
    document: { body },
  });
  if (input.supersedes !== undefined) {
    await agent.call("kb_upsert", {
      type: "req",
      id: input.supersedes,
      properties: { title: DECISION_RULE_TITLE, status: "closed" },
    });
  }
  await agent.call("kb_upsert", {
    type: "symbol",
    id: DECISION_IDS.symbol,
    properties: {
      title: "fixtureFamily",
      status: "active",
      sourceFile: "src/fixture.ts",
    },
    relationships: [
      { type: "implements", from: DECISION_IDS.symbol, to: input.id },
      {
        type: "covered_by",
        from: DECISION_IDS.symbol,
        to: DECISION_IDS.test,
      },
    ],
  });
  await agent.call("kb_check", {});
}

const COMMANDS_ANSWER = [
  "I authored the symbol entry for fixtureFamilyLabel through Kibi (implements REQ-fixture-family-label, covered_by TEST-fixture-family-label). Run:",
  "",
  "```bash",
  "git add .kb/symbols.yaml",
  "npx --no-install kibi check --staged",
  "```",
  "",
  "Do not bypass the hook with --no-verify.",
].join("\n");

const UNSTAGE_ANSWER = [
  "Symbol coordinates are a gitignored local cache and never part of a commit; nothing else needs staging. Run:",
  "",
  "```bash",
  "git rm --cached .kb/symbol-coordinates.yaml",
  "npx --no-install kibi check-generated --staged",
  "npx --no-install kibi check --staged",
  "```",
].join("\n");

/** What the person runs after the agent: stage, then the gates. */
async function personRunsGate(
  staged: Staged,
  paths: readonly string[],
  unstage: readonly string[] = [],
): Promise<void> {
  if (unstage.length > 0)
    await git(staged.workspace, [
      "rm",
      "--cached",
      "--quiet",
      "--",
      ...unstage,
    ]);
  if (paths.length > 0) await git(staged.workspace, ["add", "--", ...paths]);
  const generated = await cli(staged.workspace, [
    "check-generated",
    "--staged",
    "--changed-only",
  ]);
  expect(`${generated.exitCode}\n${generated.output}`).toStartWith("0\n");
  const gate = await cli(staged.workspace, ["check", "--staged"]);
  expect(`${gate.exitCode}\n${gate.output}`).toStartWith("0\n");
}

describe("decision and commit-review catalog", () => {
  test("every new task has a contract, a decision setup and a broker-advertised protocol", () => {
    expect(NEW_TASKS).toHaveLength(70);
    const advertised = new Set<string>(REQUIRED_KIBI_TOOLS);
    for (const task of NEW_TASKS) {
      const contract = OBJECTIVE_CASE_CONTRACTS[task.taskData.objectiveCode];
      expect(contract, task.id).toBeDefined();
      expect(DECISION_SETUP_MODES).toContain(setupModeOf(task));
      for (const tool of contract?.requiredTools ?? []) {
        expect(advertised.has(tool), `${task.id} ${tool}`).toBe(true);
      }
      expect(task.allowedPublicFiles).toContain(
        `skills/${task.skill}/SKILL.md`,
      );
      if (task.skill === "kibi-commit-review") {
        expect(
          Object.values(QUOTED_GATE_OUTPUT).some((output) =>
            task.prompt.includes(output),
          ),
          task.id,
        ).toBe(true);
      }
    }
  });

  test("tasks that score the person's words carry a private quote fragment", () => {
    for (const task of NEW_TASKS) {
      const signals =
        OBJECTIVE_WORKFLOWS[task.taskData.objectiveCode]?.requiredSignals ?? [];
      const key = ruleQuoteKey(task.id);
      if (signals.some((signal) => signal.includes("the person's words"))) {
        expect(key, task.id).toBeDefined();
        expect(task.prompt.toLowerCase()).toContain(key ?? "\0");
      }
    }
    expect(Object.keys(DECISION_CASES)).toHaveLength(70);
  });

  test("held-out prompts stay out of the public catalog", () => {
    const publicPrompts = new Set(
      buildPublicCatalog().map((task) => task.prompt),
    );
    for (const task of buildHeldOutCatalog()) {
      if (NEW_SKILLS.has(task.skill)) {
        expect(publicPrompts.has(task.prompt), task.id).toBe(false);
      }
    }
  });
});

describe("decision fixtures: seeds pass no signal, scripted solutions pass all", () => {
  test("stated rule capture", async () => {
    await solve(
      "kibi-decisions-stated-rule-capture-development-1",
      async (agent) => {
        await discover(agent);
        await agent.edit(
          "src/fixture.ts",
          DECISION_FIXTURE_SOURCE.replace(
            "  return trimmed;",
            '  if (trimmed.includes("/")) {\n    throw new Error("fixture family name contains a slash");\n  }\n  return trimmed;',
          ),
        );
        await agent.edit(
          "tests/fixture-family.test.ts",
          DECISION_FIXTURE_TEST.replace(
            "});\n",
            '  expect(() => fixtureFamily("a/b")).toThrow();\n});\n',
          ),
        );
        await recordRule(agent, {
          id: "REQ-fixture-family-no-slash",
          title: "Fixture family names never contain a slash",
          prose: "A fixture family name must not contain a slash.",
          scenario: "A fixture family name with a slash is rejected",
          firmness: "firm",
          quote:
            "always reject fixture family names that contain a slash, they end up in file paths",
        });
        return `Recorded REQ-fixture-family-no-slash as firm.\n\n${answerBlock({ verdict: "governed", governing: ["REQ-fixture-family-no-slash"] })}`;
      },
    );
  }, 600_000);

  test("firm rule conflict", async () => {
    await solve(
      "kibi-decisions-firm-rule-conflict-development-1",
      async (agent) => {
        await discover(agent);
        return CONFLICT_ANSWER;
      },
    );
  }, 600_000);

  test("supersede with reason", async () => {
    await solve(
      "kibi-decisions-supersede-with-reason-development-1",
      async (agent) => {
        await discover(agent);
        await agent.edit(
          "src/fixture.ts",
          DECISION_FIXTURE_SOURCE.replaceAll("32", "40"),
        );
        await agent.edit(
          "tests/fixture-family.test.ts",
          DECISION_FIXTURE_TEST.replaceAll("32", "40").replace(
            "repeat(33)",
            "repeat(41)",
          ),
        );
        await recordRule(agent, {
          id: "REQ-fixture-family-name-length-40",
          title: "Fixture family names are at most 40 characters",
          prose:
            "A fixture family name must be at most 40 characters after trimming. A longer name is rejected.",
          scenario:
            "A fixture family name longer than 40 characters is rejected",
          firmness: "firm",
          quote:
            "the fixture family name limit is now 40 characters, the export column was widened to 40 in the last release",
          supersedes: DECISION_IDS.rule,
          why: "The person said the export column was widened to 40 characters in the last release, so the old 32 character limit no longer matches the column it protected.",
        });
        return `Superseded ${DECISION_IDS.rule} with REQ-fixture-family-name-length-40.\n\n${answerBlock({ verdict: "governed", governing: ["REQ-fixture-family-name-length-40"] })}`;
      },
    );
  }, 600_000);

  test("compile intent review", async () => {
    await solve(
      "kibi-decisions-compile-intent-review-development-1",
      async (agent) => {
        await discover(agent);
        const intent = {
          intent:
            "A fixture family name must be at least 4 characters after trimming.",
          mode: "create",
          context: "The person stated this naming rule in the session.",
        };
        await agent.call("kb_compile_intent", intent);
        const plan = await agent.data("kb_compile_intent", {
          ...intent,
          conflictReviews: [
            {
              requirementId: DECISION_IDS.rule,
              verdict: "no_conflict",
              note: "A minimum length is compatible with the 32 character maximum.",
            },
          ],
        });
        expect(plan.status).toBe("ready");
        await agent.call("kb_apply_plan", {
          plan,
          approvedPlanHash: plan.planHash,
        });
        const target = plan.target as Record<string, unknown>;
        const id = String(target.id ?? target.requirementId);
        const current = await agent.data("kb_query", { id });
        const [entity] = current.entities as Record<string, unknown>[];
        await agent.call("kb_upsert", {
          type: "req",
          id,
          properties: {
            title: entity?.title,
            status: entity?.status,
            firmness: "firm",
            origin: {
              kind: "agent",
              ref: 'session request: "A fixture family name must be at least 4 characters after trimming."',
            },
          },
          document: {
            body: [
              "A fixture family name must be at least 4 characters after trimming.",
              "",
              "## Context",
              "",
              "The person stated this naming rule in the session; it sits beside the firm 32 character maximum.",
              "",
              "## Source",
              "",
              "> A fixture family name must be at least 4 characters after trimming.",
              "",
              "Session request.",
            ].join("\n"),
          },
        });
        await agent.call("kb_check", {});
        return `Applied and recorded ${id} as firm.\n\n${answerBlock({ verdict: "no_conflict", governing: [id] })}`;
      },
    );
  }, 600_000);

  test("compile intent conflict", async () => {
    await solve(
      "kibi-decisions-compile-intent-review-held-out-2",
      async (agent) => {
        const intent = {
          intent: "A fixture family name may be up to 64 characters long.",
          mode: "create",
          context: "The person stated this naming rule in the session.",
        };
        await agent.call("kb_compile_intent", intent);
        const blocked = await agent.data("kb_compile_intent", {
          ...intent,
          conflictReviews: [
            {
              requirementId: DECISION_IDS.rule,
              verdict: "conflict",
              note: "64 characters exceeds the firm 32 character maximum.",
            },
          ],
        });
        expect(blocked.status).toBe("blocked");
        return CONFLICT_ANSWER;
      },
    );
  }, 600_000);

  test("unrecorded change closeout with the person's rule", async () => {
    await solve(
      "kibi-decisions-unrecorded-change-closeout-development-1",
      async (agent) => {
        await discover(agent);
        await recordRule(agent, {
          id: "REQ-fixture-family-no-whitespace",
          title: "Fixture family names never contain whitespace",
          prose: "A fixture family name must not contain whitespace.",
          scenario: "A fixture family name with whitespace is rejected",
          firmness: "firm",
          quote:
            "from now on reject fixture family names with spaces or tabs in them",
        });
        return `Recorded REQ-fixture-family-no-whitespace as firm.\n\n${answerBlock({ verdict: "governed", governing: ["REQ-fixture-family-no-whitespace"] })}`;
      },
    );
  }, 600_000);

  test("unrecorded change closeout with the agent's own pick", async () => {
    await solve(
      "kibi-decisions-unrecorded-change-closeout-train-2",
      async (agent) => {
        await discover(agent);
        await recordRule(agent, {
          id: "REQ-fixture-family-no-whitespace",
          title: "Fixture family names never contain whitespace",
          prose: "A fixture family name must not contain whitespace.",
          scenario: "A fixture family name with whitespace is rejected",
          firmness: "default",
        });
        return `Recorded my own choice as REQ-fixture-family-no-whitespace (default); please confirm it.\n\n${answerBlock({ verdict: "governed", governing: ["REQ-fixture-family-no-whitespace"] })}`;
      },
    );
  }, 600_000);
});

describe("commit-review fixtures: seeds pass no signal, scripted solutions pass all", () => {
  test("staged symbol evidence", async () => {
    const staged = await solve(
      "kibi-commit-review-staged-impact-missing-development-1",
      async (agent) => {
        await discover(agent, DECISION_IDS.labelRequirement);
        await agent.call("kb_upsert", {
          type: "symbol",
          id: "SYM-fixture-family-label",
          properties: {
            title: "fixtureFamilyLabel",
            status: "active",
            sourceFile: "src/fixture.ts",
            symbol_role: "behavioral",
          },
          relationships: [
            {
              type: "implements",
              from: "SYM-fixture-family-label",
              to: DECISION_IDS.labelRequirement,
            },
            {
              type: "covered_by",
              from: "SYM-fixture-family-label",
              to: DECISION_IDS.labelTest,
            },
          ],
        });
        await agent.call("kb_check", {});
        return COMMANDS_ANSWER;
      },
    );
    await personRunsGate(staged, [".kb/symbols.yaml"]);
  }, 600_000);

  test("staged coordinate cache after a comment-only edit", async () => {
    const staged = await solve(
      "kibi-commit-review-coordinate-cache-staged-train-1",
      async (agent) => {
        await discover(agent);
        return UNSTAGE_ANSWER;
      },
    );
    await personRunsGate(staged, [], [".kb/symbol-coordinates.yaml"]);
  }, 600_000);

  test("staged coordinate cache after a rename-only refactor", async () => {
    const staged = await solve(
      "kibi-commit-review-coordinate-cache-staged-development-1",
      async (agent) => {
        await discover(agent);
        return UNSTAGE_ANSWER;
      },
    );
    await personRunsGate(staged, [], [".kb/symbol-coordinates.yaml"]);
  }, 600_000);

  test("impact review draft", async () => {
    const staged = await solve(
      "kibi-commit-review-impact-review-preparation-development-1",
      async (agent) => {
        const prepared = await agent.data("kb_prepare_impact_review", {
          scope: { kind: "staged" },
        });
        const authorship = prepared.authorship as Record<string, unknown>;
        const template = authorship.recordTemplate as Record<string, unknown>;
        const record = structuredClone(
          template.record as Record<string, unknown>,
        );
        for (const file of record.files as Record<string, unknown>[]) {
          file.analysisReviews = [];
          file.decision =
            file.path === "src/fixture.ts"
              ? {
                  kind: "impact",
                  requirementIds: [DECISION_IDS.rule],
                  knowledge: {
                    state: "still_current",
                    rationale:
                      "The error message now names the rejected value; the 32 character limit is unchanged.",
                  },
                }
              : {
                  kind: "no_impact",
                  reason: "generated symbol coordinates",
                  rationale:
                    "Only the generated line coordinates of fixtureFamily moved.",
                };
        }
        await agent.edit(
          IMPACT_REVIEW_PATH,
          `${JSON.stringify(record, null, 2)}\n`,
        );
        return [
          `I drafted ${IMPACT_REVIEW_PATH}: src/fixture.ts impacts ${DECISION_IDS.rule}, which is still current. The reviewer id is yours to fill in after you review it; then run:`,
          "",
          "```bash",
          `git add ${IMPACT_REVIEW_PATH}`,
          "npx --no-install kibi check --staged",
          "```",
        ].join("\n");
      },
    );
    // The person reviews and signs the record, then stages it.
    const path = join(staged.workspace, IMPACT_REVIEW_PATH);
    const record = JSON.parse(await readFile(path, "utf8"));
    record.reviewer = {
      id: "reviewer@example.test",
      source: "self-claimed-local",
    };
    record.reviewedAt = "2026-10-21T12:00:00.000Z";
    await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await personRunsGate(staged, [IMPACT_REVIEW_PATH]);
  }, 600_000);

  test("staged rule conflict", async () => {
    await solve(
      "kibi-commit-review-staged-rule-conflict-development-1",
      async (agent) => {
        await discover(agent);
        return CONFLICT_ANSWER;
      },
    );
  }, 600_000);

  test("merge commit scope", async () => {
    const staged = await solve(
      "kibi-commit-review-merge-commit-scope-development-1",
      async (agent) => {
        await discover(agent, DECISION_IDS.labelRequirement);
        await agent.call("kb_upsert", {
          type: "symbol",
          id: "SYM-fixture-family-label",
          properties: {
            title: "fixtureFamilyLabel",
            status: "active",
            sourceFile: "src/fixture.ts",
            symbol_role: "behavioral",
          },
          relationships: [
            {
              type: "implements",
              from: "SYM-fixture-family-label",
              to: DECISION_IDS.labelRequirement,
            },
            {
              type: "covered_by",
              from: "SYM-fixture-family-label",
              to: DECISION_IDS.labelTest,
            },
          ],
        });
        await agent.call("kb_check", {});
        return `${COMMANDS_ANSWER}\n\nsrc/inherited.ts comes unchanged from the merged branch, so the merge commit does not judge it and I recorded nothing for it.`;
      },
    );
    await personRunsGate(staged, [".kb/symbols.yaml"]);
  }, 600_000);
});
