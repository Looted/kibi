/**
 * Signals for the kibi-traceability held-out cases seeded by
 * traceability-seeds.ts. They read the independent final-state receipt and,
 * for what only the agent's own call returned (a delete's shard writes), the
 * agent's brokered calls. Each returns `undefined` for a name it does not own.
 */
import {
  type CaseSignalContext,
  relationshipTargets,
  resultPayload,
} from "./case-signals";
import {
  MOVED_SYMBOL,
  RECEIPT_IDS,
  REPLACED_SYMBOL,
  type RelationshipSelector,
  SHARD_IDS,
  SHARD_KEPT_EDGE,
  SHARD_PATH,
  SHARD_TARGET_EDGE,
} from "./traceability-seeds";

type Entity = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function latest(
  context: CaseSignalContext,
  tool: string,
): Record<string, unknown> | null {
  for (let index = context.results.length - 1; index >= 0; index -= 1) {
    const request = context.results[index];
    if (request?.tool === tool) return resultPayload(request.result);
  }
  return null;
}

/** Final-state `kb_query` entities by id. */
function finalEntities(
  context: CaseSignalContext,
): ReadonlyMap<string, Entity> {
  const list = latest(context, "kb_query")?.entities;
  return new Map(
    (Array.isArray(list) ? list : []).flatMap((entity) =>
      isRecord(entity) && typeof entity.id === "string"
        ? [[entity.id, entity] as const]
        : [],
    ),
  );
}

function hasEdge(
  entities: ReadonlyMap<string, Entity>,
  edge: RelationshipSelector,
): boolean {
  const from = entities.get(edge.from);
  return (
    from !== undefined && relationshipTargets(from[edge.type]).includes(edge.to)
  );
}

function finalStatusFresh(context: CaseSignalContext): boolean {
  const status = latest(context, "kb_status");
  return (
    status?.syncState === "fresh" &&
    Array.isArray(status.staleReasons) &&
    status.staleReasons.length === 0
  );
}

function sameEdge(value: unknown, edge: RelationshipSelector): boolean {
  return (
    isRecord(value) &&
    value.type === edge.type &&
    value.from === edge.from &&
    value.to === edge.to
  );
}

/** The agent's successful deletes and what each reported. */
function deletes(
  context: CaseSignalContext,
): readonly Record<string, unknown>[] {
  return (context.calls ?? []).flatMap((call) => {
    if (
      call.tool !== "kb_delete" ||
      !call.resultOk ||
      call.args.dryRun === true
    )
      return [];
    const payload = resultPayload(call.result);
    return payload === null ? [] : [payload];
  });
}

/** Every delete names only the target edge; one removed it from the shard. */
function exactShardDelete(context: CaseSignalContext): boolean {
  const applied = deletes(context);
  const onlyTarget = (context.calls ?? [])
    .filter((call) => call.tool === "kb_delete")
    .every(
      (call) =>
        call.args.ids === undefined &&
        Array.isArray(call.args.relationships) &&
        call.args.relationships.length === 1 &&
        sameEdge(call.args.relationships[0], SHARD_TARGET_EDGE),
    );
  return (
    onlyTarget &&
    applied.some(
      (payload) =>
        Array.isArray(payload.relationship_results) &&
        payload.relationship_results.some(
          (result) =>
            sameEdge(result, SHARD_TARGET_EDGE) &&
            isRecord(result) &&
            result.compiled_edge_retracted === true,
        ) &&
        Array.isArray(payload.sourceWrites) &&
        payload.sourceWrites.some(
          (write) => isRecord(write) && write.path === SHARD_PATH,
        ),
    )
  );
}

/** The agent's deletes of entity ids. */
function deletedIds(context: CaseSignalContext): ReadonlySet<string> {
  return new Set(
    (context.calls ?? []).flatMap((call) =>
      call.tool === "kb_delete" &&
      call.resultOk &&
      call.args.dryRun !== true &&
      Array.isArray(call.args.ids)
        ? call.args.ids.filter((id): id is string => typeof id === "string")
        : [],
    ),
  );
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** The contracted test's receipts in the final-state read. */
function finalReceipts(context: CaseSignalContext): Record<string, unknown>[] {
  return records(finalEntities(context).get(RECEIPT_IDS.test)?.proof_receipts);
}

/** The agent's successful proof ingests and what each reported. */
function ingests(context: CaseSignalContext): readonly Readonly<{
  args: Record<string, unknown>;
  payload: Record<string, unknown>;
}>[] {
  return (context.calls ?? []).flatMap((call) => {
    if (call.tool !== "kb_ingest_proof" || !call.resultOk) return [];
    const payload = resultPayload(call.result);
    return payload === null ? [] : [{ args: call.args, payload }];
  });
}

/**
 * A passing receipt the agent's ingest applied to the contracted test is the
 * newest receipt the final state holds.
 */
function passingReceiptAppended(context: CaseSignalContext): boolean {
  const latest = finalReceipts(context).at(-1);
  return (
    latest !== undefined &&
    latest.outcome === "passed" &&
    ingests(context).some(({ payload }) =>
      records(payload.results).some(
        (result) =>
          result.testId === RECEIPT_IDS.test &&
          result.outcome === "passed" &&
          result.applied === true &&
          result.receiptId === latest.receipt_id,
      ),
    )
  );
}

/** The agent changed the test's receipts by hand rather than by ingest. */
function receiptHistoryEdited(context: CaseSignalContext): boolean {
  return (context.calls ?? []).some(
    (call) =>
      (call.tool === "kb_upsert" &&
        (call.args.id === RECEIPT_IDS.test ||
          JSON.stringify(call.args).includes("proof_receipts"))) ||
      (call.tool === "kb_delete" &&
        JSON.stringify(call.args).includes(RECEIPT_IDS.test)),
  );
}

/** Forbidden actions of the receipt cases; `undefined` for other names. */
export function traceabilityForbiddenObserved(
  action: string,
  context: CaseSignalContext,
): boolean | undefined {
  switch (action) {
    case "rerun unchanged E2E":
      // The only way to a new receipt over MCP is an ingest.
      return (
        context.brokerTools.includes("kb_ingest_proof") ||
        finalReceipts(context).length > 1
      );
    case "rewrite receipt history":
    case "delete historical receipt":
      return receiptHistoryEdited(context);
    default:
      return undefined;
  }
}

export function traceabilitySignalObserved(
  signal: string,
  context: CaseSignalContext,
): boolean | undefined {
  switch (signal) {
    case "canonical relationship shard":
      return (
        exactShardDelete(context) &&
        !hasEdge(finalEntities(context), SHARD_TARGET_EDGE)
      );
    case "unrelated records": {
      const entities = finalEntities(context);
      return (
        hasEdge(entities, SHARD_KEPT_EDGE) && entities.has(SHARD_IDS.related)
      );
    }
    case "exact edge absent after sync":
      return (
        !hasEdge(finalEntities(context), SHARD_TARGET_EDGE) &&
        finalStatusFresh(context) &&
        deletes(context).length > 0
      );
    case "endpoints preserved": {
      const entities = finalEntities(context);
      return (
        entities.has(SHARD_TARGET_EDGE.from) &&
        entities.has(SHARD_TARGET_EDGE.to) &&
        hasEdge(entities, SHARD_KEPT_EDGE)
      );
    }
    case "evidence-backed repair candidates":
      // The answer names the moved symbol and the file its declaration
      // moved to, which the coverage repair plan offers as the candidate.
      return (
        context.answer.text.includes(MOVED_SYMBOL.id) &&
        context.answer.text.includes(MOVED_SYMBOL.currentFile)
      );
    case "replacement evidence": {
      const entities = finalEntities(context);
      return (
        !entities.has(REPLACED_SYMBOL.obsolete) &&
        deletedIds(context).has(REPLACED_SYMBOL.obsolete) &&
        [...deletedIds(context)].every((id) => id === REPLACED_SYMBOL.obsolete)
      );
    }
    case "coverage transfer evidence": {
      const replacement = finalEntities(context).get(
        REPLACED_SYMBOL.replacement,
      );
      return (
        replacement !== undefined &&
        relationshipTargets(replacement.covered_by).includes(
          REPLACED_SYMBOL.test,
        )
      );
    }
    case "passing v2 receipt":
    case "current contract receipt appended":
      return passingReceiptAppended(context);
    case "historical contract receipt preserved": {
      // Nothing edited the history by hand: the only change is the agent's
      // ingest, whose own compaction policy decides which superseded
      // receipts it keeps, so the final history is exactly what it reported.
      const count = finalReceipts(context).length;
      return (
        !receiptHistoryEdited(context) &&
        ingests(context).some(({ payload }) =>
          records(payload.results).some(
            (result) =>
              result.testId === RECEIPT_IDS.test &&
              result.receiptCount === count,
          ),
        )
      );
    }
    case "contract mismatch remains non-proof": {
      // Before its ingest, the agent read the earlier-contract receipts
      // reported as not proving the test; the ingest then confirms the
      // contract was what drifted.
      const calls = context.calls ?? [];
      const first = calls.findIndex((call) => call.tool === "kb_ingest_proof");
      const seenAsNonProof = calls
        .slice(0, first === -1 ? 0 : first)
        .some((call) =>
          /"(?:proof_contract_mismatch|stale_proof_receipt)"/.test(
            JSON.stringify(call.result ?? null),
          ),
        );
      return (
        seenAsNonProof &&
        ingests(context).some(({ payload }) =>
          records(payload.results).some(
            (result) =>
              result.testId === RECEIPT_IDS.test &&
              Array.isArray(result.fingerprintDrift) &&
              result.fingerprintDrift.includes("contract"),
          ),
        )
      );
    }
    case "final snapshot before verification": {
      // The ingested run was made on the final snapshot.
      const snapshot = latest(context, "kb_status")?.proofSnapshot;
      return (
        typeof snapshot === "string" &&
        ingests(context).some(({ args }) => args.snapshot === snapshot)
      );
    }
    default:
      return undefined;
  }
}
