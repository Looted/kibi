import { spawnSync } from "node:child_process";
import { KbRejection } from "../../cli-errors.js";
import { escapeAtom, toPrologAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { parsePrologList } from "./serialization.js";
import type { RelationshipInput, StagedUpsertState } from "./types.js";

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
  "restates",
  "assumes",
  "exempts",
  "relates_to",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export function wrongKindRelationshipError(
  type: string,
  target: string,
  wrongKind: string,
): Error {
  const expected = type === "constrains" ? "subject" : "property_value";
  return new Error(
    `Relationship '${type}' requires target '${target}' to be a ${expected}, observation, or meta fact. ${wrongKind[0]?.toUpperCase()}${wrongKind.slice(1)} facts cannot be direct targets of ${type} relationships.`,
  );
}

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
    throw new KbRejection(
      "VALIDATION_FAILED",
      `Relationship ${field} must be a non-empty string`,
    );
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
  // Every group of either pattern is required and non-empty.
  if (match === null) return null;
  const [, relType, fromType, toType] = match as unknown as [
    string,
    string,
    string,
    string,
  ];
  return formatInvalidRelationshipTuple({ relType, fromType, toType });
}

export function validateRelationshipSources(
  entityId: string,
  relationships: readonly RelationshipInput[],
): void {
  for (const relationship of relationships) {
    if (relationship.from !== entityId) {
      throw new KbRejection(
        "RELATIONSHIP_SOURCE_MISMATCH",
        formatRelationshipSourceMismatch(entityId, relationship),
      );
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
  // rationale: git itself finds no addition commit for an empty or URL
  // pathspec; this guard only saves spawning it.
  // Stryker disable next-line ConditionalExpression,LogicalOperator,EqualityOperator
  return source.length > 0 && !source.includes("://");
}

export function firstGitAdditionCommit(
  workspaceRoot: string,
  source: string,
): string | null {
  // rationale: see trackedSource; git answers null for these sources too.
  // Stryker disable next-line ConditionalExpression
  if (!trackedSource(source)) return null;
  const result = spawnSync(
    "git",
    ["log", "--follow", "--diff-filter=A", "--format=%H", "--", source],
    { cwd: workspaceRoot, encoding: "utf8" },
  );
  // rationale: a failing git log prints nothing on stdout, so the rest reads
  // null as well; the guard keeps a missing stdout from being split.
  // Stryker disable next-line ConditionalExpression
  if (result.status !== 0) return null;
  // git log lists the newest addition first; one hash per line.
  return result.stdout.split("\n").filter(Boolean).at(-1) ?? null;
}

function gitIsAncestor(
  workspaceRoot: string,
  ancestor: string,
  descendant: string,
): boolean | null {
  // Only a proven ancestry counts: "not an ancestor" (status 1) and a git
  // failure decide the same.
  return (
    spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: workspaceRoot,
    }).status === 0
  );
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

/** The source of a supersedes target: planned, indexed or stored; "" if none. */
async function supersededSource(
  prolog: PrologPort,
  targetId: string,
  staged: StagedUpsertState | undefined,
): Promise<string> {
  const planned = staged?.entities.get(targetId);
  if (planned !== undefined)
    return typeof planned.source === "string" ? planned.source : "";
  if (prolog.queryEntities) {
    const targetPage = await prolog.queryEntities({
      id: targetId,
      limit: 1,
      offset: 0,
    });
    const indexedSource = targetPage.entities[0]?.source;
    return typeof indexedSource === "string" ? indexedSource : "";
  }
  const targetResult = await prolog.query(
    `once((kb_entity('${escapeAtom(targetId)}', _, _SupTargetProps), memberchk(source=_SupTargetRaw, _SupTargetProps), normalize_term_atom(_SupTargetRaw, TargetSource)))`,
  );
  const bound = targetResult.bindings.TargetSource;
  return targetResult.success && bound !== undefined
    ? bound.replace(/^['"]|['"]$/g, "")
    : "";
}

// implements REQ-011
export async function validateSupersedesSourceHistory(
  prolog: PrologPort,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  workspaceRoot: string,
  deps: SupersedesHistoryDeps = DEFAULT_SUPERSEDES_HISTORY_DEPS,
  staged?: StagedUpsertState,
): Promise<void> {
  const sourceId = typeof entity.id === "string" ? entity.id : "";
  const source = typeof entity.source === "string" ? entity.source : "";
  const sourceCommit = deps.firstAdditionCommit(workspaceRoot, source);
  for (const relationship of relationships) {
    if (relationship.type !== "supersedes") continue;
    const targetId = stringField(relationship, "to");
    const targetSource = await supersededSource(prolog, targetId, staged);
    const targetCommit = deps.firstAdditionCommit(workspaceRoot, targetSource);
    if (
      classifySupersedesHistory(
        workspaceRoot,
        sourceCommit,
        targetCommit,
        deps,
      ) === "reversed"
    ) {
      throw new KbRejection(
        "RELATIONSHIP_VALIDATION_FAILED",
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
  staged?: StagedUpsertState,
): Promise<string | null> {
  if (endpointId === entity.id && typeof entity.type === "string")
    return entity.type;
  const planned = staged?.entities.get(endpointId);
  if (planned !== undefined && typeof planned.type === "string")
    return planned.type;
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
  staged?: StagedUpsertState,
): Promise<void> {
  for (const relationship of relationships) {
    const fromType = await endpointType(
      prolog,
      entity,
      stringField(relationship, "from"),
      staged,
    );
    const toType = await endpointType(
      prolog,
      entity,
      stringField(relationship, "to"),
      staged,
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
    if (!result.success)
      throw new KbRejection(
        "INVALID_RELATIONSHIP",
        formatInvalidRelationshipTuple(tuple),
      );
  }
}

function plannedFactKind(planned: Readonly<Record<string, unknown>>): unknown {
  // A kind is compared with fixed names, so a non-string one matches none.
  return planned.type === "fact" ? planned.fact_kind : undefined;
}

export async function validateStrictLanePairing(
  prolog: PrologPort,
  relationships: readonly RelationshipInput[],
  staged?: StagedUpsertState,
): Promise<void> {
  for (const relationship of relationships) {
    const target = stringField(relationship, "to");
    // A target an earlier plan step writes is judged by that write.
    const planned = staged?.entities.get(target);
    if (relationship.type === "requires_rule") {
      const isRule =
        planned !== undefined
          ? plannedFactKind(planned) === "rule"
          : (
              await prolog.query(
                `once((kb_entity('${escapeAtom(target)}', fact, _RuleProps), memberchk(fact_kind=_RuleKind, _RuleProps), normalize_term_atom(_RuleKind, rule)))`,
              )
            ).success;
      if (!isRule) {
        throw new KbRejection(
          "RELATIONSHIP_VALIDATION_FAILED",
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
    const isWrongKind =
      planned !== undefined
        ? plannedFactKind(planned) === wrongKind
        : (
            await prolog.query(
              `once((kb_entity('${escapeAtom(target)}', fact, _SlpProps), memberchk(fact_kind=_SlpFK, _SlpProps), normalize_term_atom(_SlpFK, ${wrongKind})))`,
            )
          ).success;
    if (isWrongKind)
      throw wrongKindRelationshipError(
        String(relationship.type),
        target,
        wrongKind,
      );
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
    // An unbound list reads as "undefined", which holds no items.
    for (const to of parsePrologList(String(forward.bindings.Targets)))
      existing.push({ type, from: entityId, to });
    const reverse = await prolog.query(
      `findall(From, kb_relationship(${type}, From, '${escapeAtom(entityId)}'), Sources)`,
    );
    for (const from of parsePrologList(String(reverse.bindings.Sources)))
      existing.push({ type, from, to: entityId });
  }
  return existing;
}
