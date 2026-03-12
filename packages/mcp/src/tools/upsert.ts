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

import Ajv from "ajv";
/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
*/
import type { PrologProcess } from "kibi-cli/prolog";
import entitySchema from "kibi-cli/schemas/entity";
import relationshipSchema from "kibi-cli/schemas/relationship";
import { refreshCoordinatesForSymbolId } from "./symbols.js";
function escapeAtom(value: string): string {
  return value.replace(/'/g, "\\'");
}

function toPrologAtom(value: string): string {
  const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
  return simplePrologAtom.test(value)
    ? value
    : `'${value.replace(/'/g, "''")}'`;
}

export interface UpsertArgs {
  /** Entity type (req, scenario, test, adr, flag, event, symbol, fact) */
  type: string;
  /** Unique entity identifier */
  id: string;
  /** Key-value pairs to store as RDF properties (title, status, source, tags, etc.) */
  properties: Record<string, unknown>;
  /** Optional relationships to create alongside this entity */
  relationships?: Array<Record<string, unknown>>;
}

export interface UpsertResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    created: number;
    updated: number;
    relationships_created: number;
    contradiction_pairs_detected?: number;
  };
}

const ajv = new Ajv({ strict: false });
const validateEntity = ajv.compile(entitySchema);
const validateRelationship = ajv.compile(relationshipSchema);

/**
 * Handle kb.upsert tool calls
 * Accepts { type, id, properties } — the flat format matching the tool schema.
 * Validates the assembled entity against JSON Schema before Prolog writes.
 */
export async function handleKbUpsert(
  prolog: PrologProcess,
  args: UpsertArgs,
): Promise<UpsertResult> {
  const { type, id, properties, relationships = [] } = args;

  if (!type || !id) {
    throw new Error("'type' and 'id' are required for upsert");
  }

  // Assemble full entity from flat args + properties
  const entity: Record<string, unknown> = {
    id,
    type,
    ...properties,
  };

  // Fill in defaults for optional required fields
  if (!entity.created_at) {
    entity.created_at = new Date().toISOString();
  }
  if (!entity.updated_at) {
    entity.updated_at = new Date().toISOString();
  }
  if (!entity.source) {
    entity.source = "mcp://kibi/upsert";
  }

  const entities = [entity];

  // Validate all entities
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];

    if (!validateEntity(ent)) {
      const errors = validateEntity.errors || [];
      const errorMessages = errors
        .map((e) => `${e.instancePath || "root"}: ${e.message}`)
        .join("; ");
      throw new Error(`Entity validation failed: ${errorMessages}`);
    }
  }

  // Validate all relationships
  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];
    if (!validateRelationship(rel)) {
      const errors = validateRelationship.errors || [];
      const errorMessages = errors
        .map((e) => `${e.instancePath || "root"}: ${e.message}`)
        .join("; ");
      throw new Error(
        `Relationship validation failed at index ${i}: ${errorMessages}`,
      );
    }
  }

  let created = 0;
  let updated = 0;
  let relationshipsCreated = 0;

  try {
    // Process entities
    for (const entity of entities) {
      const id = entity.id as string;
      const type = entity.type as string;

      // Check if entity exists
      const checkGoal = `once(kb_entity('${escapeAtom(id)}', _, _))`;
      const checkResult = await prolog.query(checkGoal);

      const isUpdate = checkResult.success;

      // Build property list for Prolog
      const props = buildPropertyList(entity);

      // Assert entity (upsert)
      if (isUpdate) {
        // Update counter only. kb_assert_entity implements upsert semantics in Prolog.
        updated++;
      } else {
        created++;
      }

      const assertGoal = `kb_assert_entity(${type}, ${props})`;
      const assertResult = await prolog.query(assertGoal);

      if (!assertResult.success) {
        throw new Error(
          `Failed to assert entity ${id}: ${assertResult.error || "Unknown error"}`,
        );
      }
    }

    // Process relationships
    for (const rel of relationships) {
      const relType = rel.type as string;
      const from = rel.from as string;
      const to = rel.to as string;

      // Build metadata
      const metadata = buildRelationshipMetadata(rel);

      const relGoal = `kb_assert_relationship(${relType}, '${escapeAtom(from)}', '${escapeAtom(to)}', ${metadata})`;
      const relResult = await prolog.query(relGoal);

      if (!relResult.success) {
        throw new Error(
          `Failed to assert relationship ${relType} from ${from} to ${to}: ${relResult.error || "Unknown error"}`,
        );
      }

      relationshipsCreated++;
    }

    // Save KB to disk
    await prolog.query("kb_save");

    let contradictionPairsDetected: number | undefined;
    if (type === "req") {
      contradictionPairsDetected = await detectContradictionPairs(prolog, id);
    }

    if (type === "symbol") {
      try {
        await refreshCoordinatesForSymbolId(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (process.env.KIBI_MCP_DEBUG) {
          console.warn(
            `[KIBI-MCP] Symbol coordinate auto-refresh failed for ${id}: ${message}`,
          );
        }
      }
    }

    return {
      content: [
        {
          type: "text",
          text:
            contradictionPairsDetected && contradictionPairsDetected > 0
              ? `Upserted ${id} (${created > 0 ? "created" : "updated"}) with ${relationshipsCreated} relationship(s). Contradiction probe detected ${contradictionPairsDetected} potential conflict pair(s).`
              : `Upserted ${id} (${created > 0 ? "created" : "updated"}) with ${relationshipsCreated} relationship(s).`,
        },
      ],
      structuredContent: {
        created,
        updated,
        relationships_created: relationshipsCreated,
        contradiction_pairs_detected: contradictionPairsDetected,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Upsert execution failed: ${message}`);
  }
}

async function detectContradictionPairs(
  prolog: PrologProcess,
  reqId: string,
): Promise<number> {
  const escaped = escapeAtom(reqId);
  const goal = `aggregate_all(count, (contradicting_reqs(A, B, _), (A = '${escaped}' ; B = '${escaped}' ; A = 'file:///${escaped}' ; B = 'file:///${escaped}')), Count)`;
  const result = await prolog.query(goal);
  if (!result.success) {
    return 0;
  }
  const raw = result.bindings.Count;
  const count = Number(raw);
  return Number.isFinite(count) ? count : 0;
}

/**
 * Build Prolog property list from entity object
 * Returns simple Key=Value format without typed literals
 * Example output: "[id='test-1', title=\"Test\", status=active]"
 */
function buildPropertyList(entity: Record<string, unknown>): string {
  const pairs: string[] = [];

  // Defined internally to ensure thread safety and avoid initialization order issues.
  // Using simple arrays instead of Sets is performant enough for small lists and avoids Set allocation overhead.
  const ATOM_FIELDS = ["status", "owner", "priority", "severity"];
  const STRING_FIELDS = [
    "id",
    "title",
    "created_at",
    "updated_at",
    "source",
    "text_ref",
  ];

  for (const [key, value] of Object.entries(entity)) {
    if (key === "type") continue;

    let prologValue: string;

    if (key === "id" && typeof value === "string") {
      prologValue = `'${value.replace(/'/g, "''")}'`;
    } else if (Array.isArray(value)) {
      prologValue = JSON.stringify(value);
    } else if (ATOM_FIELDS.includes(key) && typeof value === "string") {
      prologValue = toPrologAtom(value);
    } else if (STRING_FIELDS.includes(key) && typeof value === "string") {
      prologValue = `"${escapeQuotes(value)}"`;
    } else if (typeof value === "string") {
      prologValue = `"${escapeQuotes(value)}"`;
    } else if (typeof value === "number") {
      prologValue = String(value);
    } else if (typeof value === "boolean") {
      prologValue = value ? "true" : "false";
    } else {
      prologValue = `"${escapeQuotes(String(value))}"`;
    }

    pairs.push(`${key}=${prologValue}`);
  }

  return `[${pairs.join(", ")}]`;
}

/**
 * Build Prolog metadata list for relationship
 * Returns simple Key=Value format without typed literals
 */
function buildRelationshipMetadata(rel: Record<string, unknown>): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(rel)) {
    if (key === "type" || key === "from" || key === "to") continue;

    let prologValue: string;

    if (typeof value === "string") {
      prologValue = `"${escapeQuotes(value)}"`;
    } else if (typeof value === "number") {
      prologValue = String(value);
    } else {
      prologValue = `"${escapeQuotes(String(value))}"`;
    }

    pairs.push(`${key}=${prologValue}`);
  }

  return `[${pairs.join(", ")}]`;
}

/**
 * Escape double quotes in strings for Prolog
 */
function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"');
}
