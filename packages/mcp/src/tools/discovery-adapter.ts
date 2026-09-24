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
    ...(typeof engine.queryEntities === "function"
      ? {
          queryEntities: (
            input: Parameters<NonNullable<PrologPort["queryEntities"]>>[0],
            querySignal?: AbortSignal,
          ) => engine.queryEntities!(input, querySignal ?? signal),
        }
      : {}),
    ...(typeof engine.searchEntities === "function"
      ? {
          searchEntities: (
            input: Parameters<NonNullable<PrologPort["searchEntities"]>>[0],
            querySignal?: AbortSignal,
          ) => engine.searchEntities!(input, querySignal ?? signal),
        }
      : {}),
    ...(typeof engine.storageStatus === "function"
      ? {
          storageStatus: () => engine.storageStatus!(),
        }
      : {}),
    ...(typeof engine.queryStatusJson === "function"
      ? {
          queryStatusJson: (statusSignal?: AbortSignal) =>
            engine.queryStatusJson!(statusSignal ?? signal),
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
