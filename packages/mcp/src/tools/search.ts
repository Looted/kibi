import { searchSpec } from "kibi-cli/operations";
import type {
  OperationResult,
  SearchInput,
  SearchPayload,
} from "kibi-cli/operations";
import type { PrologProcess } from "kibi-cli/prolog";
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
