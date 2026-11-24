import { mapSpec } from "kibi-runtime";
import type {
  MapInput,
  MapPayload,
  OperationContext,
  OperationResult,
  PrologProcess,
} from "kibi-runtime";
import { createDiscoveryContext } from "./discovery-adapter.js";

export type MapArgs = MapInput;
export type MapResult = OperationResult<MapPayload>;

export async function handleKbMap(
  prolog: PrologProcess,
  args: MapArgs,
  context?: OperationContext,
): Promise<MapResult> {
  return mapSpec.execute(args, createDiscoveryContext(prolog, context));
}
