import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { escapeAtom } from "../../prolog/codec.js";
import { OperationError } from "../../cli-errors.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
// implements REQ-kibi-operation-interface-parity
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { appendOnlyVerificationReceiptHistoryErrors } from "../../public/verification-receipt.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  assertLogicalGroundingClaimKeys,
  assertSemanticInventoryBoundary,
} from "../semantic-advisor/ingestion-boundary.js";
import { buildUpsertCommitGoal, formatUpsertError } from "./contradictions.js";
import {
  existingRelationships,
  validateLiveRelationshipTargets,
  validateRelationshipSources,
  validateStrictLanePairing,
} from "./relationships.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import { refreshSymbolCoordinates } from "./symbol-refresh.js";
import {
  writePendingSourceReceipt,
  writeSourceForUpsert,
} from "./source-authoring.js";
import { appendRelationship, computeShardPath } from "../../relationships/shards.js";
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
  if (input.relationships !== undefined && input.relationships.length > 0) {
    return relationships;
  }
  const prolog = requireProlog(context);
  const exists = await prolog.query(
    `once(kb_entity('${escapeAtom(input.id)}', _, _))`,
  );
  if (!exists.success) return relationships;
  try {
    const current = await existingRelationships(prolog, String(entity.id));
    return current.length > 0 ? current : relationships;
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
  if (branchAttachment.migrationRequired && (context.branchAttachment !== undefined || context.fs !== undefined)) {
    throw new Error(
      `Upsert blocked: KB is attached through legacy branch storage (${branchAttachment.gitBranch} -> ${branchAttachment.kbBranch}). Run 'kibi branch migrate --from ${branchAttachment.kbBranch} --to ${branchAttachment.gitBranch} --apply' first.`,
    );
  }
  const prolog = requireProlog(context);
  let sourceWrite: Awaited<ReturnType<typeof writeSourceForUpsert>> = null;
  let commitEntity: Readonly<Record<string, unknown>> | undefined;
  let sourceRolledBack = false;
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
    await validateStrictLanePairing(prolog, relationships);
    await validateLiveRelationshipTargets(
      prolog,
      validated.entity,
      relationships,
    );
    const semantic = analyzeSemanticAdvisorInput({
      payload: { ...input, relationships },
    });
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
    const transaction = buildUpsertCommitGoal({
      entity: commitEntity ?? validated.entity,
      relationships,
      skipContradictionCheck: input._skipContradictionCheck === true,
    });
    const written = await prolog.query(transaction);
    if (!written.success) {
      await sourceWrite?.rollback();
      sourceRolledBack = sourceWrite !== null;
      throw new Error(formatUpsertError(input.id, written.error));
    }
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
      beforeHash: string | null;
      afterHash: string;
      created: boolean;
    }> = [];
    if (context.fs !== undefined && relationships.length > 0) {
      for (const relationship of relationships) {
        const type = typeof relationship.type === "string" ? relationship.type : "";
        const from = typeof relationship.from === "string" ? relationship.from : input.id;
        const to = typeof relationship.to === "string" ? relationship.to : "";
        if (!type || !from || !to) continue;
        try {
          const shardPath = computeShardPath(
            path.join(context.workspaceRoot, ".kb"),
            from,
          );
          const beforeHash = fileHash(shardPath);
          // Relationship YAML is a tracked source artifact under the workspace
          // .kb root. The hashed branch directory is compiled output only.
          appendRelationship(path.join(context.workspaceRoot, ".kb"), {
            type,
            from,
            to,
            created_at: context.clock().toISOString(),
            created_by: "kibi/upsert",
            source: "mcp://kibi/upsert",
          });
          const afterHash = fileHash(shardPath);
          if (afterHash !== null && afterHash !== beforeHash) {
            writePendingSourceReceipt(
              context.workspaceRoot,
              path.relative(context.workspaceRoot, shardPath).replaceAll("\\", "/"),
              afterHash,
            );
            relationshipSourceWrites.push({
              path: path.relative(context.workspaceRoot, shardPath).replaceAll("\\", "/"),
              beforeHash,
              afterHash,
              created: beforeHash === null,
            });
          }
        } catch (error) {
          shardWarnings.push(
            `Relationship shard update failed for ${type} ${from}->${to}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    const payload: UpsertPayload = {
      created,
      updated: changeKind === "updated" ? 1 : 0,
      relationships_created: relationships.length,
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
        ? { sourceWrites: [...(sourceWrite ? [sourceWrite.receipt] : []), ...relationshipSourceWrites] }
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
    if (sourceWrite !== null && !sourceRolledBack) {
      try {
        await sourceWrite.rollback();
        sourceRolledBack = true;
      } catch {
        // Preserve the original mutation error; the recovery journal can
        // reconcile a failed source rollback on the next sync.
      }
    }
    if (error instanceof OperationError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Upsert execution failed: ${message}`);
  }
}
