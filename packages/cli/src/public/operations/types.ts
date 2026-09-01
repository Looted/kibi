import type { OperationContext } from "./runtime-types.js";
export type { OperationContext };
export type OperationName =
  | "kb_query"
  | "kb_search"
  | "kb_status"
  | "kb_skills_list"
  | "kb_skills_load"
  | "kb_skills_read"
  | "kb_find_gaps"
  | "kb_coverage"
  | "kb_graph"
  | "kb_sparql_remote"
  | "kb_semantic_advisor"
  | "kb_upsert"
  | "kb_validate_upsert"
  | "kb_delete"
  | "kb_check"
  | "kb_model_requirement"
  | "kb_suggest_predicates"
  | "kb_plan_bootstrap"
  | "kb_compile_intent"
  | "kb_apply_plan"
  | "kb_ingest_proof";

export type OperationEffect =
  | "local-read"
  | "kb-read"
  | "workspace-read"
  | "network-read"
  | "kb-write"
  | "workspace-write";

export type OperationEffectDeclaration = Readonly<{
  kind: OperationEffect;
  mutability: "read" | "write";
  destructive: boolean;
  retrySafety: "safe" | "unsafe";
  openWorld: boolean;
}>;

export interface OperationContent {
  readonly type: string;
  readonly text?: string;
}

export interface OperationResult<O = unknown> {
  readonly content: readonly OperationContent[];
  readonly structuredContent?: O;
}

export type KibiResultStatus = "success" | "committed_with_repairs" | "error";

export type KibiResult<T = unknown> = {
  readonly kibiProtocol: 1;
  readonly operation: OperationName | string;
  readonly resultVersion: string;
  readonly status: KibiResultStatus;
  readonly data: T;
  readonly effects: readonly {
    readonly kind: string;
    readonly status: "completed" | "failed" | "not_applicable";
    readonly detail?: unknown;
    readonly errorCode?: string;
  }[];
  readonly diagnostics: readonly {
    readonly code?: string;
    readonly severity?: "info" | "warning" | "error";
    readonly message: string;
    readonly detail?: unknown;
  }[];
  readonly nextActions: readonly {
    readonly operation: OperationName | string;
    readonly input?: unknown;
    readonly reason: string;
    readonly required: boolean;
  }[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
    readonly details?: unknown;
  };
};

export interface OperationSpec<
  I = Readonly<Record<string, unknown>>,
  O = unknown,
> {
  readonly name: OperationName;
  readonly cliName: string;
  readonly description: string;
  readonly businessInputSchema: Readonly<Record<string, unknown>>;
  readonly requiresProlog: boolean;
  readonly effects: readonly OperationEffect[];
  /** Generated effect metadata used by MCP annotations and telemetry. */
  readonly declaredEffects?: readonly OperationEffectDeclaration[];
  /** Version of the machine-readable result data for this operation. */
  readonly resultVersion?: string;
  /** JSON Schema for the machine-readable result data. */
  readonly outputSchema?: Readonly<Record<string, unknown>>;
  readonly execute: {
    bivarianceHack(
      input: I,
      context: OperationContext,
    ): Promise<OperationResult<O>>;
  }["bivarianceHack"];
}

/** A catalog spec after its generated machine contract has been attached. */
export type ResolvedOperationSpec<
  I = Readonly<Record<string, unknown>>,
  O = unknown,
> = OperationSpec<I, O> & {
  readonly declaredEffects: readonly OperationEffectDeclaration[];
  readonly resultVersion: string;
  readonly outputSchema: Readonly<Record<string, unknown>>;
};
