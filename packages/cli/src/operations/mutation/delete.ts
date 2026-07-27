import { parseEntityFromList, parseListOfLists } from "../../prolog/codec.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { buildEntityDeleteAuditGoal } from "./audit.js";
import { dependentRelationshipsGoal } from "./relationships.js";
import { saveAtomicMutation, saveMutation } from "./save.js";
import type { DeleteInput, DeletePayload } from "./types.js";

function requireProlog(context: OperationContext) {
  if (context.prolog === undefined) {
    throw new Error("Delete operation requires a Prolog runtime");
  }
  return context.prolog;
}

async function loadEntity(
  prolog: NonNullable<OperationContext["prolog"]>,
  id: string,
): Promise<Readonly<Record<string, unknown>>> {
  const safeId = id.replaceAll("'", "''");
  const result = await prolog.query(
    `findall(['${safeId}',Type,Props], kb_entity('${safeId}', Type, Props), Results)`,
  );
  if (!result.success) {
    throw new Error(
      `Failed to load metadata for entity ${id}: ${result.error ?? "Unknown error"}`,
    );
  }
  const rows = parseListOfLists(result.bindings.Results ?? "[]");
  if (rows.length === 0) {
    throw new Error(
      `Failed to load metadata for entity ${id}: Entity not found`,
    );
  }
  return { ...parseEntityFromList(rows[0] ?? []), id };
}

export async function executeDelete(
  input: DeleteInput,
  context: OperationContext,
): Promise<OperationResult<DeletePayload>> {
  const prolog = requireProlog(context);
  if (input.ids.length === 0)
    throw new Error("At least one ID required for delete");
  try {
    const errors: string[] = [];
    const goals: string[] = [];
    for (const id of input.ids) {
      const safeId = id.replaceAll("'", "''");
      const exists = await prolog.query(`once(kb_entity('${safeId}', _, _))`);
      if (!exists.success) {
        errors.push(`Entity ${id} does not exist`);
        continue;
      }
      const dependents = await prolog.query(dependentRelationshipsGoal(id));
      if (!dependents.success) {
        errors.push(
          `Failed to inspect dependents for entity ${id}: ${dependents.error ?? "Query failed"}`,
        );
        continue;
      }
      if ((dependents.bindings.Dependents ?? "[]") !== "[]") {
        errors.push(
          `Cannot delete entity ${id}: has dependents (other entities reference it)`,
        );
        continue;
      }
      goals.push(buildEntityDeleteAuditGoal(await loadEntity(prolog, id)));
    }
    if (goals.length > 0) await saveAtomicMutation(prolog, goals, "delete");
    else await saveMutation(prolog, "delete");
    const payload = { deleted: goals.length, skipped: errors.length, errors };
    return {
      content: [
        {
          type: "text",
          text: `Deleted ${payload.deleted} entities. Skipped ${payload.skipped}.${errors.length > 0 ? ` Errors: ${errors.join("; ")}` : ""}`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Delete execution failed: ${message}`);
  }
}
