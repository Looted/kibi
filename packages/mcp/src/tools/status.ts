import { statusSpec } from "kibi-cli/operations";
import type {
  OperationResult,
  StatusInput,
  StatusPayload,
} from "kibi-cli/operations";
import type { PrologProcess } from "kibi-cli/prolog";
import { createDiscoveryContext } from "./discovery-adapter.js";

export type StatusArgs = StatusInput;
export type StatusResult = OperationResult<StatusPayload>;
export type { StatusPayload };

export async function handleKbStatus(
  prolog: PrologProcess,
  args: StatusArgs,
): Promise<StatusResult> {
  // implements REQ-kibi-operation-interface-parity
  return statusSpec.execute(args, createDiscoveryContext(prolog));
}
