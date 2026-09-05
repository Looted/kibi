import { describe, expect, test } from "bun:test";

import { registerConfiguredTools } from "../../src/server/tool-registration.js";
import { TOOLS } from "../../src/tools-config.js";

describe("registerConfiguredTools", () => {
  test("registers every configured tool and invokes each execute path", async () => {
    const registered: string[] = [];
    const executes: Array<(args: Record<string, unknown>) => Promise<unknown>> =
      [];
    const calls: string[] = [];
    const context = {
      workspaceRoot: "/tmp",
      signal: new AbortController().signal,
      clock: () => new Date(),
    };
    const prolog = { query: async () => ({ success: true, bindings: {} }) };
    const runtime = {
      tools: TOOLS,
      operationRuntime: {
        sessionProlog: (current: { prolog?: unknown }) =>
          current.prolog === undefined ? prolog : current.prolog,
      },
      handleKbQuery: async () => {
        calls.push("query");
        return { ok: true };
      },
      handleKbSearch: async () => {
        calls.push("search");
        return { ok: true };
      },
      handleKbSkillsList: async () => {
        calls.push("skills-list");
        return { ok: true };
      },
      handleKbSkillsLoad: async () => {
        calls.push("skills-load");
        return { ok: true };
      },
      handleKbSkillsRead: async () => {
        calls.push("skills-read");
        return { ok: true };
      },
      handleKbFindGaps: async () => {
        calls.push("find-gaps");
        return { ok: true };
      },
      handleKbCoverage: async () => {
        calls.push("coverage");
        return { ok: true };
      },
      handleKbGraph: async () => {
        calls.push("graph");
        return { ok: true };
      },
      handleSparql: async () => {
        calls.push("sparql");
        return { ok: true };
      },
      handleKbSemanticAdvisor: async () => {
        calls.push("advisor");
        return { ok: true };
      },
      handleKbCheck: async () => {
        calls.push("check");
        return { ok: true };
      },
      handleKbModelRequirement: async () => {
        calls.push("model");
        return { ok: true };
      },
      handleKbSuggestPredicates: async () => {
        calls.push("suggest");
        return { ok: true };
      },
      handleKbPlanBootstrap: async () => {
        calls.push("bootstrap");
        return { ok: true };
      },
      handleKbCompileIntent: async () => {
        calls.push("compile");
        return { ok: true };
      },
      handleKbApplyPlan: async () => {
        calls.push("apply");
        return { ok: true };
      },
      handleKbIngestProof: async () => {
        calls.push("ingest");
        return { ok: true };
      },
    };

    registerConfiguredTools(
      {} as never,
      runtime as never,
      (
        _server,
        name,
        _description,
        _schema,
        _handler,
        _runtime,
        spec,
      ) => {
        registered.push(name);
        if (spec) {
          executes.push((args) => spec.execute(args, context as never));
        }
      },
    );

    expect(registered).toEqual(TOOLS.map((tool) => tool.name));
    for (const execute of executes) {
      await execute({}).catch(() => undefined);
    }
    expect(calls.length).toBeGreaterThan(10);
  });

  test("rejects unknown tools and missing session Prolog", async () => {
    expect(() =>
      registerConfiguredTools(
        {} as never,
        {
          tools: [],
          operationRuntime: { sessionProlog: () => undefined },
        } as never,
        () => undefined,
      ),
    ).toThrow("Unknown tool");

    let captured:
      | ((args: Record<string, unknown>, context: unknown) => Promise<unknown>)
      | undefined;
    registerConfiguredTools(
      {} as never,
      {
        tools: TOOLS,
        operationRuntime: { sessionProlog: () => undefined },
        handleKbQuery: async () => ({ ok: true }),
      } as never,
      (_server, name, _description, _schema, _handler, _runtime, spec) => {
        if (name === "kb_query" && spec) captured = spec.execute;
      },
    );
    await expect(
      captured?.({}, {
        workspaceRoot: "/tmp",
        signal: new AbortController().signal,
        clock: () => new Date(),
      }),
    ).rejects.toThrow("session Prolog");
  });

  test("falls back to shared compile/apply/ingest executors when runtime hooks are absent", async () => {
    const executions: string[] = [];
    registerConfiguredTools(
      {} as never,
      {
        tools: TOOLS,
        operationRuntime: {
          sessionProlog: () => ({ query: async () => ({ success: true }) }),
        },
        handleKbQuery: async () => ({ ok: true }),
        handleKbSearch: async () => ({ ok: true }),
        handleKbSkillsList: async () => ({ ok: true }),
        handleKbSkillsLoad: async () => ({ ok: true }),
        handleKbSkillsRead: async () => ({ ok: true }),
        handleKbFindGaps: async () => ({ ok: true }),
        handleKbCoverage: async () => ({ ok: true }),
        handleKbGraph: async () => ({ ok: true }),
        handleSparql: async () => ({ ok: true }),
        handleKbSemanticAdvisor: async () => ({ ok: true }),
        handleKbCheck: async () => ({ ok: true }),
        handleKbModelRequirement: async () => ({ ok: true }),
        handleKbSuggestPredicates: async () => ({ ok: true }),
        handleKbPlanBootstrap: async () => ({ ok: true }),
      } as never,
      (_server, name, _description, _schema, _handler, _runtime, spec) => {
        if (
          spec &&
          (name === "kb_compile_intent" ||
            name === "kb_apply_plan" ||
            name === "kb_ingest_proof")
        ) {
          executions.push(name);
          void spec
            .execute({}, {
              workspaceRoot: "/tmp",
              signal: new AbortController().signal,
              clock: () => new Date(),
            } as never)
            .catch(() => undefined);
        }
      },
    );
    expect(executions).toEqual([
      "kb_compile_intent",
      "kb_apply_plan",
      "kb_ingest_proof",
    ]);
  });
});
