import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
) => void;

type ToolRegistration = {
  readonly name: string;
  readonly handler: ToolHandler;
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
    return t;
  };
  const register = ({ name, handler }: ToolRegistration): void => {
    const definition = toolDef(name);
    registerTool(
      server,
      name,
      definition.description,
      definition.inputSchema,
      handler,
      runtime,
    );
  };

  // INTENTIONAL ARGUMENT CASTS: The `args as (unknown as)? XyzArgs` casts below
  // bridge the generic ToolHandler (which receives Record<string, unknown>) to the
  // specific handler argument types. Argument shapes are validated by Zod schemas
  // (via jsonSchemaToZod) before the handler is invoked, so the casts are safe at runtime.
  register({
    name: "kb_query",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbQuery(prolog, args as QueryArgs);
    },
  });
  register({
    name: "kb_search",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbSearch(prolog, args as unknown as SearchArgs);
    },
  });
  register({
    name: "kb_status",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbStatus(prolog, args as StatusArgs);
    },
  });
  register({
    name: "kb_skills_list",
    handler: async (args) => runtime.handleKbSkillsList(args as SkillsListArgs),
  });
  register({
    name: "kb_skills_load",
    handler: async (args) =>
      runtime.handleKbSkillsLoad(args as unknown as SkillsLoadArgs),
  });
  register({
    name: "kb_skills_read",
    handler: async (args) =>
      runtime.handleKbSkillsRead(args as unknown as SkillsReadArgs),
  });
  register({
    name: "kb_find_gaps",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbFindGaps(prolog, args as FindGapsArgs);
    },
  });
  register({
    name: "kb_coverage",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbCoverage(prolog, args as CoverageArgs);
    },
  });
  register({
    name: "kb_graph",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbGraph(prolog, args as unknown as GraphArgs);
    },
  });
  register({
    name: "kb_sparql_remote",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleSparql(prolog, args as unknown as SparqlArgs);
    },
  });
  register({
    name: "kb_semantic_advisor",
    handler: async (args) =>
      runtime.handleKbSemanticAdvisor(args as unknown as SemanticAdvisorArgs),
  });
  register({
    name: "kb_upsert",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbUpsert(prolog, args as unknown as UpsertArgs);
    },
  });
  register({
    name: "kb_validate_upsert",
    handler: async (args) =>
      runtime.handleKbValidateUpsert(args as unknown as UpsertArgs),
  });
  register({
    name: "kb_delete",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbDelete(prolog, args as unknown as DeleteArgs);
    },
  });
  register({
    name: "kb_check",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbCheck(prolog, args as CheckArgs);
    },
  });
  register({
    name: "kb_model_requirement",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbModelRequirement(
        prolog,
        args as unknown as ModelRequirementArgs,
      );
    },
  });
  register({
    name: "kb_suggest_predicates",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbSuggestPredicates(
        prolog,
        args as unknown as SuggestPredicatesArgs,
      );
    },
  });
  register({
    name: "kb_autopilot_generate",
    handler: async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbAutopilotGenerate(
        prolog,
        args as unknown as AutopilotGenerateArgs,
      );
    },
  });
}
