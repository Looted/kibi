import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as runtimeModule from "kibi-runtime";
import { getSpec, statusSpec } from "kibi-runtime";

import { getJob, resetJobsForTests } from "../../src/server/jobs.js";
import { registerConfiguredTools } from "../../src/server/tool-registration.js";
import { TOOLS, buildBaseTools } from "../../src/tools-config.js";

const SESSION = { session: "prolog" };
const restores: Array<() => void> = [];
const previousOptional = process.env.KIBI_MCP_OPTIONAL_TOOLS;

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (previousOptional === undefined)
    Reflect.deleteProperty(process.env, "KIBI_MCP_OPTIONAL_TOOLS");
  else process.env.KIBI_MCP_OPTIONAL_TOOLS = previousOptional;
  resetJobsForTests();
});

function stub<T extends object>(owner: T, key: keyof T) {
  const calls: unknown[][] = [];
  const spy = spyOn(owner, key as never).mockImplementation((async (
    ...args: unknown[]
  ) => {
    calls.push(args);
    return { from: String(key) };
  }) as never);
  restores.push(() => spy.mockRestore());
  return calls;
}

type Registered = {
  name: string;
  description: string;
  inputSchema: object;
  handler: () => Promise<unknown>;
  runtime: unknown;
  spec: {
    name: string;
    effects: unknown;
    requiresProlog: boolean;
    agentVisibleStructuredData?: boolean;
    execute: (
      args: Record<string, unknown>,
      context: unknown,
    ) => Promise<unknown>;
  };
  annotations: unknown;
  outputSchema: unknown;
};

function setup(
  options: { tools?: unknown[]; hooks?: boolean; optional?: string } = {},
) {
  if (options.optional === undefined)
    Reflect.deleteProperty(process.env, "KIBI_MCP_OPTIONAL_TOOLS");
  else process.env.KIBI_MCP_OPTIONAL_TOOLS = options.optional;
  const calls: Record<string, unknown[][]> = {};
  const afterSuccess: unknown[][] = [];
  const handler =
    (name: string) =>
    async (...args: unknown[]) => {
      calls[name] ??= [];
      calls[name].push(args);
      return { from: name };
    };
  const names = [
    "handleKbQuery",
    "handleKbSearch",
    "handleKbSkillsList",
    "handleKbSkillsLoad",
    "handleKbSkillsRead",
    "handleKbFindGaps",
    "handleKbCoverage",
    "handleKbGraph",
    "handleSparql",
    "handleKbSemanticAdvisor",
    "handleKbCheck",
    "handleKbModelRequirement",
    "handleKbSuggestPredicates",
    "handleKbPlanBootstrap",
  ];
  const hookNames = [
    "handleKbCompileIntent",
    "handleKbApplyPlan",
    "handleKbIngestProof",
    "preflightApplyPlan",
  ];
  const runtime: Record<string, unknown> = {
    tools: options.tools ?? TOOLS,
    operationRuntime: {
      sessionProlog: () => SESSION,
      afterSuccess: async (...args: unknown[]) => {
        afterSuccess.push(args);
      },
    },
  };
  for (const name of [...names, ...(options.hooks === false ? [] : hookNames)])
    runtime[name] = handler(name);
  const registered = new Map<string, Registered>();
  registerConfiguredTools(
    { server: true } as never,
    runtime as never,
    ((
      _server: unknown,
      name: string,
      description: string,
      inputSchema: object,
      toolHandler: () => Promise<unknown>,
      toolRuntime: unknown,
      spec: Registered["spec"],
      annotations: unknown,
      outputSchema: unknown,
    ) => {
      registered.set(name, {
        name,
        description,
        inputSchema,
        handler: toolHandler,
        runtime: toolRuntime,
        spec,
        annotations,
        outputSchema,
      });
    }) as never,
  );
  return { runtime, registered, calls, afterSuccess };
}

const context = {
  workspaceRoot: "/ws",
  signal: new AbortController().signal,
  clock: () => new Date(0),
};
const withProlog = { ...context, prolog: SESSION };

function run(
  registered: Map<string, Registered>,
  name: string,
  args: Record<string, unknown>,
  ctx: unknown = context,
) {
  const entry = registered.get(name);
  if (!entry) throw new Error(`not registered: ${name}`);
  return entry.spec.execute(args, ctx);
}

describe("registerConfiguredTools, exact", () => {
  test("each tool is registered with its definition and catalog spec", async () => {
    const { registered, runtime } = setup();
    expect([...registered.keys()]).toStrictEqual(
      TOOLS.map((tool) => tool.name),
    );
    for (const tool of TOOLS) {
      const entry = registered.get(tool.name) as Registered;
      const spec = getSpec(tool.name as never);
      const definition = tool as typeof tool & {
        annotations?: unknown;
        outputSchema?: unknown;
      };
      expect(entry.description).toBe(tool.description);
      expect(entry.inputSchema).toBe(tool.inputSchema);
      expect(entry.annotations).toBe(definition.annotations);
      expect(entry.outputSchema).toBe(definition.outputSchema);
      expect(entry.runtime).toBe(runtime);
      expect(await entry.handler()).toBeUndefined();
      expect(entry.spec.name).toBe(tool.name);
      expect(entry.spec.effects).toBe(spec.effects);
      expect(entry.spec.requiresProlog).toBe(spec.requiresProlog);
      expect(Object.keys(entry.spec).sort()).toStrictEqual(
        [
          "effects",
          "execute",
          "name",
          "requiresProlog",
          ...(spec.agentVisibleStructuredData === true
            ? ["agentVisibleStructuredData"]
            : []),
        ].sort(),
      );
      if (spec.agentVisibleStructuredData === true)
        expect(entry.spec.agentVisibleStructuredData).toBe(true);
    }
  });

  test("optional tools are registered only when configured", () => {
    expect(setup().registered.has("kb_sparql_remote")).toBe(false);
    const withSparql = setup({
      tools: buildBaseTools(new Set(["kb_sparql_remote"])),
    });
    expect(withSparql.registered.has("kb_sparql_remote")).toBe(true);
    expect(() =>
      setup({ tools: TOOLS.filter((tool) => tool.name !== "kb_query") }),
    ).toThrow(new Error("Unknown tool: kb_query"));
  });

  test("engine-backed tools get the session engine", async () => {
    const { registered, calls } = setup({
      tools: buildBaseTools(new Set(["kb_sparql_remote"])),
    });
    const args = { a: 1 };
    expect(await run(registered, "kb_query", args)).toStrictEqual({
      from: "handleKbQuery",
    });
    await run(registered, "kb_search", args);
    await run(registered, "kb_find_gaps", args);
    await run(registered, "kb_coverage", args);
    await run(registered, "kb_graph", args);
    await run(registered, "kb_sparql_remote", args);
    await run(registered, "kb_plan_bootstrap", args);
    expect(calls).toStrictEqual({
      handleKbQuery: [[SESSION, args, context]],
      handleKbSearch: [[SESSION, args, context]],
      handleKbFindGaps: [[SESSION, args]],
      handleKbCoverage: [[SESSION, args, context]],
      handleKbGraph: [[SESSION, args]],
      handleSparql: [[args, context]],
      handleKbPlanBootstrap: [[args, context]],
    });
  });

  test("a tool that needs the session engine fails without one", async () => {
    const { registered, runtime } = setup();
    (
      runtime.operationRuntime as { sessionProlog: () => unknown }
    ).sessionProlog = () => undefined;
    await expect(run(registered, "kb_query", {})).rejects.toThrow(
      new Error("Operation requires a session Prolog process"),
    );
    await expect(run(registered, "kb_upsert", {})).rejects.toThrow(
      new Error("Operation requires a session Prolog process"),
    );
  });

  test("status runs its own spec without the session engine", async () => {
    const status = stub(statusSpec, "execute");
    const { registered } = setup();
    const args = { s: 1 };
    expect(await run(registered, "kb_status", args)).toStrictEqual({
      from: "execute",
    });
    expect(status).toStrictEqual([[args, context]]);
  });

  test("kb_skills routes on action and keeps each route's required fields", async () => {
    const { registered, calls } = setup();
    await run(registered, "kb_skills", { action: "list" });
    await run(registered, "kb_skills", { action: "load", id: "kibi-usage" });
    await run(registered, "kb_skills", {
      action: "read",
      id: "kibi-usage",
      resource: "r.md",
    });
    expect(calls).toStrictEqual({
      handleKbSkillsList: [[{}]],
      handleKbSkillsLoad: [[{ id: "kibi-usage" }]],
      handleKbSkillsRead: [[{ id: "kibi-usage", resource: "r.md" }]],
    });
    await expect(
      run(registered, "kb_skills", { action: "load" }),
    ).rejects.toThrow("id is required when action is load");
    await expect(
      run(registered, "kb_skills", { action: "read", id: "x" }),
    ).rejects.toThrow("resource is required when action is read");
    await expect(
      run(registered, "kb_skills", { action: "nope" }),
    ).rejects.toThrow("action must be one of: list, load, read");
  });

  test("kb_model routes on mode with the right context per route", async () => {
    const { registered, calls } = setup();
    const required = (route: keyof typeof runtimeModule.MODEL_ROUTES) => {
      const schema = runtimeModule.MODEL_ROUTES[route].businessInputSchema as {
        required?: string[];
      };
      return Object.fromEntries(
        (schema.required ?? []).map((field) => [field, `v-${field}`]),
      );
    };
    const analyze = required("analyze");
    const requirement = required("requirement");
    const predicates = required("predicates");
    await run(registered, "kb_model", { mode: "analyze", ...analyze });
    await run(registered, "kb_model", { mode: "requirement", ...requirement });
    await run(registered, "kb_model", { mode: "predicates", ...predicates });
    expect(calls).toStrictEqual({
      handleKbSemanticAdvisor: [[analyze, context]],
      handleKbModelRequirement: [[SESSION, requirement, withProlog]],
      handleKbSuggestPredicates: [[SESSION, predicates, withProlog]],
    });
    for (const route of ["analyze", "requirement", "predicates"] as const) {
      const fields = Object.keys(required(route));
      if (fields.length === 0) continue;
      await expect(
        run(registered, "kb_model", { mode: route }),
      ).rejects.toThrow(`${fields[0]} is required when mode is ${route}`);
    }
  });

  test("upsert and delete run the shared executors with the session engine", async () => {
    const upsert = stub(runtimeModule, "executeUpsert");
    const del = stub(runtimeModule, "executeDelete");
    const { registered } = setup();
    const args = { id: "X" };
    await run(registered, "kb_upsert", args);
    await run(registered, "kb_delete", args);
    expect(upsert).toStrictEqual([[args, withProlog]]);
    expect(del).toStrictEqual([[args, withProlog]]);
  });

  test("impact review runs its catalog spec", async () => {
    const review = stub(getSpec("kb_prepare_impact_review"), "execute");
    const { registered } = setup();
    await run(registered, "kb_prepare_impact_review", { r: 1 });
    expect(review).toStrictEqual([[{ r: 1 }, context]]);
  });

  test("compile, apply and ingest prefer runtime hooks, else the shared executors", async () => {
    const hooked = setup();
    await run(hooked.registered, "kb_compile_intent", { c: 1 });
    await run(hooked.registered, "kb_apply_plan", { p: 1, async: false });
    await run(hooked.registered, "kb_ingest_proof", { i: 1 });
    expect(hooked.calls).toStrictEqual({
      handleKbCompileIntent: [[{ c: 1 }, context]],
      handleKbApplyPlan: [[{ p: 1 }, context]],
      handleKbIngestProof: [[{ i: 1 }, context]],
    });
    const compile = stub(runtimeModule, "executeCompileIntent");
    const apply = stub(runtimeModule, "executeApplyPlan");
    const ingest = stub(runtimeModule, "executeIngestProof");
    const bare = setup({ hooks: false });
    expect(
      await run(bare.registered, "kb_compile_intent", { c: 2 }),
    ).toStrictEqual({ from: "executeCompileIntent" });
    await run(bare.registered, "kb_apply_plan", { p: 2 });
    await run(bare.registered, "kb_ingest_proof", { i: 2 });
    expect(compile).toStrictEqual([[{ c: 2 }, context]]);
    expect(apply).toStrictEqual([[{ p: 2 }, context]]);
    expect(ingest).toStrictEqual([[{ i: 2 }, context]]);
  });

  test("kb_check stays synchronous unless async and kb_job_status are both on", async () => {
    for (const [optional, args] of [
      [undefined, { async: true, rules: ["r"] }],
      ["kb_job_status", { async: false, rules: ["r"] }],
      ["kb_job_status", { rules: ["r"] }],
      ["kb_job_status", { async: "true", rules: ["r"] }],
    ] as const) {
      const { registered, calls } = setup({ optional });
      expect(await run(registered, "kb_check", args)).toStrictEqual({
        from: "handleKbCheck",
      });
      expect(calls.handleKbCheck).toStrictEqual([[SESSION, args, context]]);
    }
  });

  test("async kb_check starts a job with its own signal", async () => {
    const { registered, calls } = setup({ optional: "kb_job_status" });
    const receipt = (await run(registered, "kb_check", {
      async: true,
      rules: ["r"],
    })) as { jobId: string; tool: string };
    expect(receipt.tool).toBe("kb_check");
    await Bun.sleep(5);
    expect(getJob(receipt.jobId)?.result).toStrictEqual({
      from: "handleKbCheck",
    });
    const [prolog, args, jobContext] = calls.handleKbCheck?.[0] as [
      unknown,
      unknown,
      typeof context,
    ];
    expect(prolog).toBe(SESSION);
    expect(args).toStrictEqual({ rules: ["r"] });
    expect(jobContext.workspaceRoot).toBe("/ws");
    expect(jobContext.signal).not.toBe(context.signal);
    expect(jobContext.signal.aborted).toBe(false);
  });

  test("kb_apply_plan stays synchronous unless async and kb_job_status are both on", async () => {
    for (const [optional, args] of [
      [undefined, { async: true, plan: 1 }],
      ["kb_job_status", { async: false, plan: 1 }],
      ["kb_job_status", { async: 1, plan: 1 }],
    ] as const) {
      const { registered, calls } = setup({ optional });
      await run(registered, "kb_apply_plan", args);
      expect(calls.handleKbApplyPlan).toStrictEqual([[{ plan: 1 }, context]]);
      expect(calls.preflightApplyPlan).toBeUndefined();
    }
  });

  test("async kb_apply_plan preflights, then applies in a job without progress", async () => {
    const { registered, calls, afterSuccess } = setup({
      optional: "all",
    });
    const onProgress = () => undefined;
    const ctx = { ...context, onProgress };
    const receipt = (await run(
      registered,
      "kb_apply_plan",
      { async: true, plan: 1 },
      ctx,
    )) as { jobId: string; tool: string };
    expect(receipt.tool).toBe("kb_apply_plan");
    expect(calls.preflightApplyPlan).toStrictEqual([[{ plan: 1 }, ctx]]);
    await Bun.sleep(5);
    expect(getJob(receipt.jobId)?.result).toStrictEqual({
      from: "handleKbApplyPlan",
    });
    expect(calls.handleKbApplyPlan).toStrictEqual([[{ plan: 1 }, context]]);
    expect(afterSuccess).toHaveLength(1);
    const [spec, jobContext] = afterSuccess[0] as [
      {
        name: string;
        effects: unknown;
        requiresProlog: boolean;
        execute: () => Promise<unknown>;
      },
      unknown,
    ];
    expect(spec.name).toBe("kb_apply_plan");
    expect(spec.effects).toBe(getSpec("kb_apply_plan").effects);
    expect(spec.requiresProlog).toBe(true);
    expect(await spec.execute()).toBeUndefined();
    expect(jobContext).toStrictEqual(context);
  });

  test("async kb_apply_plan uses the shared preflight without a runtime hook", async () => {
    const preflight = stub(runtimeModule, "preflightApplyPlan");
    const apply = stub(runtimeModule, "executeApplyPlan");
    const { registered } = setup({ optional: "kb_job_status", hooks: false });
    const receipt = (await run(registered, "kb_apply_plan", {
      async: true,
      plan: 2,
    })) as { jobId: string };
    expect(preflight).toStrictEqual([[{ plan: 2 }, context]]);
    await Bun.sleep(5);
    expect(apply).toStrictEqual([[{ plan: 2 }, context]]);
    expect(getJob(receipt.jobId)?.status).toBe("succeeded");
  });

  test("a failed preflight fails the call and starts no job", async () => {
    const { registered, runtime, calls } = setup({ optional: "kb_job_status" });
    runtime.preflightApplyPlan = async () => {
      throw new Error("stale plan");
    };
    await expect(
      run(registered, "kb_apply_plan", { async: true, plan: 1 }),
    ).rejects.toThrow("stale plan");
    expect(calls.handleKbApplyPlan).toBeUndefined();
  });
});
