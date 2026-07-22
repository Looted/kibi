import { escapeAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { buildPropertyList, buildRelationshipMetadata } from "./serialization.js";
import type { RelationshipInput } from "./types.js";

export async function recordEntityAudit(
  prolog: PrologPort,
  change: "created" | "updated",
  entity: Readonly<Record<string, unknown>>,
): Promise<void> {
  const result = await prolog.query(
    `kb_log_entity_upsert(${change}, ${String(entity.type)}, ${buildPropertyList(entity)})`,
  );
  if (!result.success) {
    throw new Error(`Failed to record audit entry for ${String(entity.id)}: ${result.error ?? "Unknown error"}`);
  }
}

export async function recordRelationshipAudits(
  prolog: PrologPort,
  relationships: readonly RelationshipInput[],
): Promise<void> {
  for (const relationship of relationships) {
    const from = String(relationship.from);
    const to = String(relationship.to);
    const result = await prolog.query(
      `kb_log_relationship_upsert(${String(relationship.type)}, '${escapeAtom(from)}', '${escapeAtom(to)}', ${buildRelationshipMetadata(relationship)})`,
    );
    if (!result.success) {
      throw new Error(`Failed to record relationship audit entry ${from}->${to}: ${result.error ?? "Unknown error"}`);
    }
  }
}

export function buildEntityDeleteAuditGoal(
  entity: Readonly<Record<string, unknown>>,
): string {
  const auditEntity = Object.fromEntries(
    ["id", "title", "source", "text_ref"].flatMap((key) =>
      typeof entity[key] === "string" ? [[key, entity[key]]] : [],
    ),
  );
  return `kb_retract_entity('${escapeAtom(String(entity.id))}', ${String(entity.type)}, ${buildPropertyList(auditEntity)})`;
}
