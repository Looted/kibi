import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";
import type { SagaRollbackFailure } from "./saga.js";

// implements REQ-kibi-operation-interface-parity
export type RelationshipInput = Readonly<Record<string, unknown>>;

// implements REQ-kibi-operation-interface-parity
export type UpsertInput = {
  readonly type: string;
  readonly id: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly relationships?: readonly RelationshipInput[];
  readonly document?: {
    /** Workspace-relative authored source target. */
    readonly path?: string;
    /** Complete document bytes. Omit to preserve the existing body (a changed requirement semantic_text replaces its statement). */
    readonly body?: string;
  };
  /** Validate and preview the write without mutating the KB. */
  readonly dryRun?: boolean;
  /**
   * Dry run only: fact upserts an earlier step will write before this one
   * (the kb_model applyPlan entries). They are validated in order and staged
   * with the payload, so grounding targets resolve and the contradiction
   * preview sees the KB as it would be after the whole batch.
   */
  readonly plannedFacts?: readonly PlannedFactInput[];
  readonly _skipContradictionCheck?: boolean;
  readonly _requestId?: string;
};

// implements REQ-model-what-if-planned-facts
/** One planned fact write staged ahead of a dry run. */
export type PlannedFactInput = {
  readonly type: string;
  readonly id: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly relationships?: readonly RelationshipInput[];
};

// implements REQ-kibi-truthful-consistency
/**
 * Store state an upsert's validation must see in addition to the live KB:
 * what earlier steps of the same plan will have written by the time this
 * upsert runs. Validators treat these entities and relationships as present,
 * and a staged entity shadows the stored entity with the same id.
 */
export type StagedUpsertState = {
  /** Validated entities (id, type and properties) by id. */
  readonly entities: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  /** Relationships the earlier steps add, in step order. */
  readonly relationships: readonly RelationshipInput[];
};

// implements REQ-kibi-operation-interface-parity
export type ValidatedUpsert = {
  readonly entity: Record<string, unknown>;
  readonly relationships: readonly RelationshipInput[];
};

// implements REQ-kibi-operation-interface-parity
export type UpsertPayload = {
  readonly created: number;
  readonly updated: number;
  readonly relationships_created: number;
  readonly warnings: readonly string[];
  /** The requirement semantic advisor receipt; absent for other entity types. */
  readonly semanticAdvisor?: SemanticAdvisorReceipt;
  /**
   * For a fact that carries claim_text: the stored claim_key, derived from
   * claim_text when the payload did not supply it, so the writer learns the
   * grounding key without a kb_query.
   */
  readonly claimKey?: string;
  readonly status?: "committed_with_repairs";
  readonly effectFailures?: readonly {
    readonly kind: string;
    readonly errorCode?: string;
    readonly detail?: unknown;
  }[];
  readonly nextActions?: readonly {
    readonly operation: string;
    readonly input?: unknown;
    readonly reason: string;
    readonly required: boolean;
  }[];
  readonly sourceWrites?: readonly {
    readonly path: string;
    readonly mode?: "write" | "delete";
    readonly beforeHash: string | null;
    readonly afterHash: string | null;
    readonly created: boolean;
  }[];
  readonly contradictionCheck?: {
    readonly outcome: "no-conflict" | "skipped";
    readonly checked_req_id: string;
    readonly strict_readiness: string;
  };
  readonly deferredCommit?: DeferredUpsertCommit;
};

/**
 * Internal lifecycle for source writes prepared ahead of a batched Prolog
 * commit. Finalization crosses the compiled commit boundary and permanently
 * disables source rollback for that mutation.
 */
export type DeferredUpsertCommit = {
  readonly entity: Readonly<Record<string, unknown>>;
  readonly relationships: readonly RelationshipInput[];
  readonly skipContradictionCheck: boolean;
  readonly state: "prepared" | "rolling_back" | "rolled_back" | "committed";
  readonly finalize: () => void;
  readonly rollback: () => Promise<readonly SagaRollbackFailure[]>;
};

// implements REQ-kibi-operation-interface-parity
export type ValidateUpsertPayload = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly semanticAdvisor: SemanticAdvisorReceipt | null;
  readonly normalizedPreview: Readonly<Record<string, unknown>> | null;
  /**
   * When the payload is invalid and the write would refuse it with a coded
   * error (for example DOCUMENT_PATH_REQUIRED): that code.
   */
  readonly errorCode?: string;
  /** Planned fact ids staged ahead of the payload, in order. */
  readonly stagedFacts?: readonly string[];
  /**
   * With plannedFacts: the contradiction and scenario-feasibility witnesses
   * the KB would hold after the planned facts and this payload, split into
   * what the batch introduces, removes and leaves unchanged.
   */
  readonly whatIf?: Readonly<{
    introduced: readonly Readonly<Record<string, unknown>>[];
    removed: readonly Readonly<Record<string, unknown>>[];
    unchanged: readonly Readonly<Record<string, unknown>>[];
  }>;
};

export type DeleteInput = {
  readonly ids?: readonly string[];
  readonly relationships?: readonly {
    readonly type: string;
    readonly from: string;
    readonly to: string;
  }[];
  readonly _requestId?: string;
  /** Applies the authored-entity deletion plan whose planHash this is. */
  readonly approvedPlanHash?: string;
  /** Preview the delete without writing sources or the compiled store. */
  readonly dryRun?: boolean;
};

/**
 * What a kb_delete call did when it was not a direct delete: returned an
 * authored-entity deletion plan, refused a requirement that must be
 * superseded, applied an approved plan, or previewed a dry run.
 */
export type DeleteOutcome =
  | "plan_returned"
  | "supersession_required"
  | "plan_applied"
  | "dry_run";

export type DeletePayload = {
  readonly deleted: number;
  readonly relationships_deleted?: number;
  readonly skipped: number;
  readonly errors: readonly string[];
  readonly error_codes?: readonly Readonly<Record<string, unknown>>[];
  readonly relationship_results?: readonly Record<string, unknown>[];
  readonly sync_required?: boolean;
  /** Declared effects this call did not perform, such as a plan-only result. */
  readonly skippedEffects?: readonly string[];
  /** Absent on a direct delete. */
  readonly outcome?: DeleteOutcome;
  readonly dryRun?: true;
  /** Dry run only: what a commit would delete. */
  readonly wouldDelete?: Readonly<{
    readonly entities: number;
    readonly ids?: readonly string[];
    readonly relationships?: number;
    readonly compiledEdges?: number;
  }>;
  /** Applied plan only: the plan hash and the source files it changed. */
  readonly planHash?: string;
  readonly sourcePaths?: readonly string[];
  readonly recoveryJournalId?: string;
  readonly status?: "committed_with_repairs";
  readonly nextActions?: readonly Readonly<{
    readonly operation: string;
    readonly input: unknown;
    readonly reason: string;
    readonly required: boolean;
    readonly detail?: string;
  }>[];
  readonly sourceWrites?: readonly {
    readonly path: string;
    readonly mode?: "write" | "delete";
    readonly beforeHash: string | null;
    readonly afterHash: string | null;
    readonly created: boolean;
  }[];
  readonly deletionPlan?: {
    readonly version: "kibi.entity-deletion-plan.v1";
    readonly planHash: string;
    readonly entityIds: readonly string[];
    readonly sourceHashes: Readonly<Record<string, string | null>>;
    readonly sourceWrites?: readonly {
      readonly path: string;
      readonly mode: "write" | "delete";
      readonly beforeHash: string | null;
      readonly afterHash: string | null;
      readonly body?: string;
    }[];
    readonly supersessionRequired: boolean;
  };
};
