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
export function buildUpsertCommitGoal(input: TransactionInput): string {
  const type = String(input.entity.type);
  const relationships = input.relationships.map(
    (relationship) =>
      `rel(${String(relationship.type)}, '${escapeAtom(String(relationship.from))}', '${escapeAtom(String(relationship.to))}', ${buildRelationshipMetadata(relationship)})`,
  );
  return `kb_commit_upsert(${type}, ${buildPropertyList(input.entity)}, [${relationships.join(", ")}], ${input.skipContradictionCheck ? "true" : "false"}, ChangeKind)`;
}

// implements REQ-kibi-operation-interface-parity
export function formatUpsertError(entityId: string, raw?: string): string {
  if (!raw) return `Failed to upsert entity ${entityId}: Unknown error`;
  const stage = raw.match(/\(stage=([^)]+)\)/)?.[1];
  const stageSuffix = stage === undefined ? "" : ` (stage=${stage})`;
  const diagnosticFree = raw.replace(
    /^__KIBI_(?:STAGE|RUNTIME)__:[^\r\n]*\r?\n?/gm,
    "",
  );
  if (diagnosticFree.includes("stale_snapshot")) {
    return `Failed to upsert entity ${entityId}: KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)${stageSuffix}`;
  }
  if (
    diagnosticFree.includes("Audit journal is locked") ||
    diagnosticFree.includes("audit_log") ||
    diagnosticFree.includes("audit.log") ||
    diagnosticFree.includes("Resource temporarily unavailable")
  ) {
    return `Failed to upsert entity ${entityId}: Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying${stageSuffix}`;
  }
  const invalidRelationship = formatInvalidRelationshipError(diagnosticFree);
  if (invalidRelationship !== null) {
    return `Failed to upsert entity ${entityId}: ${invalidRelationship}${stageSuffix}`;
  }
  const contradiction = diagnosticFree.match(
    /kb_contradiction\(\s*\[([^\]]+)\]\s*\)/,
  );
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
      return `Contradiction detected for requirement ${entityId}:\n${[...new Set(conflicts)].join("\n")}\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one.${stageSuffix}`;
    }
    return `Contradiction detected for entity ${entityId}: This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one.${stageSuffix}`;
  }
  if (diagnosticFree.includes("rdf_transaction")) {
    return `Failed to upsert entity ${entityId}: Transaction failed${stageSuffix}`;
  }
  return `Failed to upsert entity ${entityId}: ${diagnosticFree || raw}`;
}
