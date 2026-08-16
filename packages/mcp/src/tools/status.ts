import { statusSpec } from "kibi-runtime";
import type { OperationResult, StatusInput, StatusPayload } from "kibi-runtime";
import type { OperationContext } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { createDiscoveryContext } from "./discovery-adapter.js";

export type StatusArgs = StatusInput;
export type StatusResult = OperationResult<StatusPayload>;
export type { StatusPayload };

export async function handleKbStatus(
  prolog: PrologProcess,
  args: StatusArgs,
  context?: OperationContext,
): Promise<StatusResult> {
  // implements REQ-kibi-operation-interface-parity
  // Freshness is read-after-write sensitive: invalidate the PrologProcess query
  // cache so kb_status always reflects the current workspace state rather than
  // a stale earlier-in-session result.
  prolog.invalidateCache();
  return statusSpec.execute(args, createDiscoveryContext(prolog, context));
}
