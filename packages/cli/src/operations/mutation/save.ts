import type { PrologPort } from "../../public/operations/runtime-types.js";

export async function saveMutation(
  prolog: PrologPort,
  operation: "upsert" | "delete" = "upsert",
): Promise<void> {
  prolog.invalidateCache?.();
  const result = await prolog.save();
  if (!result.success) {
    throw new Error(`Failed to save KB after ${operation}: ${result.error ?? "Unknown error"}`);
  }
}

export async function saveAtomicMutation(
  prolog: PrologPort,
  goals: readonly string[],
  operation: "delete",
): Promise<void> {
  const result = await prolog.query(
    `rdf_transaction((${[...goals, "kb_save"].join(", ")}))`,
  );
  if (!result.success) {
    throw new Error(`Failed to save KB after ${operation}: ${result.error ?? "Unknown error"}`);
  }
  prolog.invalidateCache?.();
}
