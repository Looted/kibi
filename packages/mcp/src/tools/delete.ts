import type { PrologProcess } from "kibi-cli/prolog";

export interface DeleteArgs {
  ids: string[];
}

export interface DeleteResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    deleted: number;
    skipped: number;
    errors: string[];
  };
}

/**
 * Handle kb.delete tool calls
 * Prevents deletion of entities with dependents (referential integrity)
 */
export async function handleKbDelete(
  prolog: PrologProcess,
  args: DeleteArgs,
): Promise<DeleteResult> {
  const { ids } = args;

  if (!ids || ids.length === 0) {
    throw new Error("At least one ID required for delete");
  }

  let deleted = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for (const id of ids) {
      // Check if entity exists
      const checkGoal = `kb_entity('${id}', _, _)`;
      const checkResult = await prolog.query(checkGoal);

      if (!checkResult.success) {
        errors.push(`Entity ${id} does not exist`);
        skipped++;
        continue;
      }

      // Check for dependents (entities that reference this one)
      // Query each relationship type separately to avoid timeout with unbound Type
      const relTypes = [
        "depends_on",
        "verified_by",
        "validates",
        "specified_by",
        "relates_to",
        "guards",
        "publishes",
        "consumes",
      ];
      let hasDependents = false;

      for (const relType of relTypes) {
        const dependentsGoal = `findall(From, kb_relationship(${relType}, From, '${id}'), Dependents)`;
        const dependentsResult = await prolog.query(dependentsGoal);

        if (dependentsResult.success && dependentsResult.bindings.Dependents) {
          const dependentsStr = dependentsResult.bindings.Dependents;
          if (dependentsStr !== "[]") {
            errors.push(
              `Cannot delete entity ${id}: has dependents (other entities reference it via ${relType})`,
            );
            skipped++;
            hasDependents = true;
            break;
          }
        }
      }

      if (hasDependents) {
        continue;
      }

      // No dependents, safe to delete
      const deleteGoal = `kb_retract_entity('${id}')`;
      const deleteResult = await prolog.query(deleteGoal);

      if (!deleteResult.success) {
        errors.push(
          `Failed to delete entity ${id}: ${deleteResult.error || "Unknown error"}`,
        );
        skipped++;
      } else {
        deleted++;
      }
    }

    // Save KB to disk
    await prolog.query("kb_save");

    return {
      content: [
        {
          type: "text",
          text: `Deleted ${deleted} entities. Skipped ${skipped}. ${errors.length > 0 ? `Errors: ${errors.join("; ")}` : ""}`,
        },
      ],
      structuredContent: {
        deleted,
        skipped,
        errors,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Delete execution failed: ${message}`);
  }
}
