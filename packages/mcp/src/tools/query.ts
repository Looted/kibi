import { VALID_ENTITY_TYPES, querySpec } from "kibi-runtime";
import type { QueryInput, QueryPayload } from "kibi-runtime";
import type { OperationContext, OperationResult } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { createDiscoveryContext } from "./discovery-adapter.js";

export { VALID_ENTITY_TYPES };
export type QueryArgs = QueryInput;
export type QueryResult = OperationResult<QueryPayload>;

export async function handleKbQuery(
  prolog: PrologProcess,
  args: QueryArgs,
  context?: OperationContext,
): Promise<QueryResult> {
  // implements REQ-kibi-operation-interface-parity
  // The runtime context carries the branch attachment; without it an empty
  // page from a never-compiled store cannot name the store state.
  return querySpec.execute(args, createDiscoveryContext(prolog, context));
}
