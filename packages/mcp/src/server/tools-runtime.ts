import {
  DIAGNOSTIC_MODE_ENABLED,
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../diagnostics.js";
import { TOOLS } from "../tools-config.js";
import { handleKbAutopilotGenerate } from "../tools/autopilot-generate.js";
import { handleKbCheck } from "../tools/check.js";
import { handleKbCoverage } from "../tools/coverage.js";
import { handleKbDelete } from "../tools/delete.js";
import { handleKbFindGaps } from "../tools/find-gaps.js";
import { handleKbGraph } from "../tools/graph.js";
import { handleKbModelRequirement } from "../tools/model-requirement.js";
import { handleKbQuery } from "../tools/query.js";
import { handleKbSearch } from "../tools/search.js";
import { handleKbSemanticAdvisor } from "../tools/semantic-advisor.js";
import {
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
} from "../tools/skills.js";
import { handleSparql } from "../tools/sparql.js";
import { handleKbStatus } from "../tools/status.js";
import { handleKbSuggestPredicates } from "../tools/suggest-predicates.js";
import { handleKbUpsert } from "../tools/upsert.js";
import { handleKbValidateUpsert } from "../tools/validate-upsert.js";
import type {
  DefaultRuntimeProlog,
  ToolConfig,
  ToolsRuntime,
} from "./tool-types.js";

type SessionModule = typeof import("./session.js");

interface ToolsServerDeps {
  getSessionModule: () => Promise<SessionModule>;
}

const defaultToolsServerDeps: ToolsServerDeps = {
  getSessionModule: () => import("./session.js"),
};

let sessionModulePromise: Promise<SessionModule> | null = null;

// implements REQ-008
export function _setToolsServerDepsForTests(
  deps: Partial<ToolsServerDeps>,
  resetPromise = false,
): void {
  defaultToolsServerDeps.getSessionModule =
    deps.getSessionModule ?? defaultToolsServerDeps.getSessionModule;
  if (resetPromise) {
    sessionModulePromise = null;
  }
}

// implements REQ-012
export function _resetSessionModulePromise(): void {
  sessionModulePromise = null;
}

/* v8 ignore next (3 lines) — lazy async module loader; body only executes once per process
 * when DEFAULT_TOOLS_RUNTIME.activeBranchName/ensureProlog/etc. are first called.
 * Cannot be re-triggered without process restart (sessionModulePromise is module-level). */
async function getSessionModule(): Promise<SessionModule> {
  sessionModulePromise ??= defaultToolsServerDeps.getSessionModule();
  return sessionModulePromise;
}

export const DEFAULT_TOOLS_RUNTIME: ToolsRuntime<DefaultRuntimeProlog> = {
  diagnosticModeEnabled: () => DIAGNOSTIC_MODE_ENABLED,
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
  // INTENTIONAL: TOOLS is imported as a Zod-inferred schema type; ToolConfig is the
  // runtime interface with looser Record<string, unknown> inputSchema. The cast is safe
  // because the tool definitions are statically authored and validated at startup.
  tools: TOOLS as unknown as ToolConfig[],
  activeBranchName: async () => (await getSessionModule()).activeBranchName,
  ensureProlog: async () => (await getSessionModule()).ensureProlog(),
  resetProlog: async (reason) => (await getSessionModule()).resetProlog(reason),
  inFlightRequests: async () => (await getSessionModule()).inFlightRequests,
  isShuttingDown: async () => (await getSessionModule()).isShuttingDown,
  prologProcess: async () => (await getSessionModule()).prologProcess,
  handleKbCheck,
  handleKbCoverage,
  handleKbDelete,
  handleKbFindGaps,
  handleKbGraph,
  handleSparql,
  handleKbQuery,
  handleKbSearch,
  handleKbStatus,
  handleKbSemanticAdvisor,
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
  handleKbUpsert,
  handleKbValidateUpsert,
  handleKbModelRequirement,
  handleKbSuggestPredicates,
  handleKbAutopilotGenerate,
};
