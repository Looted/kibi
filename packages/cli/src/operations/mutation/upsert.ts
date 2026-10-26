import { createHash } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { InputError, OperationError } from "../../cli-errors.js";
import {
  DEFAULT_FIRMNESS,
  carriesFirmness,
  firmnessRef,
  isFirmness,
} from "../../decision-firmness.js";
import { readManifestWithCoordinateOverlay } from "../../extractors/manifest.js";
import { extractManifestSymbolRecords } from "../../extractors/manifest.js";
import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
// implements REQ-kibi-operation-interface-parity
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { appendOnlyProofReceiptHistoryErrors } from "../../public/proof-receipt.js";
import {
  appendRelationship,
  computeShardPath,
} from "../../relationships/shards.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import { canonicalFilesystemPath } from "../../utils/canonical-path.js";
import { entityIdStyleWarnings } from "../../utils/entity-id-style.js";
import { CANONICAL_ENTITY_PATHS } from "../../utils/kb-paths.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  assertLogicalGroundingClaimKeys,
  assertSemanticInventoryBoundary,
} from "../semantic-advisor/ingestion-boundary.js";
import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";
import { entityContextWarnings } from "./context-warning.js";
import { buildUpsertCommitGoal, formatUpsertError } from "./contradictions.js";
import { assertFirmDecisionUnchanged } from "./firm-decision-guard.js";
import { withStoredOmittedProperties } from "./omitted-properties.js";
import { resolveUpsertOrigin } from "./origin.js";
import {
  planRecoveryNotes,
  settlePendingPlanApplyJournals,
  withPlanRecoveryNotes,
} from "./plan-apply-journal.js";
import { assertPredicateArgumentVocabulary } from "./predicate-vocabulary-guard.js";
import {
  existingRelationships,
  validateLiveRelationshipTargets,
  validateRelationshipSources,
  validateStrictLanePairing,
  validateSupersedesSourceHistory,
} from "./relationships.js";
import {
  assertStoredRequirementBoundary,
  withStoredRequirementSemantics,
} from "./requirement-semantics.js";
import { MutationRollbackFailureError, MutationSaga } from "./saga.js";
import {
  readFileTimes,
  restoreFileTimes,
  writePendingSourceReceipt,
  writeSourceForUpsert,
} from "./source-authoring.js";
import {
  type StoredEntityLookup,
  storedEntityLookup,
} from "./stored-entity.js";
import {
  type SymbolCompilerLockHandle,
  acquireSymbolCompilerLock,
  releaseSymbolCompilerLock,
} from "./symbol-compiler-lock.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import { refreshSymbolCoordinatesForManifest } from "./symbol-refresh.js";
import type {
  RelationshipInput,
  StagedUpsertState,
  UpsertInput,
  UpsertPayload,
  ValidatedUpsert,
} from "./types.js";
import {
  type UncompiledAuthoredSource,
  assertAuthoredWriteCompiles,
  authoredEntityLookup,
  readUncompiledAuthoredSource,
} from "./uncompiled-source.js";
import { validateUpsertInput } from "./validation.js";
import {
  scenarioCoverageWarnings,
  symbolCoverageWarnings,
} from "./warnings.js";
import {
  type WorkspaceMutationLockHandle,
  acquireWorkspaceMutationLock,
  releaseWorkspaceMutationLock,
} from "./workspace-mutation-lock.js";

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

/**
 * The claim_key a written fact carries, derived from claim_text at
 * validation when the payload did not supply it, echoed so the writer
 * knows the grounding key without a kb_query.
 */
// implements REQ-upsert-committed-claim-key
function storedClaimKey(
  entity: Readonly<Record<string, unknown>>,
): { claimKey: string } | Record<string, never> {
  return entity.type === "fact" && typeof entity.claim_key === "string"
    ? { claimKey: entity.claim_key }
    : {};
}

// implements REQ-mcp-semantic-advisor-preflight
/** The written result's semantic advisor receipt, omitted for a non-requirement. */
function advisorReceipt(
  receipt: SemanticAdvisorReceipt | null,
): { semanticAdvisor: SemanticAdvisorReceipt } | Record<string, never> {
  return receipt === null ? {} : { semanticAdvisor: receipt };
}

function fileHash(pathname: string): string | null {
  if (!existsSync(pathname)) return null;
  return createHash("sha256").update(readFileSync(pathname)).digest("hex");
}

function textHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// implements REQ-core-atomic-upsert-persistence
export function assertRelationshipShardContained(
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
  const realRoot = canonicalFilesystemPath(root);
  const real = canonicalFilesystemPath(absolute);
  if (real !== realRoot && !real.startsWith(`${realRoot}${path.sep}`)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `Relationship shard follows a symlink outside the workspace: ${shardPath}`,
    );
  }
}

function restoreRelationshipShard(
  shardPath: string,
  before: string | null,
  expectedAfterHash: string | null,
  beforeTimes: ReturnType<typeof readFileTimes> = null,
): void {
  // Compare before restore: a concurrent writer may have replaced the shard
  // after our append. Never clobber newer bytes; the next check/sync reports
  // any canonical source path that needs reconciliation.
  if (expectedAfterHash !== null) {
    let currentHash: string | null = null;
    try {
      currentHash = fileHash(shardPath);
    } catch {
      currentHash = null;
    }
    if (currentHash !== expectedAfterHash) {
      console.warn(
        `Skipped relationship shard rollback for ${path.relative(process.cwd(), shardPath)}: shard changed after the Kibi write.`,
      );
      return;
    }
  }
  if (before === null) {
    try {
      unlinkSync(shardPath);
    } catch {
      // The file may already be absent after an interrupted atomic replace.
    }
    return;
  }
  writeFileSync(shardPath, before, "utf8");
  // implements REQ-core-atomic-upsert-persistence
  // Freshness compares file times with the compiled snapshot; a restored
  // shard with a new time would read as a newer source after a refusal.
  restoreFileTimes(shardPath, beforeTimes);
}

/** Test fields the stored receipts were recorded against. */
const RECEIPT_BOUND_FIELDS = [
  "verification_scope",
  "verification_perspective",
] as const;

/**
 * Check a test write against the stored proof receipt history, which is
 * append-only. An update that omits `proof_receipts` keeps the stored history
 * (an update keeps every property it leaves out): the stored receipts are
 * returned for the write to carry, with the verification scope and
 * perspective they were recorded against. Undefined when there is nothing to
 * carry.
 */
// implements REQ-kb-upsert-keeps-omitted-proof-receipts
export async function validateAppendOnlyProofReceipts(
  entity: Readonly<Record<string, unknown>>,
  context: OperationContext,
  staged?: StagedUpsertState,
): Promise<Readonly<Record<string, unknown>> | undefined> {
  if (entity.type !== "test") return undefined;
  // An earlier plan step that writes the same test is the history this
  // write must extend.
  const planned = staged?.entities.get(String(entity.id));
  const existing =
    planned !== undefined
      ? planned.type === "test"
        ? [planned]
        : []
      : await loadEntities(requireProlog(context), {
          id: String(entity.id),
          type: "test",
        });
  const previous = receiptRecords(existing[0]?.proof_receipts);
  if (!previous || previous.length === 0) return undefined;
  if (entity.proof_receipts === undefined) {
    // The receipts bind the test's verification scope, so it travels too.
    const stored = existing[0] as Readonly<Record<string, unknown>>;
    return {
      proof_receipts: previous,
      ...Object.fromEntries(
        RECEIPT_BOUND_FIELDS.filter(
          (field) =>
            entity[field] === undefined && stored?.[field] !== undefined,
        ).map((field) => [field, stored[field]]),
      ),
    };
  }
  const next = receiptRecords(entity.proof_receipts);
  const errors = appendOnlyProofReceiptHistoryErrors(previous, next);
  if (errors.length > 0) {
    throw new Error(`Entity validation failed: ${errors.join("; ")}`);
  }
  return undefined;
}

export async function effectiveRelationships(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  context: OperationContext,
  staged?: StagedUpsertState,
  lookup?: StoredEntityLookup,
): Promise<readonly RelationshipInput[]> {
  const prolog = requireProlog(context);
  // Relationships an earlier plan step adds from this entity will exist when
  // this upsert runs.
  const plannedOwn = (staged?.relationships ?? []).filter(
    (relationship) => relationship.from === input.id,
  );
  const resolved = lookup ?? storedEntityLookup(prolog, input.id, input.type);
  const exists = await resolved.exists();
  if (!exists && plannedOwn.length === 0) return relationships;
  try {
    const current = exists
      ? (
          resolved.relationships ??
          (await existingRelationships(prolog, String(entity.id)))
        )
          // An upsert owns only relationships whose source is the upserted
          // entity. Incoming relationships must not be copied into its
          // validation or canonical source projection.
          .filter((relationship) => relationship.from === input.id)
      : [];
    const merged = new Map<string, RelationshipInput>();
    for (const relationship of [...current, ...plannedOwn, ...relationships]) {
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

/**
 * Re-extract one complete canonical symbol entity from the authored manifest
 * plus the freshly published generated coordinate artifact. Source-first
 * commits must match exactly what the next sync would compile, instead of
 * hand-merging generated fields into the caller's partial payload.
 */
function reextractCanonicalSymbolEntity(
  symbolId: string,
  authoredRelativePath: string,
  workspaceRoot: string,
): Record<string, unknown> | null {
  const absoluteManifest = path.resolve(workspaceRoot, authoredRelativePath);
  let records: ReturnType<typeof readManifestWithCoordinateOverlay>;
  try {
    records = readManifestWithCoordinateOverlay(absoluteManifest);
  } catch (error) {
    throw new Error(
      `Canonical symbol manifest ${authoredRelativePath} could not be compiled after coordinate refresh: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const mine = records.find((candidate) => candidate.id === symbolId);
  if (mine === undefined) return null;
  const [result] = extractManifestSymbolRecords([mine], absoluteManifest);
  if (result === undefined) return null;
  return {
    ...(result.entity as unknown as Record<string, unknown>),
    ...(result.sourceFile === undefined
      ? {}
      : { sourceFile: result.sourceFile }),
  };
}

// implements REQ-kibi-truthful-consistency
export type UpsertValidationOptions = Readonly<{
  /** Skip the append-only receipt check (kibi proof prune only). */
  readonly allowReceiptsPrune?: boolean;
  /**
   * What earlier steps of the same plan will have written when this upsert
   * runs. Entities and relationships they create count as present.
   */
  readonly staged?: StagedUpsertState;
}>;

// implements REQ-mcp-semantic-advisor-preflight
/** The semantic advisor result an upsert reports; no receipt for a non-requirement. */
export type UpsertSemanticAnalysis = Readonly<{
  readonly receipt: SemanticAdvisorReceipt | null;
  readonly warnings: readonly string[];
}>;

// implements REQ-mcp-semantic-advisor-preflight
/**
 * The semantic advisor analyses requirement prose: its propositions, claim
 * keys and inventory contract describe a requirement. Any other entity has no
 * prose inventory, so analysing its title (the fallback prose) would report
 * claim keys nothing declares, for example a fact whose claim_key derives
 * from claim_text. Its upsert carries no receipt.
 */
export function analyzeUpsertSemantics(
  payload: UpsertInput & {
    readonly relationships: readonly RelationshipInput[];
  },
): UpsertSemanticAnalysis {
  if (payload.type !== "req") return { receipt: null, warnings: [] };
  const semantic = analyzeSemanticAdvisorInput({ payload });
  assertSemanticInventoryBoundary(
    payload,
    payload.relationships,
    semantic.receipt,
  );
  return semantic;
}

// implements REQ-kibi-truthful-consistency
export type UpsertValidation = Readonly<{
  readonly validated: ValidatedUpsert;
  /**
   * The authored file the write merges into although the store does not
   * hold the entity; absent for an ordinary create or update.
   */
  readonly uncompiledSource?: UncompiledAuthoredSource;
  /** The upsert's relationships merged with the entity's existing ones. */
  readonly relationships: readonly RelationshipInput[];
  readonly semantic: UpsertSemanticAnalysis;
}>;

// implements REQ-kibi-truthful-consistency
/**
 * The complete validation an upsert passes before its first write: schema,
 * append-only proof receipts, relationship sources, symbol granularity,
 * strict-lane pairing, live relationship targets, supersedes direction,
 * proposition-complete ingestion, logical grounding claim keys and predicate
 * argument vocabulary. executeUpsert runs it for every write, and
 * kb_apply_plan runs it for every plan step before the plan's first write,
 * passing the earlier steps' writes as `staged`.
 */
export async function validateUpsertForCommit(
  payload: UpsertInput,
  context: OperationContext,
  options: UpsertValidationOptions = {},
): Promise<UpsertValidation> {
  const prolog = requireProlog(context);
  const staged = options.staged;
  // The payload must be valid on its own before the store is read.
  const checked = validateUpsertInput(payload, context.clock());
  validateRelationshipSources(payload.id, checked.relationships);
  // Symbol granularity of a payload that names its source file reads only the
  // payload and that file, so it runs before the store is read.
  await validateSymbolGranularity(
    checked.entity,
    checked.relationships,
    context,
  );
  // One read of the entity this upsert replaces, shared by the ledger merge
  // and the stored origin below.
  let lookup = storedEntityLookup(prolog, payload.id, payload.type);
  // implements REQ-kibi-uncompiled-source-visibility
  // An entity missing from the store whose authored file exists (one sync
  // could not extract, or one written since the last sync) is an update of
  // that file, not a create: the writer merges into it. Judge the write
  // against the file's own state so every stored-state check applies.
  const uncompiledSource =
    staged?.entities.has(payload.id) === true || (await lookup.exists())
      ? null
      : await readUncompiledAuthoredSource(context, payload);
  if (uncompiledSource !== null)
    lookup = authoredEntityLookup(uncompiledSource);
  // implements REQ-kibi-symbol-link-guidance
  // An update that only adds links keeps the stored sourceFile: judge the
  // symbol as it will be stored, so a coarse link is refused here rather
  // than later by the staged gate.
  if (checked.entity.sourceFile === undefined)
    await validateSymbolGranularity(
      checked.entity,
      checked.relationships,
      context,
      async () => staged?.entities.get(payload.id) ?? (await lookup.entity()),
    );
  const withSemantics = await withStoredRequirementSemantics(
    payload,
    prolog,
    staged,
    lookup,
  );
  // An uncompiled file is judged as the writer will patch it (below), so only
  // a compiled entity lends its omitted properties to the stored write.
  let input =
    uncompiledSource === null
      ? await withStoredOmittedProperties(withSemantics, lookup, staged)
      : withSemantics;
  let validated =
    input === payload ? checked : validateUpsertInput(input, context.clock());
  if (uncompiledSource !== null)
    lookup = {
      ...lookup,
      relationships: assertAuthoredWriteCompiles(
        uncompiledSource,
        input,
        validated.entity,
      ),
    };
  if (options.allowReceiptsPrune !== true) {
    const kept = await validateAppendOnlyProofReceipts(
      validated.entity,
      context,
      staged,
    );
    if (kept !== undefined) {
      input = {
        ...input,
        properties: { ...input.properties, ...kept },
      };
      validated = validateUpsertInput(input, context.clock());
    }
  }
  const relationships = await effectiveRelationships(
    input,
    validated.entity,
    validated.relationships,
    context,
    staged,
    lookup,
  );
  await validateStrictLanePairing(prolog, validated.relationships, staged);
  await validateLiveRelationshipTargets(
    prolog,
    validated.entity,
    validated.relationships,
    staged,
  );
  await validateSupersedesSourceHistory(
    prolog,
    validated.entity,
    validated.relationships,
    context.workspaceRoot,
    undefined,
    staged,
  );
  const semantic = analyzeUpsertSemantics({ ...input, relationships });
  await assertStoredRequirementBoundary(
    input,
    relationships,
    prolog,
    staged,
    lookup,
  );
  await assertLogicalGroundingClaimKeys(
    prolog,
    { ...input, relationships },
    relationships,
    staged,
  );
  await assertPredicateArgumentVocabulary(prolog, validated.entity, staged);
  await assertFirmDecisionUnchanged(payload, context.workspaceRoot, lookup);
  // The origin the write records is added last: none of the checks above
  // reads it, and a rejected payload never pays for the stored-origin read.
  const recorded = await resolveUpsertOrigin(
    input,
    prolog,
    context.clock(),
    staged,
    lookup,
  );
  const decided = await resolveUpsertFirmness(recorded, staged, lookup);
  return {
    validated:
      decided === input
        ? validated
        : validateUpsertInput(decided, context.clock()),
    relationships,
    semantic,
    ...(uncompiledSource !== null ? { uncompiledSource } : {}),
  };
}

/**
 * The firmness a requirement or ADR write records. An update that omits
 * `firmness` keeps the stored value, so the compiled entity matches the
 * authored front matter. A decision left firm must name the human words it
 * rests on, so an agent cannot promote its own choice: it is judged as it
 * will be written, with the origin this write records and the stored
 * `approval_ref` when the write omits one. kb_check enforces the same rule on
 * authored sources.
 */
// implements REQ-kb-decision-firmness
async function resolveUpsertFirmness(
  input: UpsertInput,
  staged: StagedUpsertState | undefined,
  lookup: StoredEntityLookup,
): Promise<UpsertInput> {
  if (!carriesFirmness(input.type)) return input;
  const properties = input.properties as Record<string, unknown>;
  if (properties.firmness !== undefined && properties.firmness !== "firm")
    return input;
  const stored =
    properties.firmness === undefined || properties.approval_ref === undefined
      ? (staged?.entities.get(input.id) ?? (await lookup.entity()) ?? undefined)
      : undefined;
  const firmness = properties.firmness ?? stored?.firmness;
  if (!isFirmness(firmness) || firmness === DEFAULT_FIRMNESS) return input;
  if (
    firmness === "firm" &&
    firmnessRef({
      type: input.type,
      origin: properties.origin,
      approval_ref: properties.approval_ref ?? stored?.approval_ref,
    }) === undefined
  ) {
    throw new Error(
      `Entity validation failed: firmness: firm needs origin.ref${input.type === "req" ? " (or approval_ref)" : ""} pointing at the human words that state the rule; use firmness: default for a delegated or agent choice`,
    );
  }
  return properties.firmness === firmness
    ? input
    : ({
        ...input,
        properties: { ...input.properties, firmness },
      } as UpsertInput);
}

// implements REQ-kibi-operation-interface-parity
export type UpsertExecutionOptions = Readonly<{
  /**
   * Internal escape hatch for proof-receipt ingest: when provided, the
   * authored document is written with exactly these bytes instead of the
   * canonical re-render. Receipt appends must not canonicalize unrelated
   * frontmatter — a mid-campaign reformat would change the workspace
   * snapshot hash and make every later `kibi prove` integration refuse.
   */
  // implements REQ-kibi-operation-interface-parity
  readonly sourceDocumentOverride?: string;
  /**
   * Internal escape hatch for `kibi proof prune`: the prune maintenance
   * command deliberately shrinks a test's receipt history to its newest
   * entries. Everything else keeps the append-only invariant fail-closed.
   */
  readonly allowReceiptsPrune?: boolean;
  /**
   * Prepare source and validation, then return the commit payload without
   * talking to Prolog. Proof ingest batches those payloads into one
   * transaction.
   */
  readonly deferCompiledCommit?: boolean;
}>;

// implements REQ-kibi-operation-interface-parity
/**
 * Whether a source-first upsert publishes an authored document, and the
 * stored entity it updates (undefined for a create). Null when the write
 * touches no document: no filesystem, a compiled-only runtime, or an
 * existing entity whose runtime source (mcp://, test://, etc.) has no
 * tracked document and the caller names none. A new entity always gets a
 * document in a filesystem-capable runtime: writeSourceForUpsert emits the
 * typed DOCUMENT_PATH_REQUIRED request when configuration has zero or
 * multiple writable targets, rather than silently creating compiled-only
 * state. The write and its dry run share this decision.
 */
export async function sourceWriteScope(
  input: UpsertInput,
  context: OperationContext,
): Promise<{
  readonly existing: Readonly<Record<string, unknown>> | undefined;
} | null> {
  if (
    context.fs === undefined ||
    context.sourceFirst === false ||
    context.prolog === undefined
  )
    return null;
  const existing = (
    await loadEntities(context.prolog, { id: input.id, type: input.type })
  )[0];
  const existingSource =
    typeof existing?.source === "string" ? existing.source : undefined;
  if (
    input.document !== undefined ||
    existingSource?.match(/\.(?:md|mdx|ya?ml|json)$/i) ||
    existing === undefined
  )
    return { existing };
  return null;
}

// implements REQ-kibi-operation-interface-parity
/**
 * A dry run is the former kb_validate_upsert preflight on the kb_upsert
 * surface: the same validation and semantic advisor receipt, no KB or
 * workspace write, and both write effects reported as skipped.
 */
async function dryRunUpsert(
  input: UpsertInput,
  context: OperationContext,
): Promise<OperationResult<UpsertPayload>> {
  const { dryRun: _dryRun, ...payload } = input;
  const { executeValidateUpsert } = await import("./validate-upsert.js");
  const result = await executeValidateUpsert(payload, context);
  return {
    content: result.content,
    structuredContent: {
      ...result.structuredContent,
      dryRun: true,
      skippedEffects: ["kb-write", "workspace-write"],
    } as unknown as UpsertPayload,
  };
}

export async function executeUpsert(
  input: UpsertInput,
  context: OperationContext,
  options: UpsertExecutionOptions = {},
): Promise<OperationResult<UpsertPayload>> {
  if (input.dryRun === true) return dryRunUpsert(input, context);
  // implements REQ-model-what-if-planned-facts
  if (input.plannedFacts !== undefined)
    throw new Error(
      `Upsert of ${input.id} rejected: plannedFacts is a dryRun-only input. Write the planned facts first (kb_upsert each, or kb_apply_plan with the kb_model plan), then upsert ${input.id} without plannedFacts.`,
    );
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
  // Declared compensation list for the multi-surface mutation. Steps register
  // as they succeed (authored source -> relationship shards -> coordinates);
  // a failure rolls them back in reverse under the symbol compiler lock, and
  // the compiled commit marks the point of no return.
  const saga = new MutationSaga();
  let sourceWrite: Awaited<ReturnType<typeof writeSourceForUpsert>> = null;
  let commitEntity: Readonly<Record<string, unknown>> | undefined;
  let relationshipCount = 0;
  let changeKind: "created" | "updated" | null = null;
  let semanticAdvisor: SemanticAdvisorReceipt | null = null;
  let compilerLock: SymbolCompilerLockHandle | undefined;
  let sourceMutationLock: WorkspaceMutationLockHandle | undefined;
  let operationFailure: { readonly error: unknown } | undefined;
  const relationshipShardBefore = new Map<string, string | null>();
  const relationshipShardBeforeTimes = new Map<
    string,
    ReturnType<typeof readFileTimes>
  >();
  const relationshipShardAfterHash = new Map<string, string | null>();
  let planRecoveryWarnings: string[] = [];
  const holdsSymbolCompilerLock =
    input.type === "symbol" &&
    context.fs !== undefined &&
    context.sourceFirst !== false;
  const holdsSourceMutationLock =
    context.fs !== undefined &&
    context.sourceFirst !== false &&
    context.sourceMutationLockHeld !== true;
  try {
    if (holdsSourceMutationLock) {
      sourceMutationLock = await acquireWorkspaceMutationLock(
        context.workspaceRoot,
      );
      // implements REQ-core-atomic-upsert-persistence
      // An interrupted kb_apply_plan left a journal: complete or roll it back
      // before this write reads or changes the files the journal guards.
      planRecoveryWarnings = planRecoveryNotes(
        await settlePendingPlanApplyJournals(
          { ...context, branchAttachment },
          { prolog: async () => prolog },
        ),
      );
    }
    if (holdsSymbolCompilerLock) {
      // Symbol source publication, coordinate refresh, canonical
      // re-extraction, and the RDF commit form one read-modify-write cycle.
      // Serialize the whole cycle so concurrent full refreshes or sibling
      // upserts cannot lose updates.
      compilerLock = await acquireSymbolCompilerLock(context.workspaceRoot);
    }
    const { validated, relationships, semantic, uncompiledSource } =
      await validateUpsertForCommit(input, context, {
        allowReceiptsPrune: options.allowReceiptsPrune === true,
      });
    relationshipCount = validated.relationships.length;
    semanticAdvisor = semantic.receipt;
    const sourceScope = await sourceWriteScope(input, context);
    if (sourceScope !== null) {
      sourceWrite = await writeSourceForUpsert(
        input,
        validated.entity,
        sourceScope.existing,
        context,
        options.sourceDocumentOverride,
      );
      if (sourceWrite !== null) {
        const sourceStep = sourceWrite;
        saga.add({
          name: "authored-source",
          rollback: () => sourceStep.rollback(),
          onError: "capture",
        });
        // The authored path is the entity's canonical identity. Runtime
        // transport provenance (mcp://...) must never survive a source-first
        // write or a later delete/sync cycle.
        commitEntity = {
          ...validated.entity,
          source: sourceWrite.receipt.path,
        };
      }
    }

    // Relationship shards are canonical source artifacts. Patch them before
    // the compiled transaction so a failed commit can restore exact bytes and
    // a successful commit never leaves a compiled-only relationship behind.
    if (context.fs !== undefined && validated.relationships.length > 0) {
      // Register the rollback before appending so a failure on any shard (for
      // example the second write of a multi-shard batch) unwinds the shards
      // that were already appended.
      saga.add({
        name: "relationship-shards",
        rollback: () => {
          for (const [shardPath, before] of relationshipShardBefore) {
            restoreRelationshipShard(
              shardPath,
              before,
              relationshipShardAfterHash.get(shardPath) ?? null,
              relationshipShardBeforeTimes.get(shardPath) ?? null,
            );
          }
        },
      });
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
          relationshipShardBeforeTimes.set(shardPath, readFileTimes(shardPath));
        }
        appendRelationship(path.join(context.workspaceRoot, ".kb"), {
          type,
          from,
          to,
          created_at: context.clock().toISOString(),
          created_by: "kibi/upsert",
          source: "mcp://kibi/upsert",
        });
        relationshipShardAfterHash.set(shardPath, fileHash(shardPath));
      }
    }

    // Coordinates are generated compiler state owned by
    // `.kb/symbol-coordinates.yaml`. Refresh the target's generated record
    // from current extraction (we hold the symbol compiler lock), then commit
    // the complete canonical entity the next sync would compile. Failures
    // abort before the RDF transaction so source and shard rollbacks keep all
    // surfaces consistent; stale coordinates are never reused as a fallback.
    if (
      input.type === "symbol" &&
      context.fs !== undefined &&
      context.sourceFirst !== false &&
      sourceWrite !== null
    ) {
      const refresh = await refreshSymbolCoordinatesForManifest(
        input.id,
        path.resolve(context.workspaceRoot, sourceWrite.receipt.path),
        context,
      );
      const coordinatePublication = refresh.publication;
      if (coordinatePublication !== undefined) {
        saga.add({
          name: "symbol-coordinates",
          rollback: () => coordinatePublication.rollback(),
          onError: "capture",
        });
      }
      if (!refresh.found || refresh.outcome === "removed") {
        throw new Error(
          `Coordinate refresh could not find ${input.id} in the authored symbol manifest`,
        );
      }
      const canonical = reextractCanonicalSymbolEntity(
        input.id,
        sourceWrite.receipt.path,
        context.workspaceRoot,
      );
      if (canonical === null) {
        throw new Error(
          `Canonical symbol manifest ${sourceWrite.receipt.path} no longer contains ${input.id} after coordinate refresh`,
        );
      }
      // The authored path is the entity's canonical identity. Runtime
      // transport provenance (mcp://...) must never survive a source-first
      // write or a later delete/sync cycle.
      commitEntity = {
        ...canonical,
        source: sourceWrite.receipt.path,
      };
    }

    if (options.deferCompiledCommit === true) {
      let deferredState:
        | "prepared"
        | "rolling_back"
        | "rolled_back"
        | "committed" = "prepared";
      let rollbackPromise:
        | Promise<Awaited<ReturnType<typeof saga.rollback>>>
        | undefined;
      const deferredCommit: NonNullable<UpsertPayload["deferredCommit"]> = {
        entity: commitEntity ?? validated.entity,
        relationships: validated.relationships,
        skipContradictionCheck: input._skipContradictionCheck === true,
        get state() {
          return deferredState;
        },
        finalize: () => {
          if (deferredState !== "prepared") {
            throw new Error(
              `Cannot finalize deferred upsert ${input.id} from state ${deferredState}`,
            );
          }
          saga.markCommitted();
          deferredState = "committed";
        },
        rollback: () => {
          if (deferredState === "committed") {
            return Promise.reject(
              new Error(
                `Cannot roll back deferred upsert ${input.id} after its compiled commit`,
              ),
            );
          }
          if (deferredState === "rolled_back") return Promise.resolve([]);
          if (rollbackPromise !== undefined) return rollbackPromise;
          deferredState = "rolling_back";
          rollbackPromise = saga.rollback().then((failures) => {
            deferredState = "rolled_back";
            return failures;
          });
          return rollbackPromise;
        },
      };
      return {
        content: [
          {
            type: "text",
            text: `Prepared ${input.id} for a batched proof commit.`,
          },
        ],
        structuredContent: {
          created: 0,
          updated: 0,
          relationships_created: validated.relationships.length,
          warnings: [...planRecoveryWarnings, ...semantic.warnings],
          ...advisorReceipt(semantic.receipt),
          ...storedClaimKey(commitEntity ?? validated.entity),
          deferredCommit,
          ...(sourceWrite ? { sourceWrites: [sourceWrite.receipt] } : {}),
        },
      };
    }
    const transaction = buildUpsertCommitGoal({
      entity: commitEntity ?? validated.entity,
      relationships: validated.relationships,
      skipContradictionCheck: input._skipContradictionCheck === true,
    });
    const written = await prolog.query(transaction);
    if (!written.success) {
      throw new Error(
        formatUpsertError(input.id, written.error, written.errorRecord),
      );
    }
    saga.markCommitted();
    // The combined commit is the sole mutation boundary. Invalidate reads only
    // after Prolog reports success so a failed/rolled-back commit does not
    // disturb callers' view of the current snapshot.
    prolog.invalidateCache?.();
    changeKind = parseChangeKind(written.bindings.ChangeKind);
    if (changeKind === null) {
      throw new Error(
        `Upsert commit completed without a created/updated result for ${input.id}`,
      );
    }
    const coverage = [
      ...(await scenarioCoverageWarnings(
        prolog,
        validated.relationships,
        input.type,
        input.id,
      )),
      ...(await symbolCoverageWarnings(
        prolog,
        validated.relationships,
        input.type,
        input.id,
      )),
    ];
    const created = changeKind === "created" ? 1 : 0;
    const idStyleWarnings =
      created === 1
        ? entityIdStyleWarnings({
            id: input.id,
            sourcePath:
              sourceWrite?.receipt.path ??
              (typeof validated.entity.source === "string"
                ? validated.entity.source
                : undefined),
          })
        : [];
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
      const expectedAfterHash =
        relationshipShardAfterHash.get(shardPath) ?? null;
      if (afterHash === null) {
        if (expectedAfterHash !== null) {
          const relative = path
            .relative(context.workspaceRoot, shardPath)
            .replaceAll("\\", "/");
          shardWarnings.push(
            `Relationship shard vanished after write: ${relative}`,
          );
        }
        continue;
      }
      if (afterHash === beforeHash) continue;
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
      warnings: [
        ...planRecoveryWarnings,
        // implements REQ-kibi-uncompiled-source-visibility
        ...(uncompiledSource !== undefined
          ? [
              `${input.id} was not in the compiled KB; this write updated its authored file ${uncompiledSource.path}${uncompiledSource.extractionError === null ? "" : `, which kibi sync could not compile before (${uncompiledSource.extractionError})`}. Run kibi sync to recompile it.`,
            ]
          : []),
        ...semantic.warnings,
        ...coverage,
        ...idStyleWarnings,
        ...entityContextWarnings(
          input,
          commitEntity ?? validated.entity,
          context.workspaceRoot,
          { writtenPath: sourceWrite?.receipt.path },
        ),
        ...shardWarnings,
      ],
      ...advisorReceipt(semantic.receipt),
      ...storedClaimKey(commitEntity ?? validated.entity),
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
                semantic.receipt?.logic_readiness === "modeled"
                  ? "modeled"
                  : (semantic.receipt?.candidate_lane ?? "none"),
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
    // Roll back every completed pre-commit surface in reverse order, exactly
    // once. After the compiled commit this is a no-op: post-commit failures
    // return committed-with-repairs results instead of undoing committed
    // state.
    const rollbackFailures = await saga.rollback();
    if (saga.committed) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Upserted ${input.id}, but a derived effect requires repair.`,
          },
        ],
        structuredContent: {
          created: changeKind === "created" ? 1 : 0,
          updated: changeKind === "updated" ? 1 : 0,
          relationships_created: relationshipCount,
          warnings: [...planRecoveryWarnings, detail],
          ...advisorReceipt(semanticAdvisor),
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
    const coordinateFailure = rollbackFailures.find(
      (failure) => failure.step === "symbol-coordinates",
    );
    if (coordinateFailure !== undefined) {
      const failure = new MutationRollbackFailureError(
        [error, coordinateFailure.error],
        `Upsert failed and coordinate artifact rollback failed for ${input.id}`,
        rollbackFailures,
      );
      operationFailure = { error: failure };
      throw failure;
    }
    const sourceFailure = rollbackFailures.find(
      (failure) => failure.step === "authored-source",
    );
    if (sourceFailure !== undefined) {
      const rollbackMessage =
        sourceFailure.error instanceof Error
          ? sourceFailure.error.message
          : String(sourceFailure.error);
      const failure = new MutationRollbackFailureError(
        [error, sourceFailure.error],
        `Upsert failed and authored source rollback failed for ${input.id}: ${rollbackMessage}`,
        rollbackFailures,
      );
      operationFailure = { error: failure };
      throw failure;
    }
    // A coded refusal keeps its code and message for the error envelope.
    if (error instanceof OperationError || error instanceof InputError) {
      const failure = withPlanRecoveryNotes(error, planRecoveryWarnings);
      operationFailure = { error: failure };
      throw failure;
    }
    const message = error instanceof Error ? error.message : String(error);
    const failure = withPlanRecoveryNotes(
      new Error(`Upsert execution failed: ${message}`),
      planRecoveryWarnings,
    );
    operationFailure = { error: failure };
    throw failure;
  } finally {
    try {
      releaseSymbolCompilerLock(compilerLock, operationFailure, saga.committed);
    } finally {
      releaseWorkspaceMutationLock(
        sourceMutationLock,
        operationFailure,
        saga.committed,
      );
    }
  }
}
