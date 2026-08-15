import { VALID_ENTITY_TYPES, querySpec } from "kibi-runtime";
import type { QueryInput, QueryPayload } from "kibi-runtime";
import type { OperationResult } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { createDiscoveryContext } from "./discovery-adapter.js";

export { VALID_ENTITY_TYPES };
export type QueryArgs = QueryInput;
export type QueryResult = OperationResult<QueryPayload>;

export async function handleKbQuery(
  prolog: PrologProcess,
  args: QueryArgs,
): Promise<QueryResult> {
  // implements REQ-kibi-operation-interface-parity
  return querySpec.execute(args, createDiscoveryContext(prolog));
}
