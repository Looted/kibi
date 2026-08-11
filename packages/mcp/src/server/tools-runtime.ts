import { getSpec } from "kibi-cli/operations";
import { nodeGit } from "kibi-cli/operations/node-ports";
import type {
  PrologPort,
  PrologQueryResult,
} from "kibi-cli/operations/runtime-types";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  DIAGNOSTIC_MODE_ENABLED,
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../diagnostics.js";
import { isMcpDebugEnabled } from "../env.js";
import { createMcpRuntime } from "../runtime/mcp-runtime.js";
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
import { handleKbStatus } from "../tools/status.js";
import { handleKbSuggestPredicates } from "../tools/suggest-predicates.js";
import { handleKbUpsert } from "../tools/upsert.js";
import { handleKbValidateUpsert } from "../tools/validate-upsert.js";
import { resolveWorkspaceRoot } from "../workspace.js";
import { readBranchKbStamp } from "./kb-freshness.js";
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
const prologPorts = new WeakMap<PrologProcess, PrologPort>();

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

function adaptProlog(prolog: PrologProcess): PrologPort {
  const existing = prologPorts.get(prolog);
  if (existing) {
    return existing;
  }
  let lastResult: PrologQueryResult | null = null;
  const port: PrologPort = {
    query: async (goal) => {
      lastResult = await prolog.query(goal);
      return lastResult;
    },
    nextSolution: async () => {
      const result = lastResult;
      lastResult = null;
      return result;
    },
    save: () => prolog.query("kb_save"),
  };
  prologPorts.set(prolog, port);
  return port;
}

const operationRuntime = createMcpRuntime<PrologProcess>({
  workspaceRoot: resolveWorkspaceRoot(),
  activeBranchName: async () => (await getSessionModule()).activeBranchName,
  attachedBranchKbPath: async () =>
    (await getSessionModule()).attachedBranchKbPath,
  ensureProlog: async () => (await getSessionModule()).ensureProlog(),
  adaptProlog,
  git: nodeGit,
  net: { fetch: (input, init) => globalThis.fetch(input, init) },
  refreshAttachedBranchStamp: async () => {
    const session = await getSessionModule();
    const kbPath = session.attachedBranchKbPath;
    if (kbPath) {
      try {
        session.updateAttachedBranchStamp(await readBranchKbStamp(kbPath));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isMcpDebugEnabled()) {
          console.warn(
            "[KIBI-MCP] Attached branch stamp refresh failed:",
            message,
          );
        }
      }
    }
  },
});

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
  operationRuntime,
  handleKbCheck,
  handleKbCoverage,
  handleKbDelete,
  handleKbFindGaps,
  handleKbGraph,
  handleSparql: (args, context) =>
    getSpec("kb_sparql_remote").execute(args, context),
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
