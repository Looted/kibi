import { VALID_ENTITY_TYPES, querySpec } from "kibi-cli/operations";
import type { QueryInput, QueryPayload } from "kibi-cli/operations";
import type { OperationResult } from "kibi-cli/operations";
import type { PrologProcess } from "kibi-cli/prolog";
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
