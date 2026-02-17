import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import entitySchema from "@kibi/cli/src/schemas/entity.schema.json";
import relationshipSchema from "@kibi/cli/src/schemas/relationship.schema.json";
import Ajv from "ajv";

export interface UpsertArgs {
  entities: Array<Record<string, unknown>>;
  relationships?: Array<Record<string, unknown>>;
}

export interface UpsertResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    created: number;
    updated: number;
    relationships_created: number;
  };
}

const ajv = new Ajv({ strict: false });
const validateEntity = ajv.compile(entitySchema);
const validateRelationship = ajv.compile(relationshipSchema);

/**
 * Handle kb.upsert tool calls
 * Validates entities/relationships against JSON Schema before Prolog writes
 */
export async function handleKbUpsert(
  prolog: PrologProcess,
  args: UpsertArgs,
): Promise<UpsertResult> {
  const { entities, relationships = [] } = args;

  if (!entities || entities.length === 0) {
    throw new Error("At least one entity required for upsert");
  }

  // Validate all entities
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (!validateEntity(entity)) {
      const errors = validateEntity.errors || [];
      const errorMessages = errors
        .map((e) => `${e.instancePath || "root"}: ${e.message}`)
        .join("; ");
      throw new Error(
        `Entity validation failed at index ${i}: ${errorMessages}`,
      );
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
      const checkGoal = `kb_entity('${id}', _, _)`;
      const checkResult = await prolog.query(checkGoal);

      const isUpdate = checkResult.success;

      // Build property list for Prolog
      const props = buildPropertyList(entity);

      // Assert entity (upsert)
      if (isUpdate) {
        // Delete old version, then insert new
        const retractGoal = `kb_retract_entity('${id}')`;
        await prolog.query(retractGoal);
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

      const relGoal = `kb_assert_relationship(${relType}, '${from}', '${to}', ${metadata})`;
      const relResult = await prolog.query(relGoal);

      if (!relResult.success) {
        throw new Error(
          `Failed to assert relationship ${relType} from ${from} to ${to}: ${relResult.error || "Unknown error"}`,
        );
      }

      relationshipsCreated++;
    }

    return {
      content: [
        {
          type: "text",
          text: `Upserted ${entities.length} entities (${created} created, ${updated} updated) and ${relationshipsCreated} relationships.`,
        },
      ],
      structuredContent: {
        created,
        updated,
        relationships_created: relationshipsCreated,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Upsert execution failed: ${message}`);
  }
}

/**
 * Build Prolog property list from entity object
 * Returns simple Key=Value format without typed literals
 * Example output: "[id='test-1', title=\"Test\", status=active]"
 */
function buildPropertyList(entity: Record<string, unknown>): string {
  const pairs: string[] = [];

  const atomFields = new Set(["status", "owner", "priority", "severity"]);
  const stringFields = new Set([
    "id",
    "title",
    "created_at",
    "updated_at",
    "source",
    "text_ref",
  ]);

  for (const [key, value] of Object.entries(entity)) {
    if (key === "type") continue;

    let prologValue: string;

    if (key === "id" && typeof value === "string") {
      prologValue = `'${value}'`;
    } else if (Array.isArray(value)) {
      prologValue = JSON.stringify(value);
    } else if (atomFields.has(key) && typeof value === "string") {
      prologValue = value;
    } else if (stringFields.has(key) && typeof value === "string") {
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
