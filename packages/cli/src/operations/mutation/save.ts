import type { PrologPort } from "../../public/operations/runtime-types.js";

// implements REQ-kibi-operation-interface-parity
export async function saveMutation(prolog: PrologPort): Promise<void> {
  prolog.invalidateCache?.();
  const result = await prolog.save();
  if (!result.success) {
    throw new Error(`Failed to save KB after upsert: ${result.error ?? "Unknown error"}`);
  }
}
