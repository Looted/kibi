import { escapeAtom } from "../../prolog/codec.js";
import { formatInvalidRelationshipError } from "./relationships.js";
import {
  buildPropertyList,
  buildRelationshipMetadata,
} from "./serialization.js";
import type { RelationshipInput } from "./types.js";

type TransactionInput = {
  readonly entity: Readonly<Record<string, unknown>>;
  readonly relationships: readonly RelationshipInput[];
  readonly skipContradictionCheck: boolean;
};

// implements REQ-kibi-operation-interface-parity
export function buildUpsertTransaction(input: TransactionInput): string {
  const id = String(input.entity.id);
  const type = String(input.entity.type);
  const goals = [
    `kb_assert_entity_no_audit(${type}, ${buildPropertyList(input.entity)})`,
    ...input.relationships.map(
      (relationship) =>
        `kb_assert_relationship_no_audit(${String(relationship.type)}, '${escapeAtom(String(relationship.from))}', '${escapeAtom(String(relationship.to))}', ${buildRelationshipMetadata(relationship)})`,
    ),
  ];
  if (type === "req" && !input.skipContradictionCheck) {
    goals.push(`check_req_contradiction('${escapeAtom(id)}')`);
  }
  return `rdf_transaction((${goals.join(", ")}))`;
}

// implements REQ-kibi-operation-interface-parity
export function formatUpsertError(entityId: string, raw?: string): string {
  if (!raw) return `Failed to upsert entity ${entityId}: Unknown error`;
  const invalidRelationship = formatInvalidRelationshipError(raw);
  if (invalidRelationship !== null) {
    return `Failed to upsert entity ${entityId}: ${invalidRelationship}`;
  }
  const contradiction = raw.match(/kb_contradiction\(\s*\[([^\]]+)\]\s*\)/);
  if (contradiction) {
    const details = contradiction[1] ?? "";
    const conflicts = [
      ...details.matchAll(
        /(?:'([^']+)'|"([^"\\]*(?:\\.[^"\\]*)*)")-'([^']+)'/g,
      ),
    ].map(
      (match) =>
        `  - Conflicts with ${String(match[3])}: ${String(match[1] ?? match[2])}`,
    );
    if (conflicts.length > 0) {
      return `Contradiction detected for requirement ${entityId}:\n${[...new Set(conflicts)].join("\n")}\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one.`;
    }
    return `Contradiction detected for entity ${entityId}: This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one.`;
  }
  if (raw.includes("rdf_transaction")) {
    return `Failed to upsert entity ${entityId}: Transaction failed`;
  }
  return `Failed to upsert entity ${entityId}: ${raw}`;
}
