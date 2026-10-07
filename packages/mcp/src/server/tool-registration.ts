import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { type OperationName, getSpec, statusSpec } from "kibi-runtime";
import {
  MODEL_ROUTES,
  SKILL_ROUTES,
  dispatchComposite,
  executeApplyPlan,
  executeCompileIntent,
  executeDelete,
  executeIngestProof,
  executeUpsert,
} from "kibi-runtime";
import type { OperationContext, RuntimeOperationSpec } from "kibi-runtime";

import { OPTIONAL_TOOL_NAMES, enabledOptionalTools } from "../tools-config.js";
import type { CheckArgs } from "../tools/check.js";
import type { CoverageArgs } from "../tools/coverage.js";
import type { DeleteArgs } from "../tools/delete.js";
import type { FindGapsArgs } from "../tools/find-gaps.js";
import type { GraphArgs } from "../tools/graph.js";
import type { ModelRequirementArgs } from "../tools/model-requirement.js";
import type { PlanBootstrapArgs } from "../tools/plan-bootstrap.js";
import type { QueryArgs } from "../tools/query.js";
import type { SearchArgs } from "../tools/search.js";
import type { SemanticAdvisorArgs } from "../tools/semantic-advisor.js";
import type {
  SkillsListArgs,
  SkillsLoadArgs,
  SkillsReadArgs,
} from "../tools/skills.js";
import type { SparqlArgs } from "../tools/sparql.js";
import type { StatusArgs } from "../tools/status.js";
import type { SuggestPredicatesArgs } from "../tools/suggest-predicates.js";
import type { UpsertArgs } from "../tools/upsert.js";
import { startJob } from "./jobs.js";
import type { ToolHandler, ToolsRuntime } from "./tool-types.js";

type ToolRegistrar<TProlog> = (
  server: McpServer,
  name: string,
  description: string,
  inputSchema: object,
  handler: ToolHandler,
  runtime: ToolsRuntime<TProlog>,
  spec?: RuntimeOperationSpec<Record<string, unknown>, unknown>,
  annotations?: ToolAnnotations,
  outputSchema?: object,
) => void;

type ToolRegistration = {
  readonly name: OperationName;
  readonly execute: (
    context: OperationContext,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
};

// implements REQ-002, REQ-013
export function registerConfiguredTools<TProlog>(
  server: McpServer,
  runtime: ToolsRuntime<TProlog>,
  registerTool: ToolRegistrar<TProlog>,
): void {
  const toolDef = (name: string) => {
    const t = runtime.tools.find((tool) => tool.name === name);
    if (!t) throw new Error(`Unknown tool: ${name}`);
    return t as typeof t & {
      annotations?: ToolAnnotations;
      outputSchema?: Readonly<Record<string, unknown>>;
    };
  };
  const prologFor = (context: OperationContext): TProlog => {
    const prolog = runtime.operationRuntime.sessionProlog(context);
    if (!prolog) {
      throw new Error("Operation requires a session Prolog process");
    }
    return prolog;
  };
  const withSessionProlog = (context: OperationContext): OperationContext => ({
    ...context,
    prolog: prologFor(context) as unknown as NonNullable<
      OperationContext["prolog"]
    >,
  });
  const register = ({ name, execute }: ToolRegistration): void => {
    // Optional tools (kb_sparql_remote) are registered only when enabled;
    // every other configured tool must have a definition.
    if (
      (OPTIONAL_TOOL_NAMES as readonly string[]).includes(name) &&
      !runtime.tools.some((tool) => tool.name === name)
    ) {
      return;
    }
    const definition = toolDef(name);
    const publicSpec = getSpec(name);
    const spec: RuntimeOperationSpec<Record<string, unknown>, unknown> = {
      name,
      effects: publicSpec.effects,
      requiresProlog: publicSpec.requiresProlog,
      ...(publicSpec.agentVisibleStructuredData === true
        ? { agentVisibleStructuredData: true }
        : {}),
      execute: (args, context) => execute(context, args),
    };
    registerTool(
      server,
      name,
      definition.description,
      definition.inputSchema,
      async () => undefined,
      runtime,
      spec,
      definition.annotations,
      definition.outputSchema,
    );
  };

  // INTENTIONAL ARGUMENT CASTS: The `args as (unknown as)? XyzArgs` casts below
  // bridge the generic ToolHandler (which receives Record<string, unknown>) to the
  // specific handler argument types. Argument shapes are validated by Zod schemas
  // (via jsonSchemaToZod) before the handler is invoked, so the casts are safe at runtime.
  register({
    name: "kb_query",
    execute: async (context, args) =>
      runtime.handleKbQuery(prologFor(context), args as QueryArgs),
  });
  register({
    name: "kb_search",
    execute: async (context, args) =>
      runtime.handleKbSearch(prologFor(context), args as unknown as SearchArgs),
  });
  register({
    name: "kb_status",
    execute: async (context, args) =>
      // Status owns its non-mutating fallback. Do not require the session engine
      // here: an absent or unreadable branch store is exactly the condition it
      // must be able to describe.
      statusSpec.execute(args as StatusArgs, context),
  });
  register({
    name: "kb_skills",
    execute: async (context, args) =>
      dispatchComposite(
        "action",
        {
          list: {
            ...SKILL_ROUTES.list,
            execute: async (input) =>
              runtime.handleKbSkillsList(input as SkillsListArgs),
          },
          load: {
            ...SKILL_ROUTES.load,
            execute: async (input) =>
              runtime.handleKbSkillsLoad(input as unknown as SkillsLoadArgs),
          },
          read: {
            ...SKILL_ROUTES.read,
            execute: async (input) =>
              runtime.handleKbSkillsRead(input as unknown as SkillsReadArgs),
          },
        },
        args,
        context,
      ),
  });
  register({
    name: "kb_find_gaps",
    execute: async (context, args) =>
      runtime.handleKbFindGaps(prologFor(context), args as FindGapsArgs),
  });
  register({
    name: "kb_coverage",
    execute: async (context, args) =>
      runtime.handleKbCoverage(
        prologFor(context),
        args as CoverageArgs,
        context,
      ),
  });
  register({
    name: "kb_graph",
    execute: async (context, args) =>
      runtime.handleKbGraph(prologFor(context), args as unknown as GraphArgs),
  });
  register({
    name: "kb_sparql_remote",
    execute: async (context, args) =>
      runtime.handleSparql(args as SparqlArgs, context),
  });
  register({
    name: "kb_model",
    execute: async (context, args) =>
      dispatchComposite(
        "mode",
        {
          analyze: {
            ...MODEL_ROUTES.analyze,
            execute: async (input) =>
              runtime.handleKbSemanticAdvisor(
                input as unknown as SemanticAdvisorArgs,
                context,
              ),
          },
          requirement: {
            ...MODEL_ROUTES.requirement,
            execute: async (input) =>
              runtime.handleKbModelRequirement(
                prologFor(context),
                input as unknown as ModelRequirementArgs,
                withSessionProlog(context),
              ),
          },
          predicates: {
            ...MODEL_ROUTES.predicates,
            execute: async (input) =>
              runtime.handleKbSuggestPredicates(
                prologFor(context),
                input as unknown as SuggestPredicatesArgs,
                withSessionProlog(context),
              ),
          },
        },
        args,
        context,
      ),
  });
  register({
    name: "kb_upsert",
    execute: async (context, args) =>
      executeUpsert(args as unknown as UpsertArgs, withSessionProlog(context)),
  });
  register({
    name: "kb_delete",
    execute: async (context, args) =>
      executeDelete(args as unknown as DeleteArgs, withSessionProlog(context)),
  });
  register({
    name: "kb_check",
    execute: async (context, args) => {
      const { async: asyncMode, ...checkArgs } = args as Record<
        string,
        unknown
      > & { async?: boolean };
      // Without a registered kb_job_status nothing could poll the receipt,
      // so async falls back to a synchronous check.
      if (asyncMode !== true || !enabledOptionalTools().has("kb_job_status")) {
        return runtime.handleKbCheck(
          prologFor(context),
          args as unknown as CheckArgs,
        );
      }
      // Long-KB full checks can exceed the tool timeout. Detach into a job
      // and return the kibi.job.v1 receipt immediately; the agent polls
      // kb_job_status for the terminal state and full result.
      return startJob("kb_check", () =>
        runtime.handleKbCheck(
          prologFor(context),
          checkArgs as unknown as CheckArgs,
        ),
      );
    },
  });
  register({
    name: "kb_prepare_impact_review",
    execute: async (context, args) =>
      getSpec("kb_prepare_impact_review").execute(args, context),
  });
  register({
    name: "kb_plan_bootstrap",
    execute: async (context, args) =>
      runtime.handleKbPlanBootstrap(
        args as unknown as PlanBootstrapArgs,
        context,
      ),
  });
  register({
    name: "kb_compile_intent",
    execute: async (context, args) =>
      runtime.handleKbCompileIntent
        ? runtime.handleKbCompileIntent(args, context)
        : executeCompileIntent(args as never, context as never),
  });
  register({
    name: "kb_apply_plan",
    execute: async (context, args) => {
      const { async: asyncMode, ...applyArgs } = args as Record<
        string,
        unknown
      > & { async?: boolean };
      const apply = (applyContext: OperationContext) =>
        runtime.handleKbApplyPlan
          ? runtime.handleKbApplyPlan(applyArgs, applyContext)
          : executeApplyPlan(applyArgs as never, applyContext as never);
      // Without a registered kb_job_status nothing could poll the receipt,
      // so async falls back to a synchronous apply (which still reports
      // progress when the request carries a progressToken).
      if (asyncMode !== true || !enabledOptionalTools().has("kb_job_status")) {
        return apply(context);
      }
      // A large bootstrap plan can outlast any client request timeout.
      // Detach it into a job and return the kibi.job.v1 receipt; the agent
      // polls kb_job_status. The request is over once the receipt returns,
      // so the job reports no progress and refreshes the branch stamp itself.
      const { onProgress: _requestProgress, ...jobContext } = context;
      return startJob("kb_apply_plan", async () => {
        const result = await apply(jobContext);
        await runtime.operationRuntime.afterSuccess(
          {
            name: "kb_apply_plan",
            effects: getSpec("kb_apply_plan").effects,
            requiresProlog: true,
            execute: async () => undefined,
          },
          jobContext,
        );
        return result;
      });
    },
  });
  register({
    name: "kb_ingest_proof",
    execute: async (context, args) =>
      runtime.handleKbIngestProof
        ? runtime.handleKbIngestProof(args, context)
        : executeIngestProof(args as never, context as never),
  });
}
