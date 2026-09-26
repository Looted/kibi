import {
  emptyHookState,
  loadHookState,
  maxDirtyPaths,
  maxKbMutationTools,
  mergeStringPaths,
  normalizePath,
  updateHookState,
} from "./hook-state-storage.js";
// implements REQ-cursor-kibi-plugin-v1, REQ-cursor-stop-job-vs-plan
import type { McpState } from "./kb-mcp-tools.js";

export {
  loadHookState,
  resolveStateDir,
  saveHookState,
  updateHookState,
} from "./hook-state-storage.js";

// implements REQ-cursor-kibi-plugin-v1
export type GuidedPathKind = "read" | "pre-edit" | "write";

export type HookState = {
  mcpState: McpState;
  dirtyPaths: string[];
  guidedReadPaths: string[];
  guidedPreEditPaths: string[];
  guidedWritePaths: string[];
  kbMutationTools: string[];
  kbCheckRun: boolean;
  impactCheckRun: boolean;
  impactCheckedPaths: string[];
  planDelivered: boolean;
};

export function addDirtyPaths(
  stateDir: string | undefined,
  dirtyPaths: readonly string[],
): HookState {
  return updateHookState(stateDir, (state) => ({
    ...state,
    dirtyPaths: mergeStringPaths(state.dirtyPaths, dirtyPaths).slice(
      -maxDirtyPaths,
    ),
  }));
}

export function rememberGuidedPath(
  stateDir: string | undefined,
  kind: GuidedPathKind,
  guidedPath: string,
): HookState {
  return updateHookState(stateDir, (state) => {
    const normalized = normalizePath(guidedPath);
    if (kind === "read") {
      return {
        ...state,
        guidedReadPaths: mergeStringPaths(state.guidedReadPaths, [normalized]),
      };
    }

    if (kind === "pre-edit") {
      return {
        ...state,
        guidedPreEditPaths: mergeStringPaths(state.guidedPreEditPaths, [
          normalized,
        ]),
      };
    }

    return {
      ...state,
      guidedWritePaths: mergeStringPaths(state.guidedWritePaths, [normalized]),
    };
  });
}

export function hasGuidedPath(
  state: HookState,
  kind: GuidedPathKind,
  guidedPath: string,
): boolean {
  return guidedBucket(state, kind).includes(normalizePath(guidedPath));
}

function guidedBucket(state: HookState, kind: GuidedPathKind): string[] {
  if (kind === "read") return state.guidedReadPaths;
  if (kind === "pre-edit") return state.guidedPreEditPaths;
  return state.guidedWritePaths;
}

export function recordPlanDelivered(stateDir: string | undefined): HookState {
  return updateHookState(stateDir, (state) =>
    state.planDelivered ? state : { ...state, planDelivered: true },
  );
}

export function recordKbMcpTool(
  stateDir: string | undefined,
  toolName: string,
  options: { impactCheckRun?: boolean; sourceFiles?: readonly string[] } = {},
): HookState {
  const normalized = toolName.trim();
  // rationale: non-check names return the loaded state below without writing,
  // so the blank-name early return is behaviorally redundant.
  // Stryker disable next-line ConditionalExpression, BlockStatement
  if (normalized.length === 0) {
    return loadHookState(stateDir);
  }

  return updateHookState(stateDir, (state) => {
    const observedState: HookState = { ...state, mcpState: "observed" };
    if (normalized === "kb_check") {
      return {
        ...observedState,
        kbCheckRun: true,
        impactCheckRun: state.impactCheckRun || options.impactCheckRun === true,
        impactCheckedPaths:
          // rationale: merging an empty list leaves the paths unchanged.
          // Stryker disable ConditionalExpression
          options.impactCheckRun === true
            ? mergeStringPaths(
                state.impactCheckedPaths,
                options.sourceFiles ?? [],
              )
            : state.impactCheckedPaths,
        // Stryker restore
      };
    }

    if (normalized === "kb_upsert" || normalized === "kb_delete") {
      return {
        ...observedState,
        // rationale: only two mutation tool names exist and the list is
        // deduped, so the 20-entry bound can never bind.
        // Stryker disable next-line MethodExpression
        kbMutationTools: mergeStringPaths(state.kbMutationTools, [
          normalized,
        ]).slice(-maxKbMutationTools),
      };
    }

    return observedState;
  });
}

export function clearSessionHookState(stateDir: string | undefined): HookState {
  const clearedState = emptyHookState();

  // rationale: updating an undefined state dir already returns the updater's
  // result computed from empty state.
  // Stryker disable next-line ConditionalExpression, BlockStatement
  if (!stateDir) {
    return clearedState;
  }

  return updateHookState(stateDir, () => clearedState);
}

/** @deprecated Use clearSessionHookState */
export function clearDirtyPaths(stateDir: string | undefined): HookState {
  return clearSessionHookState(stateDir);
}
