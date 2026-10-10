import { searchSpec } from "kibi-runtime";
import type {
  OperationContext,
  OperationResult,
  SearchInput,
  SearchPayload,
} from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { createDiscoveryContext } from "./discovery-adapter.js";

export type SearchArgs = SearchInput;
export type SearchResult = OperationResult<SearchPayload>;

export async function handleKbSearch(
  prolog: PrologProcess,
  args: SearchArgs,
  context?: OperationContext,
): Promise<SearchResult> {
  // implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
  // The runtime context carries the branch attachment the answer layer
  // names as the branch it answered from.
  return searchSpec.execute(args, createDiscoveryContext(prolog, context));
}
