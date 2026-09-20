import { type OperationContext, suggestPredicatesSpec } from "kibi-runtime";
import type {
  SuggestPredicatesArgs,
  SuggestPredicatesResult,
} from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { resolveWorkspaceRoot } from "../workspace.js";
import { createDiscoveryContext } from "./discovery-adapter.js";

export type { SuggestPredicatesArgs, SuggestPredicatesResult };

export async function handleKbSuggestPredicates(
  prolog: PrologProcess | null,
  args: SuggestPredicatesArgs,
  context?: OperationContext,
): Promise<SuggestPredicatesResult> {
  const resolved: OperationContext =
    context ??
    (prolog === null
      ? {
          workspaceRoot: resolveWorkspaceRoot(),
          signal: new AbortController().signal,
          clock: () => new Date(),
        }
      : createDiscoveryContext(prolog));
  return suggestPredicatesSpec.execute(args, resolved);
}
