import { execFileSync } from "node:child_process";
import path from "node:path";
import { discoverSourceFiles } from "../../commands/sync/discovery.js";
import { processExtractions } from "../../commands/sync/extraction.js";
import type { ExtractedRelationship } from "../../extractors/markdown.js";
import { RELATIONSHIP_TYPES } from "../../operations/mutation/relationships.js";
import { parseListOfLists, parsePrologValue } from "../../prolog/codec.js";
import { readAllShards } from "../../relationships/shards.js";
import type { Violation } from "../check-types.js";
import type { PrologPort } from "./runtime-types.js";

export type RelationshipParityRecord = Readonly<{
  type: string;
  from: string;
  to: string;
  source?: string;
  ownership?: "authored" | "runtime";
}>;

function relationshipKey(
  relationship: Pick<RelationshipParityRecord, "type" | "from" | "to">,
): string {
  return `${relationship.type}\u0000${relationship.from}\u0000${relationship.to}`;
}

function relationshipLabel(relationship: RelationshipParityRecord): string {
  return `${relationship.type} ${relationship.from}->${relationship.to}`;
}

// implements REQ-kibi-source-relationship-parity
export function compareRelationshipParity(
  authored: readonly RelationshipParityRecord[],
  compiled: readonly RelationshipParityRecord[],
): Violation[] {
  const authoredByKey = new Map<string, RelationshipParityRecord>();
  const compiledByKey = new Map<string, RelationshipParityRecord>();
  for (const relationship of authored) {
    authoredByKey.set(relationshipKey(relationship), relationship);
  }
  for (const relationship of compiled) {
    compiledByKey.set(relationshipKey(relationship), relationship);
  }

  const violations: Violation[] = [];
  for (const [key, relationship] of authoredByKey) {
    if (compiledByKey.has(key)) continue;
    violations.push({
      rule: "source-relationship-parity",
      entityId: relationship.from,
      description: `Authored relationship is missing from the compiled KB: ${relationshipLabel(relationship)}`,
      suggestion:
        "Run kibi sync after resolving semantic/source errors; do not delete authored links merely to make the compiled snapshot pass.",
      ...(relationship.source !== undefined
        ? { source: relationship.source }
        : {}),
      evidence: {
        direction: "authored_to_compiled",
        relationship: {
          type: relationship.type,
          from: relationship.from,
          to: relationship.to,
        },
      },
    });
  }
  for (const [key, relationship] of compiledByKey) {
    if (authoredByKey.has(key)) continue;
    if (relationship.ownership === "runtime") continue;
    violations.push({
      rule: "source-relationship-parity",
      entityId: relationship.from,
      description: `Compiled relationship has no authored Markdown or relationship-shard source: ${relationshipLabel(relationship)}`,
      suggestion:
        "Restore the canonical authored relationship through kb_upsert, or remove the stale compiled edge through kb_delete after dependency review.",
      evidence: {
        direction: "compiled_to_authored",
        relationship: {
          type: relationship.type,
          from: relationship.from,
          to: relationship.to,
        },
      },
    });
  }
  return violations.sort((left, right) =>
    `${left.entityId}\u0000${left.description}`.localeCompare(
      `${right.entityId}\u0000${right.description}`,
    ),
  );
}

function isGitWorkspace(workspaceRoot: string): boolean {
  try {
    return (
      execFileSync(
        "git",
        ["-C", workspaceRoot, "rev-parse", "--is-inside-work-tree"],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      ).trim() === "true"
    );
  } catch {
    return false;
  }
}

async function compiledRelationships(
  prolog: PrologPort,
): Promise<RelationshipParityRecord[]> {
  const relationships: RelationshipParityRecord[] = [];
  for (const type of RELATIONSHIP_TYPES) {
    const result = await prolog.query(
      `findall([From,To,Source], (kb_relationship(${type}, From, To), (kb_entity(From, _, Props), memberchk(source=RawSource, Props) -> normalize_term_atom(RawSource, Source) ; Source='')), Rows)`,
    );
    if (!result.success) {
      throw new Error(
        `Unable to inspect compiled ${type} relationships: ${result.error ?? "query failed"}`,
      );
    }
    relationships.push(
      ...parseCompiledRelationshipRows(type, result.bindings.Rows ?? "[]"),
    );
  }
  return relationships;
}

export function parseCompiledRelationshipRows(
  type: string,
  rows: string,
): RelationshipParityRecord[] {
  return parseListOfLists(rows).flatMap(([rawFrom, rawTo, rawSource]) => {
    const from = String(parsePrologValue(rawFrom ?? ""));
    const to = String(parsePrologValue(rawTo ?? ""));
    const source = String(parsePrologValue(rawSource ?? ""));
    if (!from || !to) return [];
    return [
      {
        type,
        from,
        to,
        ...(source ? { source } : {}),
        ownership:
          source && /^[a-z][a-z0-9+.-]*:\/\//i.test(source)
            ? "runtime"
            : "authored",
      },
    ];
  });
}

function authoredRelationship(
  relationship: ExtractedRelationship,
  source: string,
): RelationshipParityRecord {
  return {
    ...relationship,
    source: source.replaceAll("\\", "/"),
  };
}

// implements REQ-kibi-source-relationship-parity
export async function collectSourceRelationshipParityViolations(
  workspaceRoot: string,
  prolog: PrologPort,
): Promise<Violation[]> {
  if (!isGitWorkspace(workspaceRoot)) return [];
  let discovery: Awaited<ReturnType<typeof discoverSourceFiles>>;
  try {
    discovery = await discoverSourceFiles(workspaceRoot, {
      trackedOnly: true,
      consumeTrackedPendingReceipts: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        rule: "source-relationship-parity",
        entityId: "source-discovery",
        description: `Authored relationship parity could not establish a complete source view: ${message}`,
        suggestion:
          "Repair the pending-source receipt through Kibi recovery, then rerun kb_check; do not ignore missing authored inputs.",
        evidence: {
          direction: "source_discovery",
          message,
        },
      },
    ];
  }
  const extraction = await processExtractions(
    discovery.markdownFiles,
    discovery.manifestFiles,
    true,
  );
  if (extraction.errors.length > 0) {
    return extraction.errors.map(({ file, message }) => ({
      rule: "source-relationship-parity",
      entityId: path.relative(workspaceRoot, file).replaceAll(path.sep, "/"),
      source: path.relative(workspaceRoot, file).replaceAll(path.sep, "/"),
      description: `Authored relationship parity could not inspect source: ${message}`,
      suggestion: "Repair the authored source, then rerun kb_check.",
    }));
  }

  const authored: RelationshipParityRecord[] = extraction.results.flatMap(
    ({ entity, relationships }) =>
      relationships.map((relationship) =>
        authoredRelationship(relationship, entity.source),
      ),
  );
  for (const relationship of readAllShards(path.join(workspaceRoot, ".kb"))) {
    authored.push({
      type: relationship.type,
      from: relationship.from,
      to: relationship.to,
      source: ".kb/relationships",
    });
  }

  return compareRelationshipParity(
    authored,
    await compiledRelationships(prolog),
  );
}
