import { searchSpec } from "kibi-runtime";
import type { OperationResult, SearchInput, SearchPayload } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { createDiscoveryContext } from "./discovery-adapter.js";

export type SearchArgs = SearchInput;
export type SearchResult = OperationResult<SearchPayload>;

export async function handleKbSearch(
  prolog: PrologProcess,
  args: SearchArgs,
): Promise<SearchResult> {
  // implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
  return searchSpec.execute(args, createDiscoveryContext(prolog));
}
