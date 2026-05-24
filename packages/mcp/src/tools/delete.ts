/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import type { PrologProcess } from "kibi-cli/prolog";
import { escapeAtom, parseEntityFromList, parseListOfLists } from "kibi-cli/prolog/codec";
import { writeBriefPendingMarker } from "../utils/brief-marker.js";

type DeleteRelationship = {
  from: string;
  to: string;
  type: string;
};

export interface DeleteArgs {
  ids: string[];
  _requestId?: string;
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
export async function handleKbDelete( // implements REQ-002, REQ-011
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
  const pendingEntityIds: string[] = [];
  const pendingRelationships: DeleteRelationship[] = [];

  try {
    for (const id of ids) {
      const safeId = escapeAtom(id);

      // Check if entity exists
      const checkGoal = `once(kb_entity('${safeId}', _, _))`;
      const checkResult = await prolog.query(checkGoal);

      if (!checkResult.success) {
        errors.push(`Entity ${id} does not exist`);
        skipped++;
        continue;
      }

      // Check for dependents (entities that reference this one)
      const dependentsGoal = `findall([RelType,From], (member(RelType, [depends_on, verified_by, validates, specified_by, relates_to, guards, publishes, consumes]), kb_relationship(RelType, From, '${safeId}')), Dependents)`;
      const dependentsResult = await prolog.query(dependentsGoal);
      if (!dependentsResult.success) {
        errors.push(
          `Failed to inspect dependents for entity ${id}: ${dependentsResult.error ?? "Query failed"}`,
        );
        skipped++;
        continue;
      }
      const hasDependents =
        dependentsResult.bindings.Dependents !== undefined &&
        dependentsResult.bindings.Dependents !== "[]";

      if (hasDependents) {
        errors.push(
          `Cannot delete entity ${id}: has dependents (other entities reference it)`,
        );
        skipped++;
      }

      if (hasDependents) {
        continue;
      }

      // No dependents, safe to delete
      const entityMetadata = await loadEntityMetadataForDelete(prolog, id, safeId);
      const relationships = await loadOutgoingRelationshipsForDelete(prolog, safeId);
      const deleteGoal = buildDeleteGoal(safeId, entityMetadata);
      const deleteResult = await prolog.query(deleteGoal);

      if (!deleteResult.success) {
        errors.push(
          `Failed to delete entity ${id}: ${deleteResult.error || "Unknown error"}`,
        );
        skipped++;
      } else {
        deleted++;
        pendingEntityIds.push(id);
        pendingRelationships.push(...relationships);
      }
    }

    // Save KB to disk
    const saveResult = await prolog.query("kb_save");
    if (!saveResult.success) {
      throw new Error(
        `Failed to save KB after delete: ${saveResult.error || "Unknown error"}`,
      );
    }

    if (pendingEntityIds.length > 0 || pendingRelationships.length > 0) {
      writeBriefPendingMarker({
        ...(args._requestId ? { sessionId: args._requestId } : {}),
        operation: "delete",
        entityIds: pendingEntityIds,
        relationships: pendingRelationships,
      });
    }
    prolog.invalidateCache();

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

type DeleteEntityMetadata = {
  type: string;
  props: Record<string, unknown>;
};

async function loadEntityMetadataForDelete(
  prolog: PrologProcess,
  id: string,
  safeId: string,
): Promise<DeleteEntityMetadata> {
  const result = await prolog.query(
    `findall(['${safeId}',Type,Props], kb_entity('${safeId}', Type, Props), Results)`,
  );

  if (!result.success) {
    throw new Error(
      `Failed to load metadata for entity ${id}: ${result.error || "Unknown error"}`,
    );
  }

  const rows = result.bindings.Results ? parseListOfLists(result.bindings.Results) : [];
  if (rows.length === 0) {
    throw new Error(`Failed to load metadata for entity ${id}: Entity not found`);
  }

  const entity = parseEntityFromList(rows[0] ?? []);
  const type = String(entity.type ?? "unknown");
  const { id: _entityId, type: _entityType, ...props } = entity;

  return { type, props };
}

async function loadOutgoingRelationshipsForDelete(
  prolog: PrologProcess,
  safeId: string,
): Promise<DeleteRelationship[]> {
  const result = await prolog.query(
    `findall([Type,'${safeId}',To], (member(Type, [depends_on, verified_by, validates, specified_by, relates_to, guards, publishes, consumes, implements, covered_by, executable_for, constrains, requires_property, supersedes, constrained_by]), kb_relationship(Type, '${safeId}', To)), Relationships)`,
  );

  if (!result.success) {
    throw new Error(
      `Failed to load outgoing relationships for entity ${safeId}: ${result.error || "Unknown error"}`,
    );
  }

  const rows = result.bindings.Relationships
    ? parseListOfLists(result.bindings.Relationships)
    : [];

  return rows.flatMap((row) => {
    const type = row[0];
    const from = row[1];
    const to = row[2];
    if (type === undefined || from === undefined || to === undefined) {
      return [];
    }
    return [
      {
        type: normalizeDeleteRelationshipValue(type),
        from: normalizeDeleteRelationshipValue(from),
        to: normalizeDeleteRelationshipValue(to),
      },
    ];
  });
}

function normalizeDeleteRelationshipValue(value: unknown): string {
  const normalized = String(value);
  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

function buildDeleteGoal(safeId: string, metadata: DeleteEntityMetadata): string {
  const auditProps = [`id='${safeId}'`, ...serializeDeleteProps(metadata.props)];
  return `kb_retract_entity('${safeId}', ${metadata.type}, [${auditProps.join(", ")}])`;
}

function serializeDeleteProps(props: Record<string, unknown>): string[] {
  const orderedKeys = ["title", "source", "text_ref"];
  return orderedKeys.flatMap((key) => {
    const value = props[key];
    if (typeof value !== "string") {
      return [];
    }

    return `${key}=${JSON.stringify(value)}`;
  });
}
