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

/**
 * Entity provenance (`origin`): who authored an entity and on what authority.
 *
 * `origin` is one structured property shared by every authored entity type.
 * It is a YAML mapping in Markdown frontmatter and symbol manifests, a JSON
 * object at the public operation boundary, and a JSON string inside Prolog
 * (like `proof_contract`).
 */

/** How an entity entered the knowledge base. */
// implements REQ-kibi-entity-origin
export const ENTITY_ORIGIN_KINDS = [
  "human",
  "agent",
  "migration",
  "import",
] as const;

export type EntityOriginKind = (typeof ENTITY_ORIGIN_KINDS)[number];

// implements REQ-kibi-entity-origin
export type EntityOrigin = {
  /** human | agent | migration | import */
  kind: EntityOriginKind;
  /** Source reference: URL, document path, ticket, commit or conversation id. */
  ref?: string;
  /** The person who approved the authored content. */
  approved_by?: string;
  /** ISO-8601 time the provenance was recorded. */
  recorded_at?: string;
};

/** `ref` recorded on entities backfilled by the schema v5 -> v6 migration. */
export const SCHEMA6_MIGRATION_ORIGIN_REF = "kibi migrate v5->v6";

const ISO_TIMESTAMP_PATTERN =
  "^\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?$";

/** JSON Schema shared by the entity schema and the kb_upsert input schema. */
// implements REQ-kibi-entity-origin
export const ENTITY_ORIGIN_SCHEMA = {
  type: "object",
  required: ["kind"],
  properties: {
    kind: {
      type: "string",
      enum: [...ENTITY_ORIGIN_KINDS],
      description:
        "Who authored the entity: human, agent, migration (backfilled by kibi migrate) or import.",
    },
    ref: {
      type: "string",
      minLength: 1,
      pattern: "\\S",
      description:
        "Source reference for the authored content: URL, document path, ticket, commit or conversation id.",
    },
    approved_by: {
      type: "string",
      minLength: 1,
      pattern: "\\S",
      description:
        "The person who reviewed and approved this entity's content. Distinct from the requirement-level approved_by of an exception.",
    },
    recorded_at: {
      type: "string",
      pattern: ISO_TIMESTAMP_PATTERN,
      description: "ISO-8601 time the provenance was recorded.",
    },
  },
  additionalProperties: false,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

/**
 * Normalize an authored origin mapping. YAML parsers turn an unquoted
 * `recorded_at` into a Date; it is stored as its ISO-8601 string. Returns the
 * reason when the mapping is not a valid origin.
 */
// implements REQ-kibi-entity-origin, REQ-007
export function normalizeEntityOrigin(
  value: unknown,
): { origin: EntityOrigin } | { error: string } {
  if (!isRecord(value)) {
    return { error: "origin must be a mapping with at least a kind" };
  }
  const allowed = new Set(["kind", "ref", "approved_by", "recorded_at"]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    return {
      error: `origin has unknown field(s) ${unknown.join(", ")}; allowed: kind, ref, approved_by, recorded_at`,
    };
  }
  const kind = value.kind;
  if (
    typeof kind !== "string" ||
    !(ENTITY_ORIGIN_KINDS as readonly string[]).includes(kind)
  ) {
    return {
      error: `origin.kind must be one of ${ENTITY_ORIGIN_KINDS.join(", ")}`,
    };
  }
  const origin: EntityOrigin = { kind: kind as EntityOriginKind };
  for (const field of ["ref", "approved_by"] as const) {
    if (value[field] === undefined) continue;
    const text = nonEmptyText(value[field]);
    if (text === undefined) {
      return { error: `origin.${field} must be a non-empty string` };
    }
    origin[field] = text;
  }
  if (value.recorded_at !== undefined) {
    const recordedAt =
      value.recorded_at instanceof Date
        ? Number.isNaN(value.recorded_at.getTime())
          ? undefined
          : value.recorded_at.toISOString()
        : nonEmptyText(value.recorded_at);
    if (
      recordedAt === undefined ||
      !new RegExp(ISO_TIMESTAMP_PATTERN).test(recordedAt)
    ) {
      return { error: "origin.recorded_at must be an ISO-8601 timestamp" };
    }
    origin.recorded_at = recordedAt;
  }
  return { origin };
}

/**
 * Read an origin from a compiled entity row: an object at the public
 * boundary, or the JSON string Prolog stores. Malformed values read as absent.
 */
// implements REQ-kibi-entity-origin
export function readEntityOrigin(value: unknown): EntityOrigin | null {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }
  const normalized = normalizeEntityOrigin(candidate);
  return "origin" in normalized ? normalized.origin : null;
}
