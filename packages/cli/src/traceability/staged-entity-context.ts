import type { ExtractionResult } from "../extractors/markdown.js";
import type { Violation } from "../public/check-types.js";
import {
  ENTITY_CONTEXT_MISSING_RULE,
  evaluateEntityContext,
  readAuthoredEntity,
} from "../public/operations/entity-context.js";

type TreeReader = Readonly<{
  baseTree: string;
  headTree: string;
  readGit(args: readonly string[]): Buffer;
}>;

function readTreeFile(
  snapshot: TreeReader,
  tree: string,
  file: string,
): string | null {
  try {
    return snapshot.readGit(["show", `${tree}:${file}`]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * The ids the schema 8 body-context migration acknowledged, from the KB
 * manifest of one tree: they stay exempt, so a migration commit passes.
 */
function acknowledgedIds(snapshot: TreeReader, tree: string): Set<string> {
  let parsed: { contextAcknowledged?: unknown } | null | undefined;
  try {
    // A missing manifest reads as the JSON text "null".
    parsed = JSON.parse(
      String(readTreeFile(snapshot, tree, ".kb/manifest.json")),
    );
  } catch {
    // A malformed manifest acknowledges nothing.
  }
  const listed = parsed?.contextAcknowledged;
  // Non-string members never equal an entity id, so they need no filter, and
  // new Set(undefined) is empty.
  return new Set(Array.isArray(listed) ? (listed as string[]) : undefined);
}

/** Ids another entity supersedes in the given compiled knowledge. */
function supersededIds(knowledge: readonly ExtractionResult[]): Set<string> {
  const superseded = new Set<string>();
  for (const result of knowledge)
    for (const relationship of result.relationships)
      if (relationship.type === "supersedes") superseded.add(relationship.to);
  return superseded;
}

/**
 * entity-context-missing findings on the entity documents a commit stages,
 * that the same documents did not have at the base tree. The rule reads only
 * the entity file, so no projection is needed. A document whose entity
 * already lacked context at the base (legacy debt, or one the migration
 * acknowledged) does not block the commit; full `kibi check` still reports
 * it.
 */
export function collectIntroducedEntityContextViolations(
  snapshot: TreeReader,
  stagedPaths: readonly string[],
  headKnowledge: readonly ExtractionResult[],
): Violation[] {
  const rules = new Set([ENTITY_CONTEXT_MISSING_RULE]);
  // evaluateEntityContext exempts the types that need no body context.
  const read = (tree: string) =>
    stagedPaths.flatMap((file) => {
      const content = readTreeFile(snapshot, tree, file);
      const entity =
        content === null ? null : readAuthoredEntity(content, file);
      return entity === null ? [] : [entity];
    });
  const head = evaluateEntityContext(
    read(snapshot.headTree),
    supersededIds(headKnowledge),
    rules,
    acknowledgedIds(snapshot, snapshot.headTree),
  );
  if (head.length === 0) return [];
  // Without the base tree's supersessions the base reports at least what it
  // had, so a finding the base already carried never blocks.
  const base = new Set(
    evaluateEntityContext(
      read(snapshot.baseTree),
      new Set(),
      rules,
      acknowledgedIds(snapshot, snapshot.baseTree),
    ).map((violation) => violation.entityId),
  );
  return head.filter((violation) => !base.has(violation.entityId));
}
