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
  // Keep this adapter aligned with tools-runtime adaptProlog: indexed discovery
  // and typed status must reach EngineClient command frames (not query-only
  // fallbacks), and AbortSignal must forward for MCP tool cancellation.
  const engine = prolog as PrologProcess & {
    query: (goal: string, signal?: AbortSignal) => Promise<PrologQueryResult>;
    queryEntities?: NonNullable<PrologPort["queryEntities"]>;
    searchEntities?: NonNullable<PrologPort["searchEntities"]>;
    storageStatus?: () => Promise<PrologQueryResult>;
    queryStatusJson?: (signal?: AbortSignal) => Promise<PrologQueryResult>;
  };
  const queryEntities = engine.queryEntities;
  const searchEntities = engine.searchEntities;
  const storageStatus = engine.storageStatus;
  const queryStatusJson = engine.queryStatusJson;
  let lastResult: PrologQueryResult | null = null;
  const mode = (prolog as unknown as { useOneShotMode?: unknown })
    .useOneShotMode;
  const signal = baseContext?.signal ?? new AbortController().signal;
  const port: PrologPort = {
    query: async (goal, querySignal) => {
      lastResult = await engine.query(goal, querySignal ?? signal);
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
    save: (saveSignal) => engine.query("kb_save", saveSignal ?? signal),
    ...(typeof queryEntities === "function"
      ? {
          queryEntities: (
            input: Parameters<NonNullable<PrologPort["queryEntities"]>>[0],
            querySignal?: AbortSignal,
          ) => queryEntities.call(engine, input, querySignal ?? signal),
        }
      : {}),
    ...(typeof searchEntities === "function"
      ? {
          searchEntities: (
            input: Parameters<NonNullable<PrologPort["searchEntities"]>>[0],
            querySignal?: AbortSignal,
          ) => searchEntities.call(engine, input, querySignal ?? signal),
        }
      : {}),
    ...(typeof storageStatus === "function"
      ? {
          storageStatus: () => storageStatus.call(engine),
        }
      : {}),
    ...(typeof queryStatusJson === "function"
      ? {
          queryStatusJson: (statusSignal?: AbortSignal) =>
            queryStatusJson.call(engine, statusSignal ?? signal),
        }
      : {}),
  };
  return {
    ...(baseContext ?? {}),
    workspaceRoot: baseContext?.workspaceRoot ?? resolveWorkspaceRoot(),
    signal,
    clock: baseContext?.clock ?? (() => new Date()),
    prolog: port,
  };
}
