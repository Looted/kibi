import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { resolveWorkspaceRoot } from "../workspace.js";

export function createDiscoveryContext(
  prolog: PrologProcess,
  baseContext?: OperationContext,
): OperationContext {
  // implements REQ-kibi-operation-interface-parity
  let lastResult: PrologQueryResult | null = null;
  const mode = (prolog as unknown as { useOneShotMode?: unknown })
    .useOneShotMode;
  const port: PrologPort = {
    query: async (goal) => {
      lastResult = await prolog.query(goal);
      return lastResult;
    },
    oneShotMode:
      mode === undefined
        ? typeof (globalThis as { Bun?: unknown }).Bun !== "undefined"
        : Boolean(mode),
    nextSolution: async () => {
      const result = lastResult;
      lastResult = null;
      return result;
    },
    save: () => prolog.query("kb_save"),
    ...(typeof (prolog as { queryStatusJson?: unknown }).queryStatusJson ===
    "function"
      ? {
          queryStatusJson: () =>
            (
              prolog as PrologProcess & {
                queryStatusJson: () => Promise<PrologQueryResult>;
              }
            ).queryStatusJson(),
        }
      : {}),
  };
  return {
    ...(baseContext ?? {}),
    workspaceRoot: baseContext?.workspaceRoot ?? resolveWorkspaceRoot(),
    signal: baseContext?.signal ?? new AbortController().signal,
    clock: baseContext?.clock ?? (() => new Date()),
    prolog: port,
  };
}
