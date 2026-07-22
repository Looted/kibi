import {
  emptyHookState,
  loadHookState,
  maxDirtyPaths,
  maxKbMutationTools,
  mergeStringPaths,
  normalizePath,
  updateHookState,
} from "./hook-state-storage.js";
// implements REQ-cursor-kibi-plugin-v1
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

export function recordKbMcpTool(
  stateDir: string | undefined,
  toolName: string,
  options: { impactCheckRun?: boolean; sourceFiles?: readonly string[] } = {},
): HookState {
  const normalized = toolName.trim();
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
          options.impactCheckRun === true
            ? mergeStringPaths(
                state.impactCheckedPaths,
                options.sourceFiles ?? [],
              )
            : state.impactCheckedPaths,
      };
    }

    if (normalized === "kb_upsert" || normalized === "kb_delete") {
      return {
        ...observedState,
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

  if (!stateDir) {
    return clearedState;
  }

  return updateHookState(stateDir, () => clearedState);
}

/** @deprecated Use clearSessionHookState */
export function clearDirtyPaths(stateDir: string | undefined): HookState {
  return clearSessionHookState(stateDir);
}
