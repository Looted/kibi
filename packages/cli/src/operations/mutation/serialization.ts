import { toPrologAtom, toPrologString } from "../../prolog/codec.js";
import type { RelationshipInput } from "./types.js";

const ATOM_FIELDS = [
  "status",
  "owner",
  "priority",
  "severity",
  "symbol_role",
  "granularity_reason",
  "verification_scope",
  "verification_perspective",
  "fact_kind",
  "operator",
  "value_type",
  "polarity",
] as const;

const STRING_FIELDS = [
  "id",
  "title",
  "created_at",
  "updated_at",
  "source",
  "text_ref",
] as const;

function serializeValue(key: string, value: unknown): string {
  if (key === "id" && typeof value === "string") {
    return `'${value.replaceAll("'", "''")}'`;
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  if (key === "rule_ir" || key === "semantic_inventory") {
    return toPrologString(JSON.stringify(value));
  }
  if (typeof value === "string") {
    return ATOM_FIELDS.includes(key as (typeof ATOM_FIELDS)[number])
      ? toPrologAtom(value)
      : toPrologString(value);
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return toPrologString(String(value));
}

// implements REQ-kibi-operation-interface-parity
export function buildPropertyList(
  entity: Readonly<Record<string, unknown>>,
): string {
  const pairs = Object.entries(entity).flatMap(([key, value]) => {
    if (key === "type" || value === undefined || value === null) return [];
    return [`${key}=${serializeValue(key, value)}`];
  });
  return `[${pairs.join(", ")}]`;
}

// implements REQ-kibi-operation-interface-parity
export function buildRelationshipMetadata(rel: RelationshipInput): string {
  const pairs = Object.entries(rel).flatMap(([key, value]) => {
    if (key === "type" || key === "from" || key === "to") return [];
    if (typeof value === "number") return [`${key}=${String(value)}`];
    return [`${key}=${toPrologString(String(value))}`];
  });
  return `[${pairs.join(", ")}]`;
}

// implements REQ-kibi-operation-interface-parity
export function parsePrologList(list: string): string[] {
  const match = list.trim().match(/^\[(.*)\]$/s);
  if (!match?.[1]) return [];
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of match[1]) {
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (char === "," && depth === 0) {
      items.push(current.trim().replace(/^'|'$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current.trim().replace(/^'|'$/g, ""));
  return items;
}
