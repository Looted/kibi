import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";

// implements REQ-kibi-operation-interface-parity
export type RelationshipInput = Readonly<Record<string, unknown>>;

// implements REQ-kibi-operation-interface-parity
export type UpsertInput = {
  readonly type: string;
  readonly id: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly relationships?: readonly RelationshipInput[];
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
  readonly ids: readonly string[];
  readonly _requestId?: string;
};

export type DeletePayload = {
  readonly deleted: number;
  readonly skipped: number;
  readonly errors: readonly string[];
};
