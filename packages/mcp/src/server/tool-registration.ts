import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { type OperationName, getSpec, statusSpec } from "kibi-runtime";
import {
  executeApplyPlan,
  executeCompileIntent,
  executeDelete,
  executeIngestVerification,
  executeUpsert,
  validateUpsertSpec,
} from "kibi-runtime";
import type { OperationContext, RuntimeOperationSpec } from "kibi-runtime";

import type { AutopilotGenerateArgs } from "../tools/autopilot-generate.js";
import type { CheckArgs } from "../tools/check.js";
import type { CoverageArgs } from "../tools/coverage.js";
import type { DeleteArgs } from "../tools/delete.js";
import type { FindGapsArgs } from "../tools/find-gaps.js";
import type { GraphArgs } from "../tools/graph.js";
import type { ModelRequirementArgs } from "../tools/model-requirement.js";
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
    const definition = toolDef(name);
    const publicSpec = getSpec(name);
    const spec: RuntimeOperationSpec<Record<string, unknown>, unknown> = {
      name,
      effects: publicSpec.effects,
      requiresProlog: publicSpec.requiresProlog,
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
    name: "kb_skills_list",
    execute: async (_context, args) =>
      runtime.handleKbSkillsList(args as SkillsListArgs),
  });
  register({
    name: "kb_skills_load",
    execute: async (_context, args) =>
      runtime.handleKbSkillsLoad(args as unknown as SkillsLoadArgs),
  });
  register({
    name: "kb_skills_read",
    execute: async (_context, args) =>
      runtime.handleKbSkillsRead(args as unknown as SkillsReadArgs),
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
    name: "kb_semantic_advisor",
    execute: async (_context, args) =>
      runtime.handleKbSemanticAdvisor(args as unknown as SemanticAdvisorArgs),
  });
  register({
    name: "kb_upsert",
    execute: async (context, args) =>
      executeUpsert(args as unknown as UpsertArgs, withSessionProlog(context)),
  });
  register({
    name: "kb_validate_upsert",
    execute: async (context, args) =>
      validateUpsertSpec.execute(
        args as unknown as UpsertArgs,
        withSessionProlog(context),
      ),
  });
  register({
    name: "kb_delete",
    execute: async (context, args) =>
      executeDelete(args as unknown as DeleteArgs, withSessionProlog(context)),
  });
  register({
    name: "kb_check",
    execute: async (context, args) =>
      runtime.handleKbCheck(prologFor(context), args as CheckArgs),
  });
  register({
    name: "kb_model_requirement",
    execute: async (context, args) =>
      runtime.handleKbModelRequirement(
        prologFor(context),
        args as unknown as ModelRequirementArgs,
      ),
  });
  register({
    name: "kb_suggest_predicates",
    execute: async (context, args) =>
      runtime.handleKbSuggestPredicates(
        prologFor(context),
        args as unknown as SuggestPredicatesArgs,
      ),
  });
  register({
    name: "kb_autopilot_generate",
    execute: async (context, args) =>
      runtime.handleKbAutopilotGenerate(
        args as unknown as AutopilotGenerateArgs,
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
    execute: async (context, args) =>
      runtime.handleKbApplyPlan
        ? runtime.handleKbApplyPlan(args, context)
        : executeApplyPlan(args as never, context as never),
  });
  register({
    name: "kb_ingest_verification",
    execute: async (context, args) =>
      runtime.handleKbIngestVerification
        ? runtime.handleKbIngestVerification(args, context)
        : executeIngestVerification(args as never, context as never),
  });
}
