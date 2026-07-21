import type { PrologProcess } from "kibi-cli/prolog";
import type { McpOperationRuntime } from "../runtime/mcp-runtime.js";

import type {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../diagnostics.js";
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

export interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export type ToolHandlerArgs = Record<string, unknown> & {
  _requestId?: string;
};

export type Awaitable<T> = T | Promise<T>;
export type DefaultRuntimeProlog = PrologProcess;

export interface ToolsRuntime<TProlog = DefaultRuntimeProlog> {
  diagnosticModeEnabled: () => boolean;
  appendUsageLogLine: typeof appendUsageLogLine;
  classifyDiagnosticError: typeof classifyDiagnosticError;
  deriveDiagnosticFields: typeof deriveDiagnosticFields;
  extractToolCallPayload: typeof extractToolCallPayload;
  tools: ToolConfig[];
  activeBranchName: () => Awaitable<string>;
  ensureProlog: () => Promise<TProlog>;
  resetProlog: (reason: string) => Promise<void>;
  inFlightRequests: () => Awaitable<Map<string, Promise<unknown>>>;
  isShuttingDown: () => Awaitable<boolean>;
  prologProcess: () => Awaitable<{ getPid: () => number } | null>;
  operationRuntime: McpOperationRuntime<TProlog>;
  handleKbCheck: (prolog: TProlog, args: CheckArgs) => Promise<unknown>;
  handleKbCoverage: (prolog: TProlog, args: CoverageArgs) => Promise<unknown>;
  handleKbDelete: (prolog: TProlog, args: DeleteArgs) => Promise<unknown>;
  handleKbFindGaps: (prolog: TProlog, args: FindGapsArgs) => Promise<unknown>;
  handleKbGraph: (prolog: TProlog, args: GraphArgs) => Promise<unknown>;
  handleSparql: (prolog: TProlog, args: SparqlArgs) => Promise<unknown>;
  handleKbQuery: (prolog: TProlog, args: QueryArgs) => Promise<unknown>;
  handleKbSearch: (prolog: TProlog, args: SearchArgs) => Promise<unknown>;
  handleKbStatus: (prolog: TProlog, args: StatusArgs) => Promise<unknown>;
  handleKbSemanticAdvisor: (args: SemanticAdvisorArgs) => Promise<unknown>;
  handleKbSkillsList: (args: SkillsListArgs) => Promise<unknown>;
  handleKbSkillsLoad: (args: SkillsLoadArgs) => Promise<unknown>;
  handleKbSkillsRead: (args: SkillsReadArgs) => Promise<unknown>;
  handleKbUpsert: (prolog: TProlog, args: UpsertArgs) => Promise<unknown>;
  handleKbValidateUpsert: (
    prolog: TProlog,
    args: UpsertArgs,
  ) => Promise<unknown>;
  handleKbModelRequirement: (
    prolog: TProlog,
    args: ModelRequirementArgs,
  ) => Promise<unknown>;
  handleKbSuggestPredicates: (
    prolog: TProlog,
    args: SuggestPredicatesArgs,
  ) => Promise<unknown>;
  handleKbAutopilotGenerate: (
    prolog: TProlog,
    args: AutopilotGenerateArgs,
  ) => Promise<unknown>;
}
