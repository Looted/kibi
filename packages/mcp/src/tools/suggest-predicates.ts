import {
  type OperationContext,
  suggestPredicatesSpec,
} from "kibi-cli/operations";
import type {
  SuggestPredicatesArgs,
  SuggestPredicatesResult,
} from "kibi-cli/operations/modeling/suggest-predicates";
import type { PrologProcess } from "kibi-cli/prolog";
import { resolveWorkspaceRoot } from "../workspace.js";
import { createDiscoveryContext } from "./discovery-adapter.js";

export type { SuggestPredicatesArgs, SuggestPredicatesResult };

export async function handleKbSuggestPredicates(
  prolog: PrologProcess | null,
  args: SuggestPredicatesArgs,
): Promise<SuggestPredicatesResult> {
  const context: OperationContext =
    prolog === null
      ? {
          workspaceRoot: resolveWorkspaceRoot(),
          signal: new AbortController().signal,
          clock: () => new Date(),
        }
      : createDiscoveryContext(prolog);
  return suggestPredicatesSpec.execute(args, context);
}
