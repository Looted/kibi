import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "kibi-cli/operations/runtime-types";
import type { PrologProcess } from "kibi-cli/prolog";
import { resolveWorkspaceRoot } from "../workspace.js";

export function createDiscoveryContext(
  prolog: PrologProcess,
): OperationContext {
  // implements REQ-kibi-operation-interface-parity
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
  return {
    workspaceRoot: resolveWorkspaceRoot(),
    signal: new AbortController().signal,
    clock: () => new Date(),
    prolog: port,
  };
}
