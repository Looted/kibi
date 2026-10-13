import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { InputError, OperationError } from "../../cli-errors.js";
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
  planRelationshipShardRemovals,
  readAllShards,
  readShard,
  removeRelationshipsFromShards,
  renderShardWithout,
} from "../../relationships/shards.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import { buildEntityDeleteAuditGoal } from "./audit.js";
import {
  planRecoveryNotes,
  settlePendingPlanApplyJournals,
  withPlanRecoveryNotes,
} from "./plan-apply-journal.js";
import {
  RELATIONSHIP_TYPES,
  dependentRelationshipsGoal,
} from "./relationships.js";
import { saveAtomicMutation, saveMutation } from "./save.js";
import {
  normalizeAuthoredSourcePath,
  renderMarkdownRelationshipDeletion,
  renderSourceDeletion,
  renderYamlRelationshipDeletion,
  resolveContainedSourcePath,
  writePendingSourceReceipt,
} from "./source-authoring.js";
import type { DeleteInput, DeletePayload } from "./types.js";
import {
  type WorkspaceMutationLockHandle,
  acquireWorkspaceMutationLock,
  classifySourceMutationFailure,
  releaseWorkspaceMutationLock,
} from "./workspace-mutation-lock.js";

function requireProlog(context: OperationContext) {
  if (context.prolog === undefined)
    throw new Error("Delete operation requires a Prolog runtime");
  return context.prolog;
}

export function assertFilesystemCapableRuntime(
  fs: OperationContext["fs"],
): asserts fs is NonNullable<OperationContext["fs"]> {
  if (!fs) {
    throw new Error(
      "Relationship source patch requires a filesystem-capable runtime",
    );
  }
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

type DeleteExecutionOptions = Readonly<{ dryRun?: boolean }>;

/** Effects a dry run or plan-only result leaves to a later call. */
const PLAN_ONLY_SKIPPED_EFFECTS = ["kb-write", "workspace-write"] as const;

const DRY_RUN_FIELDS = {
  dryRun: true as const,
  outcome: "dry_run" as const,
  skippedEffects: PLAN_ONLY_SKIPPED_EFFECTS,
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// implements REQ-011
/**
 * The relationship delete a preflight-clean call would perform: the shard and
 * authored-source writes with their hashes and the compiled edges it would
 * retract. Nothing is written and the compiled store is not touched.
 */
function relationshipDeleteDryRun(
  shardRoot: string,
  preflight: readonly RelationshipSelector[],
  liveByKey: ReadonlyMap<string, boolean>,
  sourcePatches: ReadonlyMap<string, { before: string; after: string }>,
  workspaceRoot: string,
): DeletePayload {
  const planned = planRelationshipShardRemovals(shardRoot, preflight);
  const sourceWrites: NonNullable<DeletePayload["sourceWrites"]>[number][] = [];
  for (const [shardPath, body] of planned.bodies) {
    const before = readFileSync(shardPath, "utf8");
    if (before === body) continue;
    sourceWrites.push({
      path: path.relative(workspaceRoot, shardPath).replaceAll("\\", "/"),
      mode: "write",
      beforeHash: sha256(before),
      afterHash: sha256(body),
      created: false,
    });
  }
  for (const [relative, patch] of sourcePatches) {
    sourceWrites.push({
      path: relative,
      mode: "write",
      beforeHash: sha256(patch.before),
      afterHash: sha256(patch.after),
      created: false,
    });
  }
  const compiledEdges = preflight.filter(
    (selector) =>
      liveByKey.get(`${selector.type}\0${selector.from}\0${selector.to}`) ===
      true,
  ).length;
  return {
    deleted: 0,
    relationships_deleted: 0,
    skipped: 0,
    errors: [],
    error_codes: [],
    relationship_results: preflight.map((selector, index) => ({
      ...selector,
      deleted: false,
      shard_records_removed: planned.removals[index]?.removed ?? false,
      compiled_edge_retracted:
        liveByKey.get(`${selector.type}\0${selector.from}\0${selector.to}`) ===
        true,
    })),
    wouldDelete: {
      entities: 0,
      relationships: preflight.length,
      compiledEdges,
    },
    sync_required: planned.bodies.size > 0 || sourcePatches.size > 0,
    sourceWrites,
    ...DRY_RUN_FIELDS,
  };
}

// implements REQ-011
// covered_by TEST-cli-source-relationship-parity-unit
async function executeRelationshipDeleteUnlocked(
  selectors: readonly RelationshipSelector[],
  context: OperationContext,
  onCommitted: () => void = () => undefined,
  options: DeleteExecutionOptions = {},
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
    let authoredSourceKind: "YAML" | "Markdown" | undefined;
    if (context.fs) {
      // Authored YAML symbol relationships remain authoritative even when the
      // compiled edge or relationship shard is present. Patch the source first
      // so the next sync cannot recreate a relationship the caller deleted.
      // Legacy Markdown declarations are authoritative by the same rule.
      try {
        const entity = await loadEntity(prolog, selector.from);
        const source = typeof entity.source === "string" ? entity.source : "";
        if (sourceIsAuthored(source)) {
          authoredSourceKind = /\.(?:ya?ml)$/i.test(
            source.replaceAll("\\", "/"),
          )
            ? "YAML"
            : "Markdown";
          const relative = normalizeAuthoredSourcePath(
            context.workspaceRoot,
            source,
          );
          const absolute = resolveContainedSourcePath(
            context.workspaceRoot,
            relative,
          );
          const isYaml = /\.(?:ya?ml)$/i.test(relative);
          const previous = sourcePatches.get(relative);
          const before =
            previous?.before ?? (await context.fs.readFile(absolute));
          const current = previous?.after ?? before;
          const rendered = isYaml
            ? renderYamlRelationshipDeletion(relative, current, selector)
            : renderMarkdownRelationshipDeletion(relative, current, selector);
          if (rendered.removed) {
            sourcePatches.set(relative, {
              before,
              after: rendered.body,
            });
            sourceRemoved = true;
          }
        }
      } catch (error) {
        if (authoredSourceKind !== undefined) {
          throw new Error(
            `Authored ${authoredSourceKind} relationship deletion failed for ${selector.from}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
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
      ...(options.dryRun === true ? DRY_RUN_FIELDS : {}),
    };

  if (options.dryRun === true) {
    return relationshipDeleteDryRun(
      shardRoot,
      preflight,
      liveByKey,
      sourcePatches,
      context.workspaceRoot,
    );
  }

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
    assertFilesystemCapableRuntime(context.fs);
    const absolute = resolveContainedSourcePath(
      context.workspaceRoot,
      relative,
    );
    await context.fs.mkdir(path.dirname(absolute));
    const temporary = `${absolute}.kibi-relationship-${process.pid}-${randomUUID()}`;
    try {
      await context.fs.writeFile(temporary, body);
      if (context.fs.rename) await context.fs.rename(temporary, absolute);
      else {
        await context.fs.writeFile(absolute, body);
        await context.fs.unlink?.(temporary).catch(() => undefined);
      }
    } catch (error) {
      // A failed rename must not leak the unique temp file into the authored
      // tree; the published target (if any) is untouched at this point.
      await context.fs.unlink?.(temporary).catch(() => undefined);
      throw error;
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
    // The compiled mutation is now authoritative. Receipt publication below
    // must not make the enclosing operation look retryable.
    onCommitted();
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

export async function executeRelationshipDelete(
  selectors: readonly RelationshipSelector[],
  context: OperationContext,
  onCommitted: () => void = () => undefined,
  options: DeleteExecutionOptions = {},
): Promise<DeletePayload> {
  if (!context.fs || context.sourceMutationLockHeld === true)
    return executeRelationshipDeleteUnlocked(
      selectors,
      context,
      onCommitted,
      options,
    );
  const lock = await acquireWorkspaceMutationLock(context.workspaceRoot);
  let operationFailure: { readonly error: unknown } | undefined;
  let committed = false;
  try {
    const result = await executeRelationshipDeleteUnlocked(
      selectors,
      context,
      () => {
        committed = true;
        onCommitted();
      },
      options,
    );
    committed = options.dryRun !== true;
    return result;
  } catch (error) {
    const failure = classifySourceMutationFailure(
      "Relationship delete",
      error,
      committed,
    );
    operationFailure = { error: failure };
    throw failure;
  } finally {
    releaseWorkspaceMutationLock(lock, operationFailure, committed);
  }
}

type DeletionPlan = NonNullable<DeletePayload["deletionPlan"]>;
type DeleteNextAction = NonNullable<DeletePayload["nextActions"]>[number];

// implements REQ-kibi-operation-interface-parity
/** The kb_apply_plan call that applies a returned deletion plan unmodified. */
function applyDeletionPlanNextAction(plan: DeletionPlan): DeleteNextAction {
  return {
    operation: "kb_apply_plan",
    input: { plan, approvedPlanHash: plan.planHash },
    reason: `Review deletionPlan, then apply it unmodified to delete ${plan.entityIds.join(", ")} (or call kb_delete again with the same ids and approvedPlanHash).`,
    required: true,
  };
}

// implements REQ-kibi-operation-interface-parity
/** Requirements evolve append-only: point at the supersession upsert. */
function supersessionNextAction(
  requirementIds: readonly string[],
): DeleteNextAction {
  return {
    operation: "kb_upsert",
    input: {
      type: "req",
      id: "<REQ-replacement-id>",
      relationships: requirementIds.map((id) => ({
        type: "supersedes",
        from: "<REQ-replacement-id>",
        to: id,
      })),
    },
    reason: `Authored requirements are not deleted. Upsert a replacement requirement linked with supersedes to ${requirementIds.join(", ")}, then upsert each superseded requirement with status closed.`,
    required: true,
  };
}

// implements REQ-kibi-operation-interface-parity
/**
 * Apply a freshly computed authored-entity deletion plan in the same call
 * when the caller approved its hash. The plan goes through kb_apply_plan's
 * own validation, journal and recovery path; a stale or different approval
 * fails before anything is written.
 */
async function applyApprovedDeletionPlan(
  plan: DeletionPlan,
  approvedPlanHash: string,
  planErrors: readonly string[],
  context: OperationContext,
  onCommitted: () => void,
  reported: (text: string) => string,
): Promise<OperationResult<DeletePayload>> {
  if (approvedPlanHash.toLowerCase() !== plan.planHash) {
    throw new InputError(
      "DELETE_PLAN_HASH_MISMATCH",
      `kb_delete: approvedPlanHash ${approvedPlanHash.slice(0, 12)} does not match the current deletion plan ${plan.planHash.slice(0, 12)} for ${plan.entityIds.join(", ")}. The ids or their sources changed since that plan was returned. Call kb_delete without approvedPlanHash, review the new plan, and approve its planHash. Nothing was written.`,
    );
  }
  if (plan.supersessionRequired) {
    throw new InputError(
      "REQUIREMENT_SUPERSESSION_REQUIRED",
      "kb_delete: authored requirements evolve through a new requirement linked with supersedes; a deletion plan that requires supersession cannot be approved. Nothing was written.",
    );
  }
  if (planErrors.length > 0) {
    throw new InputError(
      "VALIDATION_FAILED",
      `kb_delete: approvedPlanHash applies a plan only when every requested id is in it. Remove or fix: ${planErrors.join("; ")} Nothing was written.`,
    );
  }
  // apply-plan imports this module; load it lazily to keep the cycle out of
  // module initialization.
  const { executeApplyPlan } = await import("../planning/apply-plan.js");
  const applied = await executeApplyPlan(
    { plan, approvedPlanHash: plan.planHash },
    // executeDelete already holds the workspace lock (or runs without fs).
    { ...context, sourceMutationLockHeld: true },
    onCommitted,
  );
  const result = applied.structuredContent as Readonly<Record<string, unknown>>;
  const deleted = typeof result.deleted === "number" ? result.deleted : 0;
  const repairs = result.status === "committed_with_repairs";
  const payload: DeletePayload = {
    deleted,
    skipped: plan.entityIds.length - deleted,
    errors: [],
    outcome: "plan_applied",
    planHash: plan.planHash,
    sourcePaths: Array.isArray(result.sourcePaths)
      ? (result.sourcePaths as string[])
      : [],
    ...(typeof result.recoveryJournalId === "string"
      ? { recoveryJournalId: result.recoveryJournalId }
      : {}),
    ...(repairs
      ? {
          status: "committed_with_repairs" as const,
          nextActions: Array.isArray(result.nextActions)
            ? (result.nextActions as DeleteNextAction[])
            : [],
        }
      : {}),
  };
  return {
    content: [
      {
        type: "text",
        text: reported(
          `Applied deletion plan ${plan.planHash.slice(0, 12)}: deleted ${deleted} entities.${repairs ? " Compiled retraction needs repair; follow nextActions." : ""}`,
        ),
      },
    ],
    structuredContent: payload,
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
  let sourceMutationLock: WorkspaceMutationLockHandle | undefined;
  let committed = false;
  let operationFailure: { readonly error: unknown } | undefined;
  let recoveryNotes: string[] = [];
  const reported = (text: string): string =>
    recoveryNotes.length > 0 ? `${text} ${recoveryNotes.join(" ")}` : text;
  try {
    if (context.fs && context.sourceMutationLockHeld !== true) {
      sourceMutationLock = await acquireWorkspaceMutationLock(
        context.workspaceRoot,
      );
      // implements REQ-core-atomic-upsert-persistence
      // Finish an interrupted kb_apply_plan before this delete reads or
      // changes the files its journal guards.
      recoveryNotes = planRecoveryNotes(
        await settlePendingPlanApplyJournals(
          { ...context, branchAttachment },
          { prolog: async () => prolog },
        ),
      );
    }
    const ids = input.ids ?? [];
    const relationships = input.relationships ?? [];
    const dryRun = input.dryRun === true;
    const approvedPlanHash = input.approvedPlanHash;
    if ((ids.length === 0) === (relationships.length === 0))
      throw new Error(
        "Delete requires exactly one non-empty input: ids or relationships",
      );
    if (approvedPlanHash !== undefined) {
      if (dryRun)
        throw new InputError(
          "VALIDATION_FAILED",
          "kb_delete: dryRun and approvedPlanHash cannot be combined. Omit approvedPlanHash to preview the deletion plan, or omit dryRun to apply it.",
        );
      if (relationships.length > 0)
        throw new InputError(
          "VALIDATION_FAILED",
          "kb_delete: approvedPlanHash applies only to an authored-entity deletion plan (ids). Relationship deletes apply directly; use dryRun:true to preview them.",
        );
    }
    if (relationships.length > 0) {
      if (relationships.some((value) => !isSelector(value)))
        throw new Error(
          "Each relationship selector requires non-empty type, from, and to strings",
        );
      const payload = await executeRelationshipDelete(
        relationships as readonly RelationshipSelector[],
        { ...context, sourceMutationLockHeld: true },
        () => {
          committed = true;
        },
        { dryRun },
      );
      return {
        content: [
          {
            type: "text",
            text: reported(
              dryRun
                ? `Dry run: would delete ${payload.wouldDelete?.relationships ?? 0} relationships. Skipped ${payload.skipped}. Nothing was written.`
                : `Deleted ${payload.relationships_deleted ?? 0} relationships. Skipped ${payload.skipped}.${payload.sync_required ? " Run kibi sync to reconcile the relationship shard." : ""}`,
            ),
          },
        ],
        structuredContent: payload,
      };
    }
    const errors: string[] = [];
    const goals: string[] = [];
    const authoredIds: string[] = [];
    // Resolved ids that a direct delete would retract (non-authored source).
    const directIds: string[] = [];
    const authoredRequirementIds: string[] = [];
    const sourceHashes: Record<string, string | null> = {};
    // Keep the original body for rollback, while applying each deletion to the
    // body produced by the previous deletion. A deletion plan must contain one
    // hash-bound write per authored path; otherwise apply-plan's last write can
    // resurrect an earlier record when multiple IDs share one manifest.
    const sourceBodies = new Map<string, string>();
    const evolvingSourceBodies = new Map<string, string | undefined>();
    const sourcePlansByPath = new Map<
      string,
      {
        path: string;
        mode: "write" | "delete";
        beforeHash: string | null;
        afterHash: string | null;
        body?: string;
      }
    >();
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
            const original =
              sourceBodies.get(relativeSource) ??
              (await context.fs.readFile(sourcePath));
            if (!sourceBodies.has(relativeSource)) {
              sourceBodies.set(relativeSource, original);
            }
            const contents = evolvingSourceBodies.has(relativeSource)
              ? evolvingSourceBodies.get(relativeSource)
              : original;
            if (contents === undefined) {
              throw new Error(
                `Authored document ${relativeSource} no longer contains ${id}`,
              );
            }
            const deletion = renderSourceDeletion(
              relativeSource,
              id,
              String(entity.type),
              contents,
            );
            evolvingSourceBodies.set(
              relativeSource,
              deletion.mode === "write" ? deletion.body : undefined,
            );
            const beforeHash = createHash("sha256")
              .update(original)
              .digest("hex");
            const afterHash =
              deletion.body === undefined
                ? null
                : createHash("sha256").update(deletion.body).digest("hex");
            sourceHashes[relativeSource] = beforeHash;
            sourcePlansByPath.set(relativeSource, {
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
      if (!sourceIsAuthored(source)) directIds.push(id);
      goals.push(buildEntityDeleteAuditGoal(entity));
    }
    if (authoredIds.length > 0 && context.sourcePlanApplication !== true) {
      if (context.fs) {
        // A deleted entity's outgoing relationships live in canonical shards,
        // not in its own document. Incoming edges already block deletion, so
        // the plan removes the outgoing rows too; otherwise the compiled
        // store drops them while the shards keep them.
        const deleted = new Set(authoredIds);
        for (const shardPath of listShards(
          path.join(context.workspaceRoot, ".kb"),
        )) {
          const selectors = readShard(shardPath)
            .filter((record) => deleted.has(record.from))
            .map(({ type, from, to }) => ({ type, from, to }));
          if (selectors.length === 0) continue;
          const relativeShard = path
            .relative(context.workspaceRoot, shardPath)
            .replaceAll("\\", "/");
          const original = readFileSync(shardPath, "utf8");
          const body = renderShardWithout(original, selectors, shardPath);
          const beforeHash = createHash("sha256")
            .update(original)
            .digest("hex");
          sourceHashes[relativeShard] = beforeHash;
          sourcePlansByPath.set(relativeShard, {
            path: relativeShard,
            mode: "write",
            beforeHash,
            afterHash: createHash("sha256").update(body).digest("hex"),
            body,
          });
        }
      }
      const supersessionRequired = authoredRequirementIds.length > 0;
      const sourcePlans = [...sourcePlansByPath.values()];
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
      const deletionPlan = { ...planBody, planHash };
      // A plan covers only authored ids; any other resolved id in the same
      // call is left for a separate direct delete.
      const planErrors = [
        ...errors,
        ...directIds.map(
          (id) =>
            `Entity ${id} was not deleted: this call returned an authored-entity deletion plan. Delete ${id} in a separate kb_delete call.`,
        ),
      ];
      if (approvedPlanHash !== undefined) {
        return await applyApprovedDeletionPlan(
          deletionPlan,
          approvedPlanHash,
          planErrors,
          { ...context, branchAttachment, prolog },
          () => {
            committed = true;
          },
          reported,
        );
      }
      const payload: DeletePayload = {
        deleted: 0,
        skipped: authoredIds.length + planErrors.length,
        errors: planErrors,
        outcome: supersessionRequired
          ? "supersession_required"
          : "plan_returned",
        deletionPlan,
        nextActions: supersessionRequired
          ? [supersessionNextAction(authoredRequirementIds)]
          : [applyDeletionPlanNextAction(deletionPlan)],
        // Only kb_apply_plan writes; this call returns the plan.
        skippedEffects: PLAN_ONLY_SKIPPED_EFFECTS,
        ...(dryRun ? { dryRun: true as const } : {}),
      };
      return {
        content: [
          {
            type: "text",
            text: reported(
              supersessionRequired
                ? `Authored requirements ${authoredRequirementIds.join(", ")} cannot be deleted: supersede them with kb_upsert (supersedes) and close them instead. Nothing was written.`
                : `Returned deletion plan ${planHash.slice(0, 12)} for ${authoredIds.join(", ")}. Nothing was written; apply it with kb_apply_plan (nextActions[0].input), or call kb_delete again with approvedPlanHash.`,
            ),
          },
        ],
        structuredContent: payload,
      };
    }
    if (
      approvedPlanHash !== undefined &&
      context.sourcePlanApplication !== true
    )
      throw new InputError(
        "VALIDATION_FAILED",
        `kb_delete: approvedPlanHash was given but ${ids.join(", ")} produced no authored-entity deletion plan to approve. Omit approvedPlanHash to delete these ids directly.`,
      );
    if (dryRun) {
      const payload: DeletePayload = {
        deleted: 0,
        skipped: errors.length,
        errors,
        wouldDelete: { entities: goals.length, ids: directIds },
        ...DRY_RUN_FIELDS,
      };
      return {
        content: [
          {
            type: "text",
            text: reported(
              `Dry run: would delete ${goals.length} entities. Skipped ${errors.length}. Nothing was written.${errors.length > 0 ? ` Errors: ${errors.join("; ")}` : ""}`,
            ),
          },
        ],
        structuredContent: payload,
      };
    }
    try {
      if (goals.length > 0) await saveAtomicMutation(prolog, goals, "delete");
      else await saveMutation(prolog, "delete");
      committed = true;
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
          text: reported(
            `Deleted ${payload.deleted} entities. Skipped ${payload.skipped}.${errors.length > 0 ? ` Errors: ${errors.join("; ")}` : ""}`,
          ),
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    // Typed operation errors keep their code and retryability. After the
    // commit milestone, a generic failure is already a committed mutation:
    // wrap it as non-retryable immediately instead of only when lock release
    // also fails.
    if (error instanceof OperationError || error instanceof InputError) {
      const failure = withPlanRecoveryNotes(error, recoveryNotes);
      operationFailure = { error: failure };
      throw failure;
    }
    if (committed) {
      const failure = withPlanRecoveryNotes(
        classifySourceMutationFailure("Delete", error, true),
        recoveryNotes,
      );
      operationFailure = { error: failure };
      throw failure;
    }
    const failure = withPlanRecoveryNotes(
      new Error(
        `Delete execution failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
      recoveryNotes,
    );
    operationFailure = { error: failure };
    throw failure;
  } finally {
    releaseWorkspaceMutationLock(
      sourceMutationLock,
      operationFailure,
      committed,
    );
  }
}
