import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";

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
    /** Complete document bytes. Omit to preserve the existing body bytes. */
    readonly body?: string;
  };
  readonly _skipContradictionCheck?: boolean;
  readonly _requestId?: string;
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
  readonly semanticAdvisor: SemanticAdvisorReceipt;
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
};

// implements REQ-kibi-operation-interface-parity
export type ValidateUpsertPayload = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly semanticAdvisor: SemanticAdvisorReceipt | null;
  readonly normalizedPreview: Readonly<Record<string, unknown>> | null;
};

export type DeleteInput = {
  readonly ids?: readonly string[];
  readonly relationships?: readonly {
    readonly type: string;
    readonly from: string;
    readonly to: string;
  }[];
  readonly _requestId?: string;
  readonly approvedPlanHash?: string;
};

export type DeletePayload = {
  readonly deleted: number;
  readonly relationships_deleted?: number;
  readonly skipped: number;
  readonly errors: readonly string[];
  readonly error_codes?: readonly Readonly<Record<string, unknown>>[];
  readonly relationship_results?: readonly Record<string, unknown>[];
  readonly sync_required?: boolean;
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
