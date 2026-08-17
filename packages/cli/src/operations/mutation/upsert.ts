import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { OperationError } from "../../cli-errors.js";
import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
// implements REQ-kibi-operation-interface-parity
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { appendOnlyVerificationReceiptHistoryErrors } from "../../public/verification-receipt.js";
import {
  appendRelationship,
  computeShardPath,
} from "../../relationships/shards.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  assertLogicalGroundingClaimKeys,
  assertSemanticInventoryBoundary,
} from "../semantic-advisor/ingestion-boundary.js";
import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";
import { buildUpsertCommitGoal, formatUpsertError } from "./contradictions.js";
import {
  existingRelationships,
  validateLiveRelationshipTargets,
  validateRelationshipSources,
  validateStrictLanePairing,
  validateSupersedesSourceHistory,
} from "./relationships.js";
import {
  writePendingSourceReceipt,
  writeSourceForUpsert,
} from "./source-authoring.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import { refreshSymbolCoordinates } from "./symbol-refresh.js";
import type { RelationshipInput, UpsertInput, UpsertPayload } from "./types.js";
import { validateUpsertInput } from "./validation.js";
import { scenarioCoverageWarnings } from "./warnings.js";

function requireProlog(context: OperationContext) {
  if (context.prolog === undefined) {
    throw new Error("Upsert operation requires a Prolog runtime");
  }
  return context.prolog;
}

function receiptRecords(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (receipt): receipt is Readonly<Record<string, unknown>> =>
      receipt !== null &&
      typeof receipt === "object" &&
      !Array.isArray(receipt),
  );
}

function parseChangeKind(
  value: string | undefined,
): "created" | "updated" | null {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, "");
  return normalized === "created" || normalized === "updated"
    ? normalized
    : null;
}

function fileHash(pathname: string): string | null {
  if (!existsSync(pathname)) return null;
  return createHash("sha256").update(readFileSync(pathname)).digest("hex");
}

function textHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertRelationshipShardContained(
  workspaceRoot: string,
  shardPath: string,
): void {
  const root = path.resolve(workspaceRoot);
  const relationshipRoot = path.resolve(root, ".kb", "relationships");
  const absolute = path.resolve(shardPath);
  if (!absolute.startsWith(`${relationshipRoot}${path.sep}`)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `Relationship shard escapes the canonical workspace lane: ${shardPath}`,
    );
  }
  let existing = absolute;
  while (!existsSync(existing) && path.dirname(existing) !== existing) {
    existing = path.dirname(existing);
  }
  const real = realpathSync.native(existing);
  if (real !== root && !real.startsWith(`${root}${path.sep}`)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `Relationship shard follows a symlink outside the workspace: ${shardPath}`,
    );
  }
}

function restoreRelationshipShard(
  shardPath: string,
  before: string | null,
): void {
  if (before === null) {
    try {
      unlinkSync(shardPath);
    } catch {
      // The file may already be absent after an interrupted atomic replace.
    }
    return;
  }
  writeFileSync(shardPath, before, "utf8");
}

export async function validateAppendOnlyVerificationReceipts(
  entity: Readonly<Record<string, unknown>>,
  context: OperationContext,
): Promise<void> {
  if (entity.type !== "test") return;
  const existing = await loadEntities(requireProlog(context), {
    id: String(entity.id),
    type: "test",
  });
  const previous = receiptRecords(existing[0]?.verification_receipts);
  if (!previous || previous.length === 0) return;
  const next = receiptRecords(entity.verification_receipts);
  const errors = appendOnlyVerificationReceiptHistoryErrors(previous, next);
  if (errors.length > 0) {
    throw new Error(`Entity validation failed: ${errors.join("; ")}`);
  }
}

export async function effectiveRelationships(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  context: OperationContext,
): Promise<readonly RelationshipInput[]> {
  const prolog = requireProlog(context);
  const exists = await prolog.query(
    `once(kb_entity('${escapeAtom(input.id)}', _, _))`,
  );
  if (!exists.success) return relationships;
  try {
    const current = (await existingRelationships(prolog, String(entity.id)))
      // An upsert owns only relationships whose source is the upserted entity.
      // Incoming relationships must not be copied into its validation or
      // canonical source projection.
      .filter((relationship) => relationship.from === input.id);
    const merged = new Map<string, RelationshipInput>();
    for (const relationship of [...current, ...relationships]) {
      const key = `${String(relationship.type)}\u0000${String(relationship.from)}\u0000${String(relationship.to)}`;
      // The explicit input wins so any supplied metadata is retained.
      merged.set(key, relationship);
    }
    return [...merged.values()];
  } catch (error) {
    if (error instanceof Error) return relationships;
    throw error;
  }
}

export async function executeUpsert(
  input: UpsertInput,
  context: OperationContext,
): Promise<OperationResult<UpsertPayload>> {
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
      `Upsert blocked: KB is attached through legacy branch storage (${branchAttachment.gitBranch} -> ${branchAttachment.kbBranch}). Run 'kibi branch migrate --from ${branchAttachment.kbBranch} --to ${branchAttachment.gitBranch} --apply' first.`,
    );
  }
  const prolog = requireProlog(context);
  let sourceWrite: Awaited<ReturnType<typeof writeSourceForUpsert>> = null;
  let commitEntity: Readonly<Record<string, unknown>> | undefined;
  let sourceRolledBack = false;
  let compiledCommitted = false;
  let relationshipCount = 0;
  let semanticAdvisor: SemanticAdvisorReceipt | undefined;
  const relationshipShardBefore = new Map<string, string | null>();
  try {
    const validated = validateUpsertInput(input, context.clock());
    await validateAppendOnlyVerificationReceipts(validated.entity, context);
    validateRelationshipSources(input.id, validated.relationships);
    await validateSymbolGranularity(
      validated.entity,
      validated.relationships,
      context,
    );
    const relationships = await effectiveRelationships(
      input,
      validated.entity,
      validated.relationships,
      context,
    );
    relationshipCount = validated.relationships.length;
    await validateStrictLanePairing(prolog, validated.relationships);
    await validateLiveRelationshipTargets(
      prolog,
      validated.entity,
      validated.relationships,
    );
    await validateSupersedesSourceHistory(
      prolog,
      validated.entity,
      validated.relationships,
      context.workspaceRoot,
    );
    const semantic = analyzeSemanticAdvisorInput({
      payload: { ...input, relationships },
    });
    semanticAdvisor = semantic.receipt;
    assertSemanticInventoryBoundary(
      { ...input, relationships },
      relationships,
      semantic.receipt,
    );
    await assertLogicalGroundingClaimKeys(
      prolog,
      { ...input, relationships },
      relationships,
    );
    if (context.fs !== undefined && context.sourceFirst !== false) {
      const existingRows = await loadEntities(prolog, {
        id: input.id,
        type: input.type,
      });
      const existing = existingRows[0];
      const existingSource =
        existing !== undefined && typeof existing.source === "string"
          ? existing.source
          : undefined;
      // Existing non-authored runtime sources (mcp://, test://, etc.) have no
      // tracked document to update unless the caller explicitly supplies one;
      // new entities are required to choose a source target in this
      // filesystem-capable context.
      if (
        input.document !== undefined ||
        existingSource?.match(/\.(?:md|mdx|ya?ml|json)$/i) ||
        // A filesystem-capable runtime is source-first for every new entity.
        // writeSourceForUpsert emits the typed DOCUMENT_PATH_REQUIRED request
        // when configuration has zero or multiple writable targets, rather
        // than silently creating compiled-only state.
        existing === undefined
      ) {
        sourceWrite = await writeSourceForUpsert(
          input,
          validated.entity,
          existing,
          context,
        );
        if (sourceWrite !== null) {
          // The authored path is the entity's canonical identity. Runtime
          // transport provenance (mcp://...) must never survive a source-first
          // write or a later delete/sync cycle.
          commitEntity = {
            ...validated.entity,
            source: sourceWrite.receipt.path,
          };
        }
      }
    }

    // Relationship shards are canonical source artifacts. Patch them before
    // the compiled transaction so a failed commit can restore exact bytes and
    // a successful commit never leaves a compiled-only relationship behind.
    if (context.fs !== undefined && validated.relationships.length > 0) {
      for (const relationship of validated.relationships) {
        const type =
          typeof relationship.type === "string" ? relationship.type : "";
        const from =
          typeof relationship.from === "string" ? relationship.from : input.id;
        const to = typeof relationship.to === "string" ? relationship.to : "";
        if (!type || !from || !to) continue;
        const shardPath = computeShardPath(
          path.join(context.workspaceRoot, ".kb"),
          from,
        );
        assertRelationshipShardContained(context.workspaceRoot, shardPath);
        if (!relationshipShardBefore.has(shardPath)) {
          relationshipShardBefore.set(
            shardPath,
            existsSync(shardPath) ? readFileSync(shardPath, "utf8") : null,
          );
        }
        appendRelationship(path.join(context.workspaceRoot, ".kb"), {
          type,
          from,
          to,
          created_at: context.clock().toISOString(),
          created_by: "kibi/upsert",
          source: "mcp://kibi/upsert",
        });
      }
    }
    const transaction = buildUpsertCommitGoal({
      entity: commitEntity ?? validated.entity,
      relationships: validated.relationships,
      skipContradictionCheck: input._skipContradictionCheck === true,
    });
    const written = await prolog.query(transaction);
    if (!written.success) {
      await sourceWrite?.rollback();
      sourceRolledBack = sourceWrite !== null;
      for (const [shardPath, before] of relationshipShardBefore) {
        restoreRelationshipShard(shardPath, before);
      }
      throw new Error(formatUpsertError(input.id, written.error));
    }
    compiledCommitted = true;
    // The combined commit is the sole mutation boundary. Invalidate reads only
    // after Prolog reports success so a failed/rolled-back commit does not
    // disturb callers' view of the current snapshot.
    prolog.invalidateCache?.();
    const changeKind = parseChangeKind(written.bindings.ChangeKind);
    if (changeKind === null) {
      throw new Error(
        `Upsert commit completed without a created/updated result for ${input.id}`,
      );
    }
    if (input.type === "symbol") {
      try {
        await refreshSymbolCoordinates(input.id, context);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
      }
    }
    const coverage = await scenarioCoverageWarnings(
      prolog,
      validated.relationships,
      input.type,
      input.id,
    );
    const created = changeKind === "created" ? 1 : 0;
    const shardWarnings: string[] = [];
    const relationshipSourceWrites: Array<{
      path: string;
      mode: "write";
      beforeHash: string | null;
      afterHash: string;
      created: boolean;
    }> = [];
    for (const [shardPath, before] of relationshipShardBefore) {
      const afterHash = fileHash(shardPath);
      const beforeHash = before === null ? null : textHash(before);
      if (afterHash === null || afterHash === beforeHash) continue;
      const relative = path
        .relative(context.workspaceRoot, shardPath)
        .replaceAll("\\", "/");
      writePendingSourceReceipt(context.workspaceRoot, relative, afterHash);
      relationshipSourceWrites.push({
        path: relative,
        mode: "write",
        beforeHash,
        afterHash,
        created: before === null,
      });
    }
    const payload: UpsertPayload = {
      created,
      updated: changeKind === "updated" ? 1 : 0,
      relationships_created: validated.relationships.length,
      warnings: [...semantic.warnings, ...coverage, ...shardWarnings],
      semanticAdvisor: semantic.receipt,
      ...(shardWarnings.length > 0
        ? {
            status: "committed_with_repairs" as const,
            effectFailures: shardWarnings.map((detail) => ({
              kind: "workspace-write",
              errorCode: "RELATIONSHIP_SHARD_WRITE_FAILED",
              detail,
            })),
            nextActions: [
              {
                operation: "kb_check",
                reason:
                  "Relationship shard publication failed after the KB commit; inspect the shard diagnostics and repair the canonical YAML before syncing.",
                required: true,
              },
            ],
          }
        : {}),
      ...(sourceWrite ? { sourceWrites: [sourceWrite.receipt] } : {}),
      ...(relationshipSourceWrites.length > 0
        ? {
            sourceWrites: [
              ...(sourceWrite ? [sourceWrite.receipt] : []),
              ...relationshipSourceWrites,
            ],
          }
        : {}),
      ...(input.type === "req"
        ? {
            contradictionCheck: {
              outcome: input._skipContradictionCheck
                ? "skipped"
                : "no-conflict",
              checked_req_id: input.id,
              strict_readiness:
                semantic.receipt.logic_readiness === "modeled"
                  ? "modeled"
                  : semantic.receipt.candidate_lane,
            },
          }
        : {}),
    };
    return {
      content: [
        {
          type: "text",
          text: `Upserted ${input.id} (${created > 0 ? "created" : "updated"}) with ${relationships.length} relationship(s).`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    if (!compiledCommitted) {
      for (const [shardPath, before] of relationshipShardBefore) {
        try {
          restoreRelationshipShard(shardPath, before);
        } catch {
          // Preserve the original failure; the next check/sync reports any
          // canonical source path that could not be restored.
        }
      }
    }
    if (!compiledCommitted && sourceWrite !== null && !sourceRolledBack) {
      try {
        await sourceWrite.rollback();
        sourceRolledBack = true;
      } catch {
        // Preserve the original mutation error; the recovery journal can
        // reconcile a failed source rollback on the next sync.
      }
    }
    if (compiledCommitted) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Upserted ${input.id}, but a derived effect requires repair.`,
          },
        ],
        structuredContent: {
          created: 0,
          updated: 0,
          relationships_created: relationshipCount,
          warnings: [detail],
          semanticAdvisor: semanticAdvisor as SemanticAdvisorReceipt,
          status: "committed_with_repairs",
          effectFailures: [
            {
              kind: "derived-effect",
              errorCode: "POST_COMMIT_EFFECT_FAILED",
              detail,
            },
          ],
          nextActions: [
            {
              operation: "kb_status",
              reason:
                "The compiled mutation committed; inspect the authoritative source and derived status before repairing.",
              required: true,
            },
            {
              operation: "kb_sync",
              reason:
                "Recompile canonical source files after the committed derived effect failure; do not retry the original upsert.",
              required: true,
            },
          ],
        },
      };
    }
    if (error instanceof OperationError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Upsert execution failed: ${message}`);
  }
}
