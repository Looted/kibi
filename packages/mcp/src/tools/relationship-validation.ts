import type { PrologProcess } from "kibi-cli/prolog";
import { escapeAtom, toPrologAtom } from "kibi-cli/prolog/codec";

type EntityPreview = Readonly<Record<string, unknown>>;
type RelationshipPreview = Readonly<Record<string, unknown>>;

interface EndpointResolutionInput {
  readonly prolog: PrologProcess;
  readonly entity: EntityPreview;
  readonly endpointId: string;
}

interface RelationshipTuple {
  readonly relType: string;
  readonly fromType: string;
  readonly toType: string;
}

function getStringField(record: RelationshipPreview, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Relationship ${field} must be a non-empty string`);
  }
  return value;
}

function normalizePrologAtom(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

async function resolveEndpointType(
  input: EndpointResolutionInput,
): Promise<string | null> {
  if (input.endpointId === input.entity.id) {
    const type = input.entity.type;
    if (typeof type === "string" && type.trim() !== "") {
      return type;
    }
  }

  let result: Awaited<ReturnType<PrologProcess["query"]>>;
  try {
    result = await input.prolog.query(
      `kb_entity('${escapeAtom(input.endpointId)}', Type, _)`,
    );
  } catch (error) {
    if (error instanceof Error) {
      return null;
    }
    throw error;
  }
  if (!result.success) {
    return null;
  }

  const rawType = result.bindings?.Type;
  if (typeof rawType !== "string" || rawType.trim() === "") {
    return null;
  }
  return normalizePrologAtom(rawType);
}

function relationshipRecipe(tuple: RelationshipTuple): string {
  if (
    tuple.relType === "verified_by" &&
    tuple.fromType === "fact" &&
    tuple.toType === "test"
  ) {
    return [
      "Facts are not directly verified by tests.",
      "Create or update a requirement and link REQ -> TEST with verified_by.",
      "Link the requirement to the fact with constrains or requires_property.",
    ].join(" ");
  }

  if (
    tuple.relType === "validates" &&
    tuple.fromType === "test" &&
    tuple.toType === "fact"
  ) {
    return [
      "Tests validate requirements or scenarios, not facts directly.",
      "Create or update a requirement and link TEST -> REQ with validates.",
      "Link the requirement to the fact with constrains or requires_property.",
    ].join(" ");
  }

  if (tuple.relType === "verified_by") {
    return "verified_by is only valid as req/scenario -> test.";
  }

  if (tuple.relType === "validates") {
    return "validates is only valid as test -> req/scenario.";
  }

  return "Use a typed relationship from docs/entity-schema.md, or relates_to only as a reviewed escape hatch.";
}

export function formatInvalidRelationshipTuple(
  tuple: RelationshipTuple,
): string {
  return `Invalid relationship: ${tuple.relType} from ${tuple.fromType} to ${tuple.toType}. ${relationshipRecipe(tuple)}`;
}

export function formatInvalidRelationshipError(
  rawError: string,
): string | null {
  const placeholderMatch = rawError.match(
    /Invalid relationship:\s*~w from ~w to ~w-\[([^,\]]+),([^,\]]+),([^\]]+)\]/,
  );
  if (placeholderMatch) {
    const [, relType, fromType, toType] = placeholderMatch;
    if (relType && fromType && toType) {
      return formatInvalidRelationshipTuple({ relType, fromType, toType });
    }
  }

  const readableMatch = rawError.match(
    /Invalid relationship:\s*([^\s]+) from ([^\s]+) to ([^\s.]+)/,
  );
  if (readableMatch) {
    const [, relType, fromType, toType] = readableMatch;
    if (relType && fromType && toType) {
      return formatInvalidRelationshipTuple({ relType, fromType, toType });
    }
  }

  return null;
}

export function formatRelationshipSourceMismatch(
  entityId: string,
  relationship: RelationshipPreview,
): string {
  const from = getStringField(relationship, "from");
  const to = getStringField(relationship, "to");
  return [
    `Relationship source must match the upserted entity ${entityId}; received from=${from}.`,
    `To add ${from} -> ${to}, upsert ${from} instead and include the relationship in that call.`,
  ].join(" ");
}

export async function validateLiveRelationshipTargets(
  prolog: PrologProcess,
  entity: EntityPreview,
  relationships: readonly RelationshipPreview[],
): Promise<void> {
  for (const relationship of relationships) {
    const fromType = await resolveEndpointType({
      prolog,
      entity,
      endpointId: getStringField(relationship, "from"),
    });
    const toType = await resolveEndpointType({
      prolog,
      entity,
      endpointId: getStringField(relationship, "to"),
    });

    if (fromType === null || toType === null) {
      continue;
    }

    const tuple = {
      relType: getStringField(relationship, "type"),
      fromType,
      toType,
    } satisfies RelationshipTuple;

    const result = await prolog.query(
      `once(kb:validate_relationship(${toPrologAtom(tuple.relType)}, ${toPrologAtom(tuple.fromType)}, ${toPrologAtom(tuple.toType)}))`,
    );
    if (!result.success) {
      throw new Error(formatInvalidRelationshipTuple(tuple));
    }
  }
}
