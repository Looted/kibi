import { escapeAtom, toPrologAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { parsePrologList } from "./serialization.js";
import type { RelationshipInput } from "./types.js";

const RELATIONSHIP_TYPES = [
  "depends_on",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "executable_for",
  "constrained_by",
  "constrains",
  "requires_property",
  "requires_predicate",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "relates_to",
] as const;

type RelationshipTuple = {
  readonly relType: string;
  readonly fromType: string;
  readonly toType: string;
};

function stringField(record: RelationshipInput, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Relationship ${field} must be a non-empty string`);
  }
  return value;
}

function recipe(tuple: RelationshipTuple): string {
  if (tuple.relType === "verified_by" && tuple.fromType === "fact" && tuple.toType === "test") {
    return "Facts are not directly verified by tests. Create or update a requirement and link REQ -> TEST with verified_by. Link the requirement to the fact with constrains or requires_property.";
  }
  if (tuple.relType === "validates" && tuple.fromType === "test" && tuple.toType === "fact") {
    return "Tests validate requirements or scenarios, not facts directly. Create or update a requirement and link TEST -> REQ with validates. Link the requirement to the fact with constrains or requires_property.";
  }
  if (tuple.relType === "verified_by") return "verified_by is only valid as req/scenario -> test.";
  if (tuple.relType === "validates") return "validates is only valid as test -> req/scenario.";
  return "Use a typed relationship from docs/entity-schema.md, or relates_to only as a reviewed escape hatch.";
}

// implements REQ-kibi-operation-interface-parity
export function formatInvalidRelationshipTuple(tuple: RelationshipTuple): string {
  return `Invalid relationship: ${tuple.relType} from ${tuple.fromType} to ${tuple.toType}. ${recipe(tuple)}`;
}

// implements REQ-kibi-operation-interface-parity
export function formatInvalidRelationshipError(raw: string): string | null {
  const match = raw.match(/Invalid relationship:\s*([^\s~]+) from ([^\s~]+) to ([^\s.\-]+)/)
    ?? raw.match(/Invalid relationship:\s*~w from ~w to ~w-\[([^,\]]+),([^,\]]+),([^\]]+)\]/);
  const relType = match?.[1];
  const fromType = match?.[2];
  const toType = match?.[3];
  return relType && fromType && toType
    ? formatInvalidRelationshipTuple({ relType, fromType, toType })
    : null;
}

// implements REQ-kibi-operation-interface-parity
export function validateRelationshipSources(
  entityId: string,
  relationships: readonly RelationshipInput[],
): void {
  for (const relationship of relationships) {
    if (relationship.from !== entityId) {
      throw new Error(formatRelationshipSourceMismatch(entityId, relationship));
    }
  }
}

// implements REQ-kibi-operation-interface-parity
export function formatRelationshipSourceMismatch(
  entityId: string,
  relationship: RelationshipInput,
): string {
  const from = stringField(relationship, "from");
  const to = stringField(relationship, "to");
  return `Relationship source must match the upserted entity ${entityId}; received from=${from}. To add ${from} -> ${to}, upsert ${from} instead and include the relationship in that call.`;
}

async function endpointType(
  prolog: PrologPort,
  entity: Readonly<Record<string, unknown>>,
  endpointId: string,
): Promise<string | null> {
  if (endpointId === entity.id && typeof entity.type === "string") return entity.type;
  let result: Awaited<ReturnType<PrologPort["query"]>>;
  try {
    result = await prolog.query(`kb_entity('${escapeAtom(endpointId)}', Type, _)`);
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
  const type = result.bindings.Type;
  return result.success && type ? type.replace(/^['"]|['"]$/g, "") : null;
}

// implements REQ-kibi-operation-interface-parity
export async function validateLiveRelationshipTargets(
  prolog: PrologPort,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
): Promise<void> {
  for (const relationship of relationships) {
    const fromType = await endpointType(prolog, entity, stringField(relationship, "from"));
    const toType = await endpointType(prolog, entity, stringField(relationship, "to"));
    if (fromType === null || toType === null) continue;
    const tuple = { relType: stringField(relationship, "type"), fromType, toType };
    const result = await prolog.query(
      `once(kb:validate_relationship(${toPrologAtom(tuple.relType)}, ${toPrologAtom(tuple.fromType)}, ${toPrologAtom(tuple.toType)}))`,
    );
    if (!result.success) throw new Error(formatInvalidRelationshipTuple(tuple));
  }
}

// implements REQ-kibi-operation-interface-parity
export async function validateStrictLanePairing(
  prolog: PrologPort,
  relationships: readonly RelationshipInput[],
): Promise<void> {
  for (const relationship of relationships) {
    const target = stringField(relationship, "to");
    const wrongKind = relationship.type === "constrains"
      ? "property_value"
      : relationship.type === "requires_property"
        ? "subject"
        : null;
    if (wrongKind === null) continue;
    const result = await prolog.query(
      `once((kb_entity('${escapeAtom(target)}', fact, _SlpProps), memberchk(fact_kind=_SlpFK, _SlpProps), normalize_term_atom(_SlpFK, ${wrongKind})))`,
    );
    if (result.success) {
      const expected = relationship.type === "constrains" ? "subject" : "property_value";
      throw new Error(`Relationship '${String(relationship.type)}' requires target '${target}' to be a ${expected}, observation, or meta fact. ${wrongKind[0]?.toUpperCase()}${wrongKind.slice(1)} facts cannot be direct targets of ${String(relationship.type)} relationships.`);
    }
  }
}

// implements REQ-kibi-operation-interface-parity
export async function existingRelationships(
  prolog: PrologPort,
  entityId: string,
): Promise<readonly RelationshipInput[]> {
  const existing: RelationshipInput[] = [];
  for (const type of RELATIONSHIP_TYPES) {
    const forward = await prolog.query(`findall(To, kb_relationship(${type}, '${escapeAtom(entityId)}', To), Targets)`);
    for (const to of parsePrologList(forward.bindings.Targets ?? "[]")) existing.push({ type, from: entityId, to });
    const reverse = await prolog.query(`findall(From, kb_relationship(${type}, From, '${escapeAtom(entityId)}'), Sources)`);
    for (const from of parsePrologList(reverse.bindings.Sources ?? "[]")) existing.push({ type, from, to: entityId });
  }
  return existing;
}
