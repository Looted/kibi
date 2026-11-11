/*
 * E2E: the SkillOpt optimizer toolchain keeps its contracts across the
 * TypeScript evaluator and the Python optimizer, and the cell harness lets a
 * target write only what the fixture operator approved.
 *
 * REQ-skillopt-host-neutral-optimization — candidate adoption stays blocked
 * until a reviewer approves the exact candidate hashes, optimization changes
 * only skill bodies, and the offline workflow contracts are shared.
 * REQ-skillopt-operator-selected-harness — every harness feeds the same
 * brokered MCP surface and evidence trace.
 *
 * Nothing here calls a model. The Python stages run as real processes under
 * `uv run --project tools/skillopt`; the only replaced piece is the upstream
 * ReflACT trainer, the step that would ask an optimizer model for a body.
 *
 *   1. Cell harness: the evaluator broker, in front of a real downstream MCP
 *      process, advertises the scripted-user tool, forwards a bootstrap plan,
 *      lets the scripted user approve only that plan's exact hash, forwards
 *      exactly one kb_apply_plan of the approved plan, and refuses a replay,
 *      kb_delete, a non-dry-run kb_upsert and unknown tools. Every exchange
 *      lands in the broker trace.
 *   2. Run lock: `contracts/cli.ts validate-run-lock` and the Python RunLock
 *      agree on the run-lock hash; both refuse a lock whose worktree is
 *      dirty, and the Python source lock pins the same SkillOpt commit.
 *   3. Review: a proposal and its approval written by the TypeScript schemas
 *      pass the Python exact-approval check; an approval of another candidate
 *      body is refused, and so is a proposal that changes frontmatter. The
 *      report, ledger, run state, episode and evidence artifacts validate on
 *      both sides.
 *   4. Bridge: the Python CLI accepts a TypeScript bridge request; the Python
 *      bridge runner refuses to start cells without the five staged runtime
 *      paths, and in the bridge's offline mode both languages bind the result
 *      to the same request hash.
 *   5. Training: `python -m kibi_skillopt train` drives the real adapter
 *      through the bridge, freezes the candidate with its hash, and refuses a
 *      training budget above four steps.
 *
 * Run via `bun run documentation/tests/e2e/skillopt-optimizer-toolchain.e2e.ts`.
 */
import "../../../scripts/skillopt-eval/offline-test-preload";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import { bootstrapPlanHash } from "../../../packages/cli/src/operations/bootstrap/types";
import {
  ApprovalSchema,
  EpisodeRequestSchema,
  EpisodeResultSchema,
  EvidenceIndexSchema,
  JsonValueSchema,
  LedgerEntrySchema,
  ProposalSchema,
  ReportV1Schema,
  RunLockSchema,
  RunStateSchema,
  contractHash,
  parseRunLockText,
  runLockHash,
} from "../../../scripts/skillopt-eval/contracts";
import { BridgeRequestSchema } from "../../../scripts/skillopt-eval/runtime/file-bridge";
import { REQUIRED_KIBI_TOOLS } from "../../../scripts/skillopt-eval/runtime/mcp-broker";
import { runMcpBroker } from "../../../scripts/skillopt-eval/runtime/mcp-broker-process";
import { SCRIPTED_USER_TOOL } from "../../../scripts/skillopt-eval/runtime/scripted-user";

const REPO_ROOT = process.cwd();
const BUN = process.execPath;
const DRIVER = "documentation/tests/e2e/skillopt_optimizer_toolchain_driver.py";
const RUN_LOCK_FIXTURE =
  "scripts/skillopt-eval/tests/fixtures/valid-run-lock.json";
const RUN_ID = "00000000-0000-4000-8000-000000000001";
const EPISODE_ID = "00000000-0000-4000-8000-000000000002";
const PROPOSAL_ID = "00000000-0000-4000-8000-000000000003";
const APPROVAL_ID = "00000000-0000-4000-8000-000000000004";
const TIMESTAMP = "2026-07-21T12:00:00Z";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

const root = realpathSync(mkdtempSync(join(tmpdir(), "skillopt-toolchain-")));

function python(stage: string, input: unknown): Record<string, unknown> {
  const inputPath = join(root, `${stage}-input.json`);
  writeFileSync(inputPath, JSON.stringify(input));
  const result = spawnSync(
    "uv",
    ["run", "--project", "tools/skillopt", "python", DRIVER, stage, inputPath],
    { cwd: REPO_ROOT, encoding: "utf8", env: { ...process.env } },
  );
  assert(
    result.status === 0,
    `python ${stage} exited ${result.status}: ${result.stderr}`,
  );
  return JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}");
}

// ---------------------------------------------------------------- 1. harness
const PLAN_STATEMENT = "Invoices must be archived for ten years.";
const plan0 = {
  status: "ready",
  sourceWrites: [],
  candidates: [
    {
      entityType: "req",
      sourceKind: "intent_claim",
      title: PLAN_STATEMENT,
    },
    { entityType: "fact", sourceKind: "repo_metadata", title: "package.json" },
  ],
};
const plan = { ...plan0, planHash: bootstrapPlanHash(plan0) };
const bootstrapContext = {
  projectSummary: "A fixture invoicing service.",
  knowledgeSources: [
    {
      id: "spec",
      kind: "specification" as const,
      title: "Retention spec",
      locator: "docs/retention.md",
      authority: "authoritative" as const,
    },
  ],
  intentClaims: [
    {
      sourceId: "spec",
      reference: "docs/retention.md#1",
      statement: PLAN_STATEMENT,
    },
  ],
};

async function harness(): Promise<void> {
  const serverPath = join(root, "downstream-mcp.ts");
  const tracePath = join(root, "broker-trace.jsonl");
  const profilePath = join(root, "scripted-user.json");
  writeFileSync(
    profilePath,
    JSON.stringify({
      mode: "approve",
      contextAnswer: "Archive invoices.",
      bootstrapContext,
    }),
  );
  const tools = REQUIRED_KIBI_TOOLS.map((name) => ({
    name,
    description: name,
    inputSchema: { type: "object" },
  }));
  writeFileSync(
    serverPath,
    `const tools = ${JSON.stringify(tools)};
const plan = ${JSON.stringify(plan)};
const decoder = new TextDecoder();
let buffer = "";
const reply = (id, result) => console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk);
  let newline;
  while ((newline = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    if (request.method === "initialize") reply(request.id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "fixture", version: "1" } });
    else if (request.method === "tools/list") reply(request.id, { tools });
    else if (request.params?.name === "kb_plan_bootstrap") reply(request.id, { content: [], structuredContent: { status: "success", data: { plan } } });
    else reply(request.id, { content: [{ type: "text", text: "applied:" + request.params?.name }] });
  }
}
`,
  );
  const input = new PassThrough();
  const output = new PassThrough();
  const stderr = new PassThrough();
  const responses = new Map<number, Record<string, unknown>>();
  let pendingText = "";
  output.on("data", (chunk) => {
    pendingText += String(chunk);
    let newline = pendingText.indexOf("\n");
    while (newline >= 0) {
      const line = pendingText.slice(0, newline);
      pendingText = pendingText.slice(newline + 1);
      if (line) {
        const message = JSON.parse(line) as Record<string, unknown>;
        if (typeof message.id === "number") responses.set(message.id, message);
      }
      newline = pendingText.indexOf("\n");
    }
  });
  const broker = runMcpBroker(
    {
      downstream: { command: BUN, args: [serverPath], cwd: root },
      tracePath,
      scriptedUserPath: profilePath,
      startupTimeoutMs: 10_000,
      toolTimeoutMs: 10_000,
      killGraceMs: 50,
    },
    { input, output, error: stderr },
  );
  let nextId = 0;
  const call = async (
    method: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    nextId += 1;
    const id = nextId;
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) })}\n`,
    );
    for (let waited = 0; waited < 10_000; waited += 10) {
      const response = responses.get(id);
      if (response !== undefined) return response;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert(false, `no broker response to ${method} ${JSON.stringify(params)}`);
    return {};
  };
  const tool = (name: string, args: Record<string, unknown>) =>
    call("tools/call", { name, arguments: args });
  const structured = (response: Record<string, unknown>) =>
    (response.result as { structuredContent?: Record<string, unknown> })
      ?.structuredContent ?? {};

  await call("initialize", {});
  const listed = await call("tools/list");
  const names = (
    (listed.result as { tools: { name: string }[] }).tools ?? []
  ).map((entry) => entry.name);
  assert(
    names.includes(SCRIPTED_USER_TOOL.name) &&
      names.includes("kb_plan_bootstrap"),
    `broker must advertise the Kibi tools plus the scripted user: ${names}`,
  );

  const early = await tool(SCRIPTED_USER_TOOL.name, {
    topic: "approval",
    question: "May I apply?",
    planHash: plan.planHash,
  });
  assert(
    structured(early).status === "declined",
    "approval before any planner preview must be declined",
  );
  const context = await tool(SCRIPTED_USER_TOOL.name, {
    topic: "context",
    question: "What does the project require?",
  });
  assert(
    structured(context).answer === "Archive invoices.",
    "context questions get the fixture operator's answer",
  );
  const unapplied = await tool("kb_apply_plan", {
    plan,
    approvedPlanHash: plan.planHash,
  });
  assert(
    (unapplied.error as { data?: { skilloptViolation?: string } })?.data
      ?.skilloptViolation === "forbidden_write",
    "kb_apply_plan before approval must be refused as a forbidden write",
  );
  await tool("kb_plan_bootstrap", { bootstrapContext });
  const approved = await tool(SCRIPTED_USER_TOOL.name, {
    topic: "approval",
    question: "Apply this plan?",
    planHash: plan.planHash,
  });
  assert(
    structured(approved).status === "approved" &&
      structured(approved).approvedPlanHash === plan.planHash,
    `the scripted user approves only the exact preview hash: ${JSON.stringify(approved)}`,
  );
  const applied = await tool("kb_apply_plan", {
    plan,
    approvedPlanHash: plan.planHash,
  });
  assert(applied.error === undefined, "the approved plan is forwarded once");
  const replay = await tool("kb_apply_plan", {
    plan,
    approvedPlanHash: plan.planHash,
  });
  assert(
    replay.error !== undefined,
    "one approval authorizes one apply attempt",
  );
  const deletion = await tool("kb_delete", { ids: ["REQ-x"] });
  assert(deletion.error !== undefined, "kb_delete is never forwarded");
  const write = await tool("kb_upsert", { type: "req", id: "REQ-x" });
  assert(write.error !== undefined, "a non-dry-run kb_upsert is refused");
  const dryRun = await tool("kb_upsert", {
    type: "req",
    id: "REQ-x",
    dryRun: true,
  });
  assert(dryRun.error === undefined, "a dry-run kb_upsert is forwarded");
  const unknown = await tool("shell_exec", { command: "rm -rf /" });
  assert(
    (unknown.error as { message?: string })?.message ===
      "Tool not exposed by evaluator broker",
    "tools outside the Kibi surface are refused",
  );
  input.end();
  await broker;
  const trace = readFileSync(tracePath, "utf8");
  for (const name of [
    "kb_plan_bootstrap",
    "kb_apply_plan",
    SCRIPTED_USER_TOOL.name,
    "shell_exec",
  ]) {
    assert(
      trace.includes(`"toolName":"${name}"`),
      `broker trace records ${name}`,
    );
  }
  console.log(
    "PASS: cell harness gates writes on the scripted user's exact approval",
  );
}

// ---------------------------------------------------------- 2-3. contracts
function contracts(): void {
  const lockText = readFileSync(RUN_LOCK_FIXTURE, "utf8");
  const lock = parseRunLockText(lockText);
  const dirtyPath = join(root, "dirty-run-lock.json");
  writeFileSync(
    dirtyPath,
    JSON.stringify(
      RunLockSchema.parse({
        ...JSON.parse(lockText),
        dirtyState: { isDirty: true, diffHash: "c".repeat(64) },
      }),
    ),
  );
  const accepted = spawnSync(
    BUN,
    [
      "scripts/skillopt-eval/contracts/cli.ts",
      "validate-run-lock",
      RUN_LOCK_FIXTURE,
      "--expected",
      RUN_LOCK_FIXTURE,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  assert(
    accepted.status === 0,
    `contracts CLI accepts the run lock: ${accepted.stderr}`,
  );
  const verdict = JSON.parse(accepted.stdout) as { runLockHash: string };
  const refused = spawnSync(
    BUN,
    [
      "scripts/skillopt-eval/contracts/cli.ts",
      "validate-run-lock",
      dirtyPath,
      "--expected",
      RUN_LOCK_FIXTURE,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  assert(
    refused.status === 1 && refused.stderr.includes("contract rejected"),
    "contracts CLI refuses a dirty run lock",
  );

  const hash = "a".repeat(64);
  const estimate = {
    currency: "USD",
    amount: 0,
    pricingHash: hash,
    kind: "price-equivalent-estimate-not-invoice",
  };
  const usage = { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 };
  const proposal = ProposalSchema.parse({
    schemaVersion: "1.1.0",
    artifactType: "proposal",
    proposalId: PROPOSAL_ID,
    runId: RUN_ID,
    runLockHash: verdict.runLockHash,
    skill: "kibi-usage",
    candidateBodyHash: "b".repeat(64),
    baselineFrontmatterHash: hash,
    candidateFrontmatterHash: hash,
    baselineResourcesHash: hash,
    candidateResourcesHash: hash,
    reportHash: hash,
    createdAt: TIMESTAMP,
    status: "eligible",
  });
  const proposalHash = contractHash(JsonValueSchema.parse(proposal));
  const approval = ApprovalSchema.parse({
    schemaVersion: "1.1.0",
    artifactType: "approval",
    approvalId: APPROVAL_ID,
    proposalId: PROPOSAL_ID,
    proposalHash,
    runId: RUN_ID,
    runLockHash: verdict.runLockHash,
    reportHash: hash,
    candidateBodyHash: proposal.candidateBodyHash,
    reviewer: "reviewer@example.test",
    decision: "approved",
    decidedAt: TIMESTAMP,
  });
  const result = python("contracts", {
    runLockPath: RUN_LOCK_FIXTURE,
    tamperedRunLockPath: dirtyPath,
    proposal,
    approval,
    staleApproval: { ...approval, candidateBodyHash: "c".repeat(64) },
    changedFrontmatterProposal: {
      ...proposal,
      candidateFrontmatterHash: "d".repeat(64),
    },
    report: ReportV1Schema.parse({
      schemaVersion: "1.1.0",
      artifactType: "report",
      runId: RUN_ID,
      runLockHash: verdict.runLockHash,
      skill: "kibi-usage",
      variants: ["baseline", "one-shot", "skillopt"],
      cells: [hash],
      priceEquivalentEstimate: estimate,
      verdict: "pass",
      generatedAt: TIMESTAMP,
      gateResults: {
        aggregate: true,
        bootstrap: true,
        family: true,
        security: true,
      },
    }),
    ledger: LedgerEntrySchema.parse({
      schemaVersion: "1.1.0",
      artifactType: "ledger-entry",
      runId: RUN_ID,
      sequence: 0,
      previousEntryHash: null,
      entryHash: hash,
      occurredAt: TIMESTAMP,
      category: "preflight",
      model: "none",
      usage,
      priceEquivalentEstimate: estimate,
    }),
    state: RunStateSchema.parse({
      schemaVersion: "1.1.0",
      artifactType: "run-state",
      runId: RUN_ID,
      runLockHash: verdict.runLockHash,
      phase: "review",
      completedEpisodeIds: [EPISODE_ID],
      ledgerHeadHash: hash,
      updatedAt: TIMESTAMP,
      interrupted: false,
    }),
    episodeRequest: EpisodeRequestSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "episode-request",
      episodeId: EPISODE_ID,
      runId: RUN_ID,
      runLockHash: verdict.runLockHash,
      variant: "skillopt",
      skill: "kibi-usage",
      taskId: "task-1",
      attempt: 1,
      prompt: "Use the public MCP workflow.",
      workspaceFixtureHash: hash,
    }),
    episodeResult: EpisodeResultSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "episode-result",
      episodeId: EPISODE_ID,
      runId: RUN_ID,
      runLockHash: verdict.runLockHash,
      status: "completed",
      startedAt: TIMESTAMP,
      finishedAt: TIMESTAMP,
      exitCode: 0,
      score: 90,
      hardPass: true,
      criticalFailures: [],
      evidenceIndexHash: hash,
      reconciliation: {
        brokerTrace: true,
        diagnosticReceipt: true,
        finalStateQuery: true,
      },
      usage,
      priceEquivalentEstimate: estimate,
    }),
    evidence: EvidenceIndexSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "evidence-index",
      runId: RUN_ID,
      episodeId: EPISODE_ID,
      runLockHash: verdict.runLockHash,
      events: [
        {
          sequence: 0,
          receivedAt: TIMESTAMP,
          event: { type: "item.completed" },
        },
      ],
      brokerTraceHash: hash,
      diagnosticReceiptHash: hash,
      finalStateHash: hash,
      truncated: false,
    }),
  });
  assert(
    result.runLockHash === verdict.runLockHash &&
      verdict.runLockHash === runLockHash(lock),
    `run-lock hash differs across languages: ${result.runLockHash} vs ${verdict.runLockHash}`,
  );
  assert(
    typeof result.dirtyLockError === "string",
    "Python refuses a dirty run lock",
  );
  assert(
    result.sourceLockCommit === lock.skillopt.commit,
    "the Python source lock pins the run lock's SkillOpt commit",
  );
  assert(
    result.proposalHash === proposalHash,
    "proposal hash differs across languages",
  );
  assert(
    result.staleApprovalError === "approval does not match proposal",
    `an approval of another candidate body is refused: ${result.staleApprovalError}`,
  );
  assert(
    String(result.changedFrontmatterError).includes("frontmatter hash changed"),
    "a proposal that changes frontmatter is refused",
  );
  console.log(
    "PASS: run-lock and review contracts agree across TypeScript and Python",
  );
}

// ---------------------------------------------------------- 4-5. optimizer
function optimizer(): void {
  const claim = (taskId: string) => ({
    taskId,
    text: "Preserve the structured public claim.",
    publicManifestHash: "a".repeat(64),
    workspaceHash: "a".repeat(64),
  });
  const request = BridgeRequestSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "skillopt-bridge-request",
    runId: "00000000-0000-4000-8000-000000000091",
    batchId: "toolchain-1",
    skill: "kibi-usage",
    phase: "train",
    candidateBody: "Use Kibi through MCP.\n",
    taskIds: ["predicate-train-1"],
    sourceLockHash: "a".repeat(64),
    publicClaim: claim("predicate-train-1"),
  });
  const requestPath = join(root, "bridge-request.json");
  writeFileSync(requestPath, JSON.stringify(request));
  const validated = spawnSync(
    "uv",
    [
      "run",
      "--project",
      "tools/skillopt",
      "python",
      "-m",
      "tools.skillopt.kibi_skillopt",
      "validate-request",
      requestPath,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  assert(
    validated.status === 0,
    `Python CLI accepts the bridge request: ${validated.stderr}`,
  );
  assert(
    contractHash(JsonValueSchema.parse(JSON.parse(validated.stdout))) ===
      contractHash(JsonValueSchema.parse(request)),
    "the Python CLI re-emits the bridge request unchanged",
  );
  const heldOutPath = join(root, "held-out-request.json");
  writeFileSync(
    heldOutPath,
    JSON.stringify({
      ...request,
      taskIds: ["held-out-1"],
      publicClaim: claim("held-out-1"),
    }),
  );
  const heldOut = spawnSync(
    "uv",
    [
      "run",
      "--project",
      "tools/skillopt",
      "python",
      "-m",
      "tools.skillopt.kibi_skillopt",
      "validate-request",
      heldOutPath,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  assert(heldOut.status !== 0, "the Python CLI refuses held-out task ids");

  const bridge = python("bridge", { request });
  assert(
    String(bridge.unstagedError).includes("missing_real_execution_options"),
    `cells never start without staged runtime paths: ${bridge.unstagedError}`,
  );
  assert(
    bridge.partialRootsError === "incomplete_bridge_execution_roots",
    "a partial set of runtime paths is refused before the bridge starts",
  );
  assert(
    bridge.requestHash === bridge.pythonRequestHash &&
      bridge.requestHash === contractHash(JsonValueSchema.parse(request)),
    "the bridge result is bound to the same request hash in both languages",
  );

  const hash = "a".repeat(64);
  const corpusRoots = Object.fromEntries(
    [
      "corpus",
      "evaluator",
      "querySet",
      "baseline",
      "catalog",
      "verifier",
      "publicRoot",
      "privateRoot",
      "artifactSchema",
    ].map((key, index) => [key, String(index + 1).repeat(64)]),
  );
  const outRoot = join(root, "training");
  const trainRequestPath = join(root, "train-request.json");
  writeFileSync(
    trainRequestPath,
    JSON.stringify({
      runId: "00000000-0000-4000-8000-000000000090",
      skill: "kibi-usage",
      runRoot: join(root, "run"),
      outRoot,
      maxSteps: 1,
      sourceLockHash: hash,
      corpusRoots,
      trainDescriptors: [
        {
          id: "predicate-train-1",
          family: "predicate",
          split: "train",
          publicClaim: claim("predicate-train-1"),
        },
      ],
      developmentDescriptors: [
        {
          id: "predicate-development-1",
          family: "predicate",
          split: "development",
          publicClaim: claim("predicate-development-1"),
        },
      ],
    }),
  );
  const trained = python("train", {
    requestPath: trainRequestPath,
    resultPath: join(root, "train-result.json"),
    outRoot,
  });
  assert(
    trained.candidateBodyHash === trained.frozenBodyHash &&
      trained.candidateBodyHash ===
        contractHash(
          JsonValueSchema.parse("Use Kibi through MCP before editing.\n"),
        ),
    "training freezes the candidate under its body hash",
  );
  assert(
    trained.trainRows === 1 &&
      trained.summaryAttempts === 1 &&
      trained.trajectoryCount === 1,
    `training rolls out public tasks through the bridge: ${JSON.stringify(trained)}`,
  );
  assert(
    (trained.development as { hardPasses?: number }).hardPasses === 1,
    "the development gate is scored from bridge rows",
  );
  assert(
    String(trained.boundError).includes("between 1 and 4"),
    "a training budget above four steps is refused",
  );
  assert(
    trained.configCommit ===
      parseRunLockText(readFileSync(RUN_LOCK_FIXTURE, "utf8")).skillopt.commit,
    "training is configured with the pinned SkillOpt commit",
  );
  console.log(
    "PASS: the Python optimizer drives the TypeScript bridge under shared contracts",
  );
}

try {
  await harness();
  contracts();
  optimizer();
  console.log("PASS: SkillOpt optimizer toolchain");
} finally {
  rmSync(root, { recursive: true, force: true });
}
