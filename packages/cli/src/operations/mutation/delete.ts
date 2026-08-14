import path from "node:path";
import {
  parseEntityFromList,
  parseListOfLists,
  toPrologAtom,
} from "../../prolog/codec.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import {
  type RelationshipSelector,
  readAllShards,
  removeRelationshipsFromShards,
} from "../../relationships/shards.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import { buildEntityDeleteAuditGoal } from "./audit.js";
import {
  RELATIONSHIP_TYPES,
  dependentRelationshipsGoal,
} from "./relationships.js";
import { saveAtomicMutation, saveMutation } from "./save.js";
import type { DeleteInput, DeletePayload } from "./types.js";

function requireProlog(context: OperationContext) {
  if (context.prolog === undefined)
    throw new Error("Delete operation requires a Prolog runtime");
  return context.prolog;
}

async function loadEntity(
  prolog: NonNullable<OperationContext["prolog"]>,
  id: string,
): Promise<Readonly<Record<string, unknown>>> {
  const safeId = id.replaceAll("'", "''");
  const result = await prolog.query(
    `findall(['${safeId}',Type,Props], kb_entity('${safeId}', Type, Props), Results)`,
  );
  if (!result.success)
    throw new Error(
      `Failed to load metadata for entity ${id}: ${result.error ?? "Unknown error"}`,
    );
  const rows = parseListOfLists(result.bindings.Results ?? "[]");
  if (rows.length === 0)
    throw new Error(
      `Failed to load metadata for entity ${id}: Entity not found`,
    );
  return { ...parseEntityFromList(rows[0] ?? []), id };
}

function isSelector(value: unknown): value is RelationshipSelector {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const row = value as Record<string, unknown>;
  return ["type", "from", "to"].every(
    (key) =>
      typeof row[key] === "string" && (row[key] as string).trim().length > 0,
  );
}

function sourceIsAuthored(source: string): boolean {
  const normalized = source.replaceAll("\\", "/");
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(normalized)) return false;
  return /\.(?:md|mdx|ya?ml|json)$/i.test(normalized);
}

async function executeRelationshipDelete(
  selectors: readonly RelationshipSelector[],
  context: OperationContext,
): Promise<DeletePayload> {
  const prolog = requireProlog(context);
  const allowed = new Set<string>(RELATIONSHIP_TYPES);
  const errors: string[] = [];
  const errorCodes: Readonly<Record<string, unknown>>[] = [];
  const seenSelectors = new Set<string>();
  const attachment =
    context.branchAttachment ?? resolveBranchAttachment(context.workspaceRoot);
  if ("error" in attachment) throw new Error(attachment.error);
  if (attachment.migrationRequired) {
    throw new Error(
      `Delete blocked: migrate legacy branch storage first with 'kibi branch migrate --from ${attachment.kbBranch} --apply'`,
    );
  }
  const shardRoot = path.join(
    context.workspaceRoot,
    ".kb",
    "branches",
    attachment.kbBranch,
  );
  let shardRecords: ReturnType<typeof readAllShards> = [];
  try {
    shardRecords = readAllShards(shardRoot);
  } catch (error) {
    throw new Error(
      `Relationship deletion preflight failed while reading legacy shards: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const preflight: RelationshipSelector[] = [];
  for (const selector of selectors) {
    const selectorKey = `${selector.type}\0${selector.from}\0${selector.to}`;
    if (seenSelectors.has(selectorKey)) {
      errors.push(
        `Duplicate relationship selector: ${selector.type} ${selector.from}->${selector.to}`,
      );
      errorCodes.push({ code: "duplicate_relationship_selector", selector });
      continue;
    }
    seenSelectors.add(selectorKey);
    if (!allowed.has(selector.type)) {
      errors.push(`Unsupported relationship type '${selector.type}'`);
      errorCodes.push({ code: "unsupported_relationship_type", selector });
      continue;
    }
    const liveResult = await prolog.query(
      `once(kb_relationship(${toPrologAtom(selector.type)}, ${toPrologAtom(selector.from)}, ${toPrologAtom(selector.to)}))`,
    );
    if (!liveResult.success && liveResult.error) {
      errors.push(
        `Failed to inspect ${selector.type} ${selector.from}->${selector.to}: ${liveResult.error ?? "Query failed"}`,
      );
      errorCodes.push({ code: "relationship_preflight_failed", selector });
      continue;
    }
    const liveExists = liveResult.success;
    const matchingShard = shardRecords.filter(
      (record) =>
        record.type === selector.type &&
        record.from === selector.from &&
        record.to === selector.to,
    );
    const authoredSources = [
      ...new Set(
        matchingShard.map((record) => record.source).filter(sourceIsAuthored),
      ),
    ];
    if (authoredSources.length > 0) {
      errors.push(
        `source_owned_relationship ${selector.type} ${selector.from}->${selector.to}: edit ${authoredSources.join(", ")} and run kibi sync`,
      );
      errorCodes.push({
        code: "source_owned_relationship",
        selector,
        sources: authoredSources,
      });
      continue;
    }
    if (!liveExists && matchingShard.length === 0) {
      errors.push(
        `Relationship does not exist: ${selector.type} ${selector.from}->${selector.to}`,
      );
      errorCodes.push({ code: "relationship_not_found", selector });
      continue;
    }
    preflight.push(selector);
  }
  if (errors.length > 0)
    return {
      deleted: 0,
      relationships_deleted: 0,
      skipped: errors.length,
      errors,
      error_codes: errorCodes,
      relationship_results: [],
    };

  const shardRemovals = removeRelationshipsFromShards(shardRoot, preflight);
  let retracted = 0;
  try {
    for (const selector of preflight) {
      const result = await prolog.query(
        `kb_retract_relationship(${toPrologAtom(selector.type)}, ${toPrologAtom(selector.from)}, ${toPrologAtom(selector.to)})`,
      );
      if (!result.success) throw new Error(result.error ?? "Query failed");
      retracted += 1;
    }
    await saveMutation(prolog, "delete");
  } catch (error) {
    const paths = [
      ...new Set(shardRemovals.flatMap((item) => item.shardPaths)),
    ];
    throw new Error(
      `reconciliation_required: compiled relationship retraction failed after shard correction (${paths.join(", ")}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return {
    deleted: 0,
    relationships_deleted: retracted,
    skipped: 0,
    errors: [],
    error_codes: [],
    relationship_results: preflight.map((selector, index) => ({
      ...selector,
      deleted: true,
      shard_records_removed: shardRemovals[index]?.removed ?? false,
    })),
    sync_required: shardRemovals.some((item) => item.removed),
  };
}

export async function executeDelete(
  input: DeleteInput,
  context: OperationContext,
): Promise<OperationResult<DeletePayload>> {
  const branchAttachment =
    context.branchAttachment ?? resolveBranchAttachment(context.workspaceRoot);
  if ("error" in branchAttachment) {
    throw new Error(`Unable to resolve KB branch: ${branchAttachment.error}`);
  }
  if (branchAttachment.migrationRequired) {
    throw new Error(
      `Delete blocked: KB is attached through legacy branch storage (${branchAttachment.gitBranch} -> ${branchAttachment.kbBranch}). Run 'kibi branch migrate --from ${branchAttachment.kbBranch} --apply' first.`,
    );
  }
  const prolog = requireProlog(context);
  try {
    const ids = input.ids ?? [];
    const relationships = input.relationships ?? [];
    if ((ids.length === 0) === (relationships.length === 0))
      throw new Error(
        "Delete requires exactly one non-empty input: ids or relationships",
      );
    if (relationships.length > 0) {
      if (relationships.some((value) => !isSelector(value)))
        throw new Error(
          "Each relationship selector requires non-empty type, from, and to strings",
        );
      const payload = await executeRelationshipDelete(
        relationships as readonly RelationshipSelector[],
        context,
      );
      return {
        content: [
          {
            type: "text",
            text: `Deleted ${payload.relationships_deleted ?? 0} relationships. Skipped ${payload.skipped}.${payload.sync_required ? " Run kibi sync to reconcile the relationship shard." : ""}`,
          },
        ],
        structuredContent: payload,
      };
    }
    const errors: string[] = [];
    const goals: string[] = [];
    for (const id of ids) {
      const safeId = id.replaceAll("'", "''");
      const exists = await prolog.query(`once(kb_entity('${safeId}', _, _))`);
      if (!exists.success) {
        errors.push(`Entity ${id} does not exist`);
        continue;
      }
      const dependents = await prolog.query(dependentRelationshipsGoal(id));
      if (!dependents.success) {
        errors.push(
          `Failed to inspect dependents for entity ${id}: ${dependents.error ?? "Query failed"}`,
        );
        continue;
      }
      if ((dependents.bindings.Dependents ?? "[]") !== "[]") {
        errors.push(
          `Cannot delete entity ${id}: has dependents (other entities reference it)`,
        );
        continue;
      }
      goals.push(buildEntityDeleteAuditGoal(await loadEntity(prolog, id)));
    }
    if (goals.length > 0) await saveAtomicMutation(prolog, goals, "delete");
    else await saveMutation(prolog, "delete");
    const payload: DeletePayload = {
      deleted: goals.length,
      skipped: errors.length,
      errors,
    };
    return {
      content: [
        {
          type: "text",
          text: `Deleted ${payload.deleted} entities. Skipped ${payload.skipped}.${errors.length > 0 ? ` Errors: ${errors.join("; ")}` : ""}`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    throw new Error(
      `Delete execution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
