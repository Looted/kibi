import { deleteSpec } from "kibi-runtime";
import type { DeleteInput } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";

import { createMutationContext } from "./mutation-context.js";

export interface DeleteArgs extends DeleteInput {}
export type DeleteResult = Awaited<ReturnType<typeof deleteSpec.execute>>;

// implements REQ-kibi-operation-interface-parity
export async function handleKbDelete(
  prolog: PrologProcess,
  args: DeleteArgs,
): Promise<DeleteResult> {
  return deleteSpec.execute(args, createMutationContext(prolog));
}
