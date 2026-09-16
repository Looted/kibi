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

export type HookState = {
  mcpState: McpState;
  dirtyPaths: string[];
  guidedReadPaths: string[];
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
  kind: "read" | "write",
  guidedPath: string,
): HookState {
  return updateHookState(stateDir, (state) => {
    const normalized = normalizePath(guidedPath);
    // rationale: mergeStringPaths already drops blank entries, so the guard
    // is behaviorally redundant.
    // Stryker disable next-line ConditionalExpression, BlockStatement
    if (normalized.length === 0) {
      return state;
    }

    if (kind === "read") {
      return {
        ...state,
        guidedReadPaths: mergeStringPaths(state.guidedReadPaths, [normalized]),
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
  kind: "read" | "write",
  guidedPath: string,
): boolean {
  const normalized = normalizePath(guidedPath);
  const bucket =
    kind === "read" ? state.guidedReadPaths : state.guidedWritePaths;
  return bucket.includes(normalized);
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
