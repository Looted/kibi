import { spawnSync } from "node:child_process";
import { escapeAtom, toPrologAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { parsePrologList } from "./serialization.js";
import type { RelationshipInput } from "./types.js";

export const RELATIONSHIP_TYPES = [
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
  "requires_rule",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "relates_to",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export function dependentRelationshipsGoal(entityId: string): string {
  return `findall([RelType,From], (member(RelType, [${RELATIONSHIP_TYPES.join(", ")}]), kb_relationship(RelType, From, '${escapeAtom(entityId)}')), Dependents)`;
}

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
  if (
    tuple.relType === "verified_by" &&
    tuple.fromType === "fact" &&
    tuple.toType === "test"
  ) {
    return "Facts are not directly verified by tests. Create or update a requirement and link REQ -> TEST with verified_by. Link the requirement to the fact with constrains or requires_property.";
  }
  if (
    tuple.relType === "validates" &&
    tuple.fromType === "test" &&
    tuple.toType === "fact"
  ) {
    return "Tests validate requirements or scenarios, not facts directly. Create or update a requirement and link TEST -> REQ with validates. Link the requirement to the fact with constrains or requires_property.";
  }
  if (tuple.relType === "verified_by")
    return "verified_by is only valid as req/scenario -> test.";
  if (tuple.relType === "validates")
    return "validates is only valid as test -> req/scenario.";
  return "Use a typed relationship from docs/entity-schema.md, or relates_to only as a reviewed escape hatch.";
}

export function formatInvalidRelationshipTuple(
  tuple: RelationshipTuple,
): string {
  return `Invalid relationship: ${tuple.relType} from ${tuple.fromType} to ${tuple.toType}. ${recipe(tuple)}`;
}

export function formatInvalidRelationshipError(raw: string): string | null {
  const match =
    raw.match(
      /Invalid relationship:\s*([^\s~]+) from ([^\s~]+) to ([^\s.\-]+)/,
    ) ??
    raw.match(
      /Invalid relationship:\s*~w from ~w to ~w-\[([^,\]]+),([^,\]]+),([^\]]+)\]/,
    );
  const relType = match?.[1];
  const fromType = match?.[2];
  const toType = match?.[3];
  return relType && fromType && toType
    ? formatInvalidRelationshipTuple({ relType, fromType, toType })
    : null;
}

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

type SupersedesHistory = "valid" | "reversed" | "unknown";

type SupersedesHistoryDeps = Readonly<{
  firstAdditionCommit: (workspaceRoot: string, source: string) => string | null;
  isAncestor: (
    workspaceRoot: string,
    ancestor: string,
    descendant: string,
  ) => boolean | null;
}>;

function trackedSource(source: string): boolean {
  return source.length > 0 && !source.includes("://");
}

export function firstGitAdditionCommit(
  workspaceRoot: string,
  source: string,
): string | null {
  if (!trackedSource(source)) return null;
  const result = spawnSync(
    "git",
    ["log", "--follow", "--diff-filter=A", "--format=%H", "--", source],
    { cwd: workspaceRoot, encoding: "utf8" },
  );
  if (result.status !== 0) return null;
  return (
    result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? null
  );
}

function gitIsAncestor(
  workspaceRoot: string,
  ancestor: string,
  descendant: string,
): boolean | null {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, descendant],
    { cwd: workspaceRoot, encoding: "utf8" },
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return null;
}

const DEFAULT_SUPERSEDES_HISTORY_DEPS: SupersedesHistoryDeps = {
  firstAdditionCommit: firstGitAdditionCommit,
  isAncestor: gitIsAncestor,
};

export function classifySupersedesHistory(
  workspaceRoot: string,
  sourceCommit: string | null,
  targetCommit: string | null,
  deps: Pick<
    SupersedesHistoryDeps,
    "isAncestor"
  > = DEFAULT_SUPERSEDES_HISTORY_DEPS,
): SupersedesHistory {
  if (sourceCommit === null || targetCommit === null) return "unknown";
  if (sourceCommit === targetCommit) return "valid";
  const targetBeforeSource = deps.isAncestor(
    workspaceRoot,
    targetCommit,
    sourceCommit,
  );
  if (targetBeforeSource === true) return "valid";
  const sourceBeforeTarget = deps.isAncestor(
    workspaceRoot,
    sourceCommit,
    targetCommit,
  );
  return sourceBeforeTarget === true ? "reversed" : "unknown";
}

// implements REQ-011
export async function validateSupersedesSourceHistory(
  prolog: PrologPort,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  workspaceRoot: string,
  deps: SupersedesHistoryDeps = DEFAULT_SUPERSEDES_HISTORY_DEPS,
): Promise<void> {
  const sourceId = typeof entity.id === "string" ? entity.id : "";
  const source = typeof entity.source === "string" ? entity.source : "";
  const sourceCommit = deps.firstAdditionCommit(workspaceRoot, source);
  for (const relationship of relationships) {
    if (relationship.type !== "supersedes") continue;
    const targetId = stringField(relationship, "to");
    const targetResult = await prolog.query(
      `once((kb_entity('${escapeAtom(targetId)}', _, _SupTargetProps), memberchk(source=_SupTargetRaw, _SupTargetProps), normalize_term_atom(_SupTargetRaw, TargetSource)))`,
    );
    const targetSource = targetResult.success
      ? String(targetResult.bindings.TargetSource ?? "").replace(
          /^['"]|['"]$/g,
          "",
        )
      : "";
    const targetCommit = deps.firstAdditionCommit(workspaceRoot, targetSource);
    if (
      classifySupersedesHistory(
        workspaceRoot,
        sourceCommit,
        targetCommit,
        deps,
      ) === "reversed"
    ) {
      throw new Error(
        `Invalid supersedes direction: tracked source history proves ${sourceId} predates ${targetId}. The replacement must point to the older requirement (new -> old).`,
      );
    }
  }
}

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
  if (endpointId === entity.id && typeof entity.type === "string")
    return entity.type;
  let result: Awaited<ReturnType<PrologPort["query"]>>;
  try {
    result = await prolog.query(
      `kb_entity('${escapeAtom(endpointId)}', Type, _)`,
    );
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
  if (!result.success) return null;
  const type = result.bindings.Type;
  return type ? type.replace(/^['"]|['"]$/g, "") : null;
}

export async function validateLiveRelationshipTargets(
  prolog: PrologPort,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
): Promise<void> {
  for (const relationship of relationships) {
    const fromType = await endpointType(
      prolog,
      entity,
      stringField(relationship, "from"),
    );
    const toType = await endpointType(
      prolog,
      entity,
      stringField(relationship, "to"),
    );
    if (fromType === null || toType === null) continue;
    const tuple = {
      relType: stringField(relationship, "type"),
      fromType,
      toType,
    };
    const result = await prolog.query(
      `once(kb:validate_relationship(${toPrologAtom(tuple.relType)}, ${toPrologAtom(tuple.fromType)}, ${toPrologAtom(tuple.toType)}))`,
    );
    if (!result.success) throw new Error(formatInvalidRelationshipTuple(tuple));
  }
}

export async function validateStrictLanePairing(
  prolog: PrologPort,
  relationships: readonly RelationshipInput[],
): Promise<void> {
  for (const relationship of relationships) {
    const target = stringField(relationship, "to");
    if (relationship.type === "requires_rule") {
      const result = await prolog.query(
        `once((kb_entity('${escapeAtom(target)}', fact, _RuleProps), memberchk(fact_kind=_RuleKind, _RuleProps), normalize_term_atom(_RuleKind, rule)))`,
      );
      if (!result.success) {
        throw new Error(
          `Relationship 'requires_rule' requires target '${target}' to be a fact_kind=rule fact.`,
        );
      }
      continue;
    }
    const wrongKind =
      relationship.type === "constrains"
        ? "property_value"
        : relationship.type === "requires_property"
          ? "subject"
          : null;
    if (wrongKind === null) continue;
    const result = await prolog.query(
      `once((kb_entity('${escapeAtom(target)}', fact, _SlpProps), memberchk(fact_kind=_SlpFK, _SlpProps), normalize_term_atom(_SlpFK, ${wrongKind})))`,
    );
    if (result.success) {
      const expected =
        relationship.type === "constrains" ? "subject" : "property_value";
      throw new Error(
        `Relationship '${String(relationship.type)}' requires target '${target}' to be a ${expected}, observation, or meta fact. ${wrongKind[0]?.toUpperCase()}${wrongKind.slice(1)} facts cannot be direct targets of ${String(relationship.type)} relationships.`,
      );
    }
  }
}

export async function existingRelationships(
  prolog: PrologPort,
  entityId: string,
): Promise<readonly RelationshipInput[]> {
  const existing: RelationshipInput[] = [];
  for (const type of RELATIONSHIP_TYPES) {
    const forward = await prolog.query(
      `findall(To, kb_relationship(${type}, '${escapeAtom(entityId)}', To), Targets)`,
    );
    for (const to of parsePrologList(forward.bindings.Targets ?? "[]"))
      existing.push({ type, from: entityId, to });
    const reverse = await prolog.query(
      `findall(From, kb_relationship(${type}, From, '${escapeAtom(entityId)}'), Sources)`,
    );
    for (const from of parsePrologList(reverse.bindings.Sources ?? "[]"))
      existing.push({ type, from, to: entityId });
  }
  return existing;
}
