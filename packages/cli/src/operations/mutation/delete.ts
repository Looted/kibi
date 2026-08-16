import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  listShards,
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
import {
  normalizeAuthoredSourcePath,
  renderMarkdownRelationshipDeletion,
  renderSourceDeletion,
  resolveContainedSourcePath,
  writePendingSourceReceipt,
} from "./source-authoring.js";
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
  return /\.(?:md|mdx|ya?ml)$/i.test(normalized);
}

function fileHash(pathname: string): string | null {
  if (!existsSync(pathname)) return null;
  return createHash("sha256").update(readFileSync(pathname)).digest("hex");
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
  if (
    attachment.migrationRequired &&
    (context.branchAttachment !== undefined || context.fs !== undefined)
  ) {
    throw new Error(
      `Delete blocked: migrate legacy branch storage first with 'kibi branch migrate --from ${attachment.kbBranch} --to ${attachment.gitBranch} --apply'`,
    );
  }
  // Relationship YAML shards are canonical tracked sources. Never patch the
  // hashed compiled branch store here; sync will rebuild derived state.
  const shardRoot = path.join(context.workspaceRoot, ".kb");
  let shardRecords: ReturnType<typeof readAllShards> = [];
  try {
    shardRecords = readAllShards(shardRoot);
  } catch (error) {
    throw new Error(
      `Relationship deletion preflight failed while reading legacy shards: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const preflight: RelationshipSelector[] = [];
  const liveByKey = new Map<string, boolean>();
  const sourcePatches = new Map<string, { before: string; after: string }>();
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
    const matchingShard = shardRecords.filter(
      (record) =>
        record.type === selector.type &&
        record.from === selector.from &&
        record.to === selector.to,
    );
    const liveResult = await prolog.query(
      `once(kb_relationship(${toPrologAtom(selector.type)}, ${toPrologAtom(selector.from)}, ${toPrologAtom(selector.to)}))`,
    );
    let sourceRemoved = false;
    if (!liveResult.success && matchingShard.length === 0 && context.fs) {
      // Legacy Markdown relationship declarations are still authored source.
      // Patch them through the public delete operation when a compiled edge or
      // relationship shard is unavailable, instead of leaving an ignored,
      // dangling link that makes the next sync fail closed.
      try {
        const entity = await loadEntity(prolog, selector.from);
        const source = typeof entity.source === "string" ? entity.source : "";
        if (sourceIsAuthored(source)) {
          const relative = normalizeAuthoredSourcePath(
            context.workspaceRoot,
            source,
          );
          const absolute = resolveContainedSourcePath(
            context.workspaceRoot,
            relative,
          );
          const before = await context.fs.readFile(absolute);
          const rendered = renderMarkdownRelationshipDeletion(
            relative,
            before,
            selector,
          );
          if (rendered.removed) {
            sourcePatches.set(relative, { before, after: rendered.body });
            sourceRemoved = true;
          }
        }
      } catch {
        // The normal typed preflight below reports a deterministic not-found
        // or inspection error when no authored source can prove the edge.
      }
    }
    // A canonical shard is authoritative even when the compiled store cannot
    // materialize the edge (for example, because one endpoint was deleted or
    // the previous sync reported a dangling relationship).  Such a record is
    // still safely removable through the public relationship-delete operation.
    // Only fail preflight when neither the compiled edge nor a canonical shard
    // record can prove that the requested relationship exists.
    if (
      !liveResult.success &&
      liveResult.error &&
      matchingShard.length === 0 &&
      !sourceRemoved
    ) {
      errors.push(
        `Failed to inspect ${selector.type} ${selector.from}->${selector.to}: ${liveResult.error ?? "Query failed"}`,
      );
      errorCodes.push({ code: "relationship_preflight_failed", selector });
      continue;
    }
    const liveExists = liveResult.success;
    if (!liveExists && matchingShard.length === 0 && !sourceRemoved) {
      errors.push(
        `Relationship does not exist: ${selector.type} ${selector.from}->${selector.to}`,
      );
      errorCodes.push({ code: "relationship_not_found", selector });
      continue;
    }
    liveByKey.set(selectorKey, liveExists);
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

  // Keep byte-level before-images for rollback. Re-serializing parsed records
  // would silently discard comments, ordering, and CST trivia from unrelated
  // shard records after a later compiled-store failure.
  const originalShardBytes = new Map(
    listShards(shardRoot).map((shardPath) => [
      shardPath,
      readFileSync(shardPath, "utf8"),
    ]),
  );
  const originalShardHashes = new Map(
    listShards(shardRoot).map((shardPath) => [shardPath, fileHash(shardPath)]),
  );
  let shardRemovals: ReturnType<typeof removeRelationshipsFromShards>;
  try {
    shardRemovals = removeRelationshipsFromShards(shardRoot, preflight);
  } catch (error) {
    // A shard publication can fail after one of the deterministic renames.
    // Restore every preflight image before surfacing the error so canonical
    // source remains authoritative even when the compiled retract never ran.
    try {
      for (const [shardPath, body] of originalShardBytes) {
        writeFileSync(shardPath, body, "utf8");
      }
    } catch (rollbackError) {
      throw new Error(
        `reconciliation_required: relationship shard preflight failed and rollback failed (${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)})`,
      );
    }
    throw new Error(
      `Relationship shard update failed before compiled mutation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const writeSourcePatch = async (
    relative: string,
    body: string,
  ): Promise<void> => {
    if (!context.fs)
      throw new Error(
        "Relationship source patch requires a filesystem-capable runtime",
      );
    const absolute = resolveContainedSourcePath(
      context.workspaceRoot,
      relative,
    );
    await context.fs.mkdir(path.dirname(absolute));
    const temporary = `${absolute}.kibi-relationship-${process.pid}-${Date.now()}`;
    await context.fs.writeFile(temporary, body);
    if (context.fs.rename) await context.fs.rename(temporary, absolute);
    else {
      await context.fs.writeFile(absolute, body);
      await context.fs.unlink?.(temporary).catch(() => undefined);
    }
  };
  try {
    for (const [relative, patch] of sourcePatches) {
      await writeSourcePatch(relative, patch.after);
    }
  } catch (error) {
    for (const [relative, patch] of sourcePatches) {
      try {
        await writeSourcePatch(relative, patch.before);
      } catch {
        // Preserve the original error; the caller can recover from the
        // hash-bound source state on the next invocation.
      }
    }
    throw new Error(
      `Relationship source update failed before compiled mutation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let retracted = 0;
  try {
    for (const selector of preflight) {
      const selectorKey = `${selector.type}\0${selector.from}\0${selector.to}`;
      if (liveByKey.get(selectorKey) !== true) continue;
      const result = await prolog.query(
        `kb_retract_relationship(${toPrologAtom(selector.type)}, ${toPrologAtom(selector.from)}, ${toPrologAtom(selector.to)})`,
      );
      if (!result.success) throw new Error(result.error ?? "Query failed");
      retracted += 1;
    }
    if (retracted > 0) await saveMutation(prolog, "delete");
  } catch (error) {
    const paths = [
      ...new Set(shardRemovals.flatMap((item) => item.shardPaths)),
    ];
    try {
      for (const [shardPath, body] of originalShardBytes)
        writeFileSync(shardPath, body, "utf8");
      for (const [relative, patch] of sourcePatches) {
        await writeSourcePatch(relative, patch.before);
      }
    } catch (rollbackError) {
      throw new Error(
        `reconciliation_required: compiled relationship retraction failed and shard rollback failed (${paths.join(", ")}): ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
      );
    }
    throw new Error(
      `Relationship retraction failed; canonical relationship shards were restored (${paths.join(", ")}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const sourceWrites = Array.from(
    new Set(shardRemovals.flatMap((item) => item.shardPaths)),
  ).flatMap((shardPath) => {
    const before = originalShardHashes.get(shardPath) ?? null;
    const after = fileHash(shardPath);
    if (before === after) return [];
    const relative = path
      .relative(context.workspaceRoot, shardPath)
      .replaceAll("\\", "/");
    if (after !== null) {
      writePendingSourceReceipt(context.workspaceRoot, relative, after);
    }
    return [
      {
        path: relative,
        mode: "write" as const,
        beforeHash: before,
        afterHash: after,
        created: false,
      },
    ];
  });
  sourceWrites.push(
    ...Array.from(sourcePatches, ([relative, patch]) => {
      const beforeHash = createHash("sha256")
        .update(patch.before)
        .digest("hex");
      const afterHash = createHash("sha256").update(patch.after).digest("hex");
      writePendingSourceReceipt(context.workspaceRoot, relative, afterHash);
      return {
        path: relative,
        mode: "write" as const,
        beforeHash,
        afterHash,
        created: false,
      };
    }),
  );
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
      compiled_edge_retracted:
        liveByKey.get(`${selector.type}\0${selector.from}\0${selector.to}`) ===
        true,
    })),
    sync_required:
      shardRemovals.some((item) => item.removed) || sourcePatches.size > 0,
    ...(sourceWrites.length > 0 ? { sourceWrites } : {}),
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
  if (
    branchAttachment.migrationRequired &&
    (context.branchAttachment !== undefined || context.fs !== undefined)
  ) {
    throw new Error(
      `Delete blocked: KB is attached through legacy branch storage (${branchAttachment.gitBranch} -> ${branchAttachment.kbBranch}). Run 'kibi branch migrate --from ${branchAttachment.kbBranch} --to ${branchAttachment.gitBranch} --apply' first.`,
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
    const authoredIds: string[] = [];
    const authoredRequirementIds: string[] = [];
    const sourceHashes: Record<string, string | null> = {};
    const sourceBodies = new Map<string, string>();
    const sourcePlans: Array<{
      path: string;
      mode: "write" | "delete";
      beforeHash: string | null;
      afterHash: string | null;
      body?: string;
    }> = [];
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
      const entity = await loadEntity(prolog, id);
      const source = typeof entity.source === "string" ? entity.source : "";
      if (sourceIsAuthored(source)) {
        authoredIds.push(id);
        if (entity.type === "req") authoredRequirementIds.push(id);
        if (context.fs) {
          const relativeSource = normalizeAuthoredSourcePath(
            context.workspaceRoot,
            source,
          );
          const sourcePath = path.join(context.workspaceRoot, relativeSource);
          try {
            const contents = await context.fs.readFile(sourcePath);
            const deletion = renderSourceDeletion(
              relativeSource,
              id,
              String(entity.type),
              contents,
            );
            sourceBodies.set(relativeSource, contents);
            const beforeHash = createHash("sha256")
              .update(contents)
              .digest("hex");
            const afterHash =
              deletion.body === undefined
                ? null
                : createHash("sha256").update(deletion.body).digest("hex");
            sourceHashes[relativeSource] = beforeHash;
            sourcePlans.push({
              path: relativeSource,
              mode: deletion.mode,
              beforeHash,
              afterHash,
              ...(deletion.body === undefined ? {} : { body: deletion.body }),
            });
          } catch {
            sourceHashes[relativeSource] = null;
          }
        }
      }
      goals.push(buildEntityDeleteAuditGoal(entity));
    }
    if (authoredIds.length > 0 && context.sourcePlanApplication !== true) {
      const supersessionRequired = authoredRequirementIds.length > 0;
      const planBody = {
        version: "kibi.entity-deletion-plan.v1" as const,
        entityIds: authoredIds,
        sourceHashes,
        sourceWrites: sourcePlans,
        supersessionRequired,
      };
      const planHash = createHash("sha256")
        .update(JSON.stringify(planBody))
        .digest("hex");
      const payload: DeletePayload = {
        deleted: 0,
        skipped: authoredIds.length,
        errors: [
          supersessionRequired
            ? "Authored requirements require an explicit supersession plan; no direct delete is performed."
            : "Authored entity deletion returns a hash-bound plan for kb_apply_plan.",
        ],
        deletionPlan: { ...planBody, planHash },
      };
      return {
        content: [
          {
            type: "text",
            text: `Deletion plan ${planHash.slice(0, 12)} must be applied through kb_apply_plan.`,
          },
        ],
        structuredContent: payload,
      };
    }
    try {
      if (goals.length > 0) await saveAtomicMutation(prolog, goals, "delete");
      else await saveMutation(prolog, "delete");
    } catch (error) {
      for (const [source, body] of sourceBodies) {
        await context.fs?.writeFile(
          resolveContainedSourcePath(context.workspaceRoot, source),
          body,
        );
      }
      throw error;
    }
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
