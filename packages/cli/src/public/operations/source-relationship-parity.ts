import { execFileSync } from "node:child_process";
import path from "node:path";
import { sourceExtractionRemediation } from "../../commands/sync/cache.js";
import { discoverSourceFiles } from "../../commands/sync/discovery.js";
import { processExtractions } from "../../commands/sync/extraction.js";
import { findUntrackedDocumentMatches } from "../../commands/sync/untracked-targets.js";
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

/**
 * The repair that works for a source-discovery failure. There is no separate
 * receipt repair tool: a rewrite through kb_upsert republishes a receipt,
 * and `kibi branch recover` retires receipts of files removed on purpose.
 */
// implements REQ-kibi-source-relationship-parity
function sourceDiscoverySuggestion(message: string): string {
  if (/Pending source hash drift/.test(message)) {
    return "A pending-source receipt no longer matches its untracked file. Rewrite that entity with kb_upsert (its current title and status are enough) so the receipt is republished against the file's current bytes, or 'git add' the file to retire the receipt; then rerun kb_check. Do not ignore missing authored inputs.";
  }
  if (/Pending source is missing/.test(message)) {
    return "A pending-source receipt binds an untracked file that no longer exists. If the file was deleted on purpose, run 'kibi branch recover --apply' to rebuild the branch KB from the sources that remain; otherwise restore the file (or rewrite the entity with kb_upsert); then rerun kb_check.";
  }
  return "Repair the authored sources named in the message (restore or rewrite the entity with kb_upsert, or run 'kibi branch recover --apply' for sources removed on purpose), then rerun kb_check; do not ignore missing authored inputs.";
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
        suggestion: sourceDiscoverySuggestion(message),
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
    workspaceRoot,
  );
  // implements REQ-kibi-uncompiled-source-visibility
  // A source sync cannot extract is missing from the compiled KB with every
  // entity and relationship it declares: one blocking finding per file names
  // it, the extraction error and the fix.
  if (extraction.errors.length > 0) {
    return extraction.errors.map(({ file, message }) => {
      const relative = path
        .relative(workspaceRoot, file)
        .replaceAll(path.sep, "/");
      return {
        rule: "source-relationship-parity",
        entityId: relative,
        source: relative,
        description: `${relative} cannot be compiled, so the entities and relationships it declares are missing from the KB: ${message}`,
        suggestion: `${sourceExtractionRemediation(relative, message)} Then rerun kb_check.`,
        evidence: {
          direction: "source_extraction",
          file: relative,
          error: message,
        },
      };
    });
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

  return explainUntrackedEndpoints(
    workspaceRoot,
    compareRelationshipParity(authored, await compiledRelationships(prolog)),
  );
}

/**
 * An authored relationship is missing from the compiled KB most often
 * because an endpoint is declared in a file sync cannot see: one Git does not
 * track and no pending-source receipt covers (for example a `.kb/symbols.yaml`
 * that `kibi init` created and kb_upsert appended to before receipts covered
 * existing untracked files). Name that file and the fix.
 */
// implements REQ-kibi-source-relationship-parity
function explainUntrackedEndpoints(
  workspaceRoot: string,
  violations: Violation[],
): Violation[] {
  const endpoints = new Set<string>();
  for (const violation of violations) {
    const relationship = authoredToCompiledRelationship(violation);
    if (relationship === null) continue;
    endpoints.add(relationship.from);
    endpoints.add(relationship.to);
  }
  if (endpoints.size === 0) return violations;
  const untracked = findUntrackedDocumentMatches(workspaceRoot, [...endpoints]);
  if (untracked.size === 0) return violations;
  return violations.map((violation) => {
    const relationship = authoredToCompiledRelationship(violation);
    if (relationship === null) return violation;
    const sources = [relationship.from, relationship.to].flatMap((id) => {
      const file = untracked.get(id);
      return file === undefined ? [] : [{ entityId: id, file }];
    });
    if (sources.length === 0) return violation;
    const files = [...new Set(sources.map((source) => source.file))];
    return {
      ...violation,
      suggestion: `${sources.map((source) => source.entityId).join(" and ")} ${sources.length === 1 ? "is" : "are"} declared in ${files.join(", ")}, which Git does not track and no pending-source receipt covers, so sync never compiles it. Run 'git add ${files.join(" ")}' (staging is enough) or rewrite the entity with kb_upsert, then run kibi sync and rerun kb_check.`,
      evidence: {
        ...(violation.evidence ?? {}),
        untrackedSources: sources,
      },
    };
  });
}

function authoredToCompiledRelationship(
  violation: Violation,
): { from: string; to: string } | null {
  const evidence = violation.evidence as
    | { direction?: unknown; relationship?: { from?: unknown; to?: unknown } }
    | undefined;
  if (evidence?.direction !== "authored_to_compiled") return null;
  const from = evidence.relationship?.from;
  const to = evidence.relationship?.to;
  return typeof from === "string" && typeof to === "string"
    ? { from, to }
    : null;
}
