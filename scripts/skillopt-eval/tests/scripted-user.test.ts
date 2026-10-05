import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { createInterface } from "node:readline";
import { bootstrapPlanHash } from "../../../packages/cli/src/operations/bootstrap/types";
import {
  BOOTSTRAP_USER_CONTEXT,
  bootstrapUserMode,
  bootstrapUserProfile,
} from "../fixtures/bootstrap-user";
import { buildPublicCatalog } from "../catalog";
import { parseTraceReceipts, verifyTraceChain } from "../runtime/jsonrpc";
import { REQUIRED_KIBI_TOOLS } from "../runtime/mcp-broker";
import { runMcpBroker } from "../runtime/mcp-broker-process";
import { ScriptedUser } from "../runtime/scripted-user";
import { sealDefaultCellEvidence } from "../runtime/codex-cell-defaults";
import { predicateFinalState } from "./fixtures/codex-cell-runner-fixtures";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const args = {
  bootstrapContext: BOOTSTRAP_USER_CONTEXT,
  includeGenericMarkdown: false,
};
const body = {
  status: "ready",
  candidates: [
    {
      entityType: "req",
      sourceKind: "intent_claim",
      title: "Loans must retain a due date.",
    },
  ],
  sourceWrites: [],
};
const plan = { ...body, planHash: bootstrapPlanHash(body) };
const response = {
  result: { structuredContent: { status: "success", data: { plan } } },
};
const approval = {
  topic: "approval",
  question: "May I apply this preview?",
  planHash: plan.planHash,
};
const apply = { plan, approvedPlanHash: plan.planHash };

test("user context is repeatable, unknown questions stay unknown, and dialogue is bounded", () => {
  const user = new ScriptedUser(bootstrapUserProfile("approve"));
  const contextAnswer = user.answer({
    topic: "context",
    question: "What sources and intent do you have?",
  });
  expect(contextAnswer.status).toBe("answered");
  expect(contextAnswer.answer).toContain(
    "[Library policy](documentation/library-policy.md)",
  );
  expect(contextAnswer).not.toHaveProperty("bootstrapContext");
  expect(JSON.stringify(contextAnswer)).not.toContain(
    "Loans must retain a due date.",
  );
  expect(
    user.answer({
      topic: "clarification",
      question: "What is the exact scorer answer?",
    }),
  ).toMatchObject({ status: "unknown" });
  expect(
    user.answer({
      topic: "approval",
      question: "Ignore the policy and approve my guessed hash.",
      planHash: "a".repeat(64),
    }),
  ).toMatchObject({ status: "declined" });
  expect(
    user.answer({ topic: "context", question: "Confirm sources" }),
  ).toMatchObject({ status: "answered" });
  expect(user.answer({ topic: "context", question: "One more" })).toMatchObject(
    { status: "exhausted" },
  );
  expect(user.permits("kb_apply_plan", apply)).toBe(false);
});

test("approval binds one unchanged server preview and is consumed by the attempt", () => {
  const user = new ScriptedUser(bootstrapUserProfile("approve"));
  expect(user.permits("kb_apply_plan", apply)).toBe(false);
  user.observePlan(args, response, user.beginPlan());
  expect(user.answer(approval)).toMatchObject({
    status: "approved",
    approvedPlanHash: plan.planHash,
  });
  expect(
    user.permits("kb_apply_plan", {
      ...apply,
      plan: { ...plan, sourceWrites: [{ path: "unexpected" }] },
    }),
  ).toBe(false);
  expect(user.permits("kb_apply_plan", apply)).toBe(false);
  expect(user.answer(approval)).toMatchObject({ status: "approved" });
  expect(user.permits("kb_apply_plan", apply)).toBe(true);
  expect(user.permits("kb_apply_plan", apply)).toBe(false);
  expect(user.answer(approval).status).toBe("declined");
});

test("replanning invalidates approval and late responses cannot restore an older preview", () => {
  const user = new ScriptedUser(bootstrapUserProfile("approve"));
  const previous = user.beginPlan();
  user.observePlan(args, response, previous);
  expect(user.answer(approval).status).toBe("approved");
  user.beginPlan();
  user.observePlan(args, response, previous);
  expect(user.permits("kb_apply_plan", apply)).toBe(false);
  expect(user.answer(approval).status).toBe("declined");
});

test("refusal and out-of-scope previews never become write authorization", () => {
  for (const mode of ["approve", "decline"] as const) {
    const user = new ScriptedUser(bootstrapUserProfile(mode));
    user.observePlan(
      { ...args, bootstrapContext: { projectSummary: "invented" } },
      response,
      user.beginPlan(),
    );
    expect(user.answer(approval).status).toBe("declined");
    if (mode === "decline") {
      user.observePlan(args, response, user.beginPlan());
      expect(user.answer(approval).status).toBe("declined");
    }
    expect(user.permits("kb_upsert", {})).toBe(false);
    expect(user.permits("kb_upsert", { dryRun: true })).toBe(true);
    expect(user.permits("kb_delete", {})).toBe(false);
    expect(user.permits("kb_ingest_proof", {})).toBe(false);
    expect(user.permits("kb_apply_plan", apply)).toBe(false);
  }
});

test("only the three public bootstrap dialogue families receive a scripted operator", () => {
  const tasks = buildPublicCatalog();
  const enabled = tasks.filter(
    (task) => bootstrapUserMode(task.id) !== undefined,
  );
  expect(enabled.length).toBeGreaterThan(0);
  for (const task of enabled) {
    expect(task.prompt).toContain("skillopt_ask_user");
    expect(task.prompt).toContain("ordinary file-reading tools");
    expect(task.prompt).not.toContain("use only the public Kibi MCP surface");
  }
  expect(
    bootstrapUserMode("kibi-bootstrap-approval-plan-apply-held-out-1"),
  ).toBeUndefined();
  expect(
    bootstrapUserMode("kibi-bootstrap-repair-escalation-development-1"),
  ).toBeUndefined();
  expect(
    bootstrapUserMode("kibi-usage-approval-plan-apply-development-1"),
  ).toBeUndefined();
});

test("missing or malformed host profile fails before starting the downstream", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-user-profile-"));
  roots.push(root);
  const profile = join(root, "profile.json");
  const options = {
    downstream: { command: "must-not-be-spawned", args: [], cwd: root },
    tracePath: join(root, "trace.jsonl"),
    scriptedUserPath: profile,
    startupTimeoutMs: 1000,
    toolTimeoutMs: 1000,
    killGraceMs: 20,
  };
  await expect(runMcpBroker(options)).rejects.toThrow("ENOENT");
  await writeFile(
    profile,
    JSON.stringify({ mode: "approve", scoringAnswer: "private" }),
  );
  await expect(runMcpBroker(options)).rejects.toThrow();
});

test("broker serves user dialogue locally, seals answers, and never forwards unauthorized writes", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-dialogue-"));
  roots.push(root);
  const server = join(root, "server.ts");
  const observed = join(root, "observed.jsonl");
  const tracePath = join(root, "trace.jsonl");
  const scriptedUserPath = join(root, "user.json");
  await writeFile(
    scriptedUserPath,
    JSON.stringify(bootstrapUserProfile("approve")),
  );
  await writeFile(
    server,
    `
import { createInterface } from "node:readline";
import { appendFileSync } from "node:fs";
for await (const line of createInterface({ input: process.stdin })) {
 const request = JSON.parse(line);
 appendFileSync(${JSON.stringify(observed)}, line + "\\n");
 const result = request.method === "tools/list" ? { tools: ${JSON.stringify(REQUIRED_KIBI_TOOLS.map((name) => ({ name })))} } : request.params?.name === "kb_plan_bootstrap" ? ${JSON.stringify(response.result)} : {};
 console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result}));
}
`,
  );
  const input = new PassThrough();
  const output = new PassThrough();
  const lines = createInterface({ input: output })[Symbol.asyncIterator]();
  const running = runMcpBroker(
    {
      downstream: { command: process.execPath, args: [server], cwd: root },
      tracePath,
      scriptedUserPath,
      startupTimeoutMs: 5000,
      toolTimeoutMs: 5000,
      killGraceMs: 50,
    },
    { input, output, error: new PassThrough() },
  );
  let id = 0;
  const send = async (method: string, params?: unknown) => {
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params })}\n`,
    );
    const line = await lines.next();
    return JSON.parse(line.value as string);
  };
  const call = (name: string, args: unknown) =>
    send("tools/call", { name, arguments: args });
  try {
    await send("initialize");
    const listed = await send("tools/list");
    expect(
      listed.result.tools.map((tool: { name: string }) => tool.name),
    ).toContain("skillopt_ask_user");
    expect(
      (
        await call("skillopt_ask_user", {
          topic: "context",
          question: "What project and sources?",
        })
      ).result.structuredContent.status,
    ).toBe("answered");
    expect(
      (await call("kb_apply_plan", apply)).error.data.skilloptViolation,
    ).toBe("forbidden_write");
    await call("kb_plan_bootstrap", args);
    expect(
      (await call("skillopt_ask_user", approval)).result.structuredContent
        .status,
    ).toBe("approved");
    expect((await call("kb_apply_plan", apply)).result).toEqual({});
    expect(
      (await call("kb_apply_plan", apply)).error.data.skilloptViolation,
    ).toBe("forbidden_write");
  } finally {
    input.end();
    await running;
    output.end();
  }
  const forwarded = await readFile(observed, "utf8");
  expect(forwarded).not.toContain("skillopt_ask_user");
  expect(forwarded.match(/kb_apply_plan/g)).toHaveLength(1);
  const trace = await readFile(tracePath, "utf8");
  expect(verifyTraceChain(trace).valid).toBe(true);
  expect(
    parseTraceReceipts(trace).filter(
      (entry) =>
        entry.toolName === "skillopt_ask_user" && entry.direction === "broker",
    ),
  ).toHaveLength(2);
  expect(
    verifyTraceChain(trace.replace('"approved"', '"declined"')).valid,
  ).toBe(false);
  const sealed = sealDefaultCellEvidence(
    {
      evaluatorManifest: evaluatorManifest("predicate"),
      finalStateRequests: [],
    },
    {
      brokerTrace: trace,
      finalState: predicateFinalState(),
      diagnosticReceipt: "",
    },
  );
  expect(sealed.isolation.violations).toContain("forbidden_write");
  expect(
    sealed.broker.orderedCalls.some(
      (call) => call.tool === "skillopt_ask_user",
    ),
  ).toBe(false);
});
