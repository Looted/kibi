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
  | "kb_autopilot_generate";

export type OperationEffect =
  | "local-read"
  | "kb-read"
  | "workspace-read"
  | "network-read"
  | "kb-write"
  | "workspace-write";

export interface OperationContent {
  readonly type: string;
  readonly text?: string;
}

export interface OperationResult<O = unknown> {
  readonly content: readonly OperationContent[];
  readonly structuredContent?: O;
}

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
  readonly execute: {
    bivarianceHack(
      input: I,
      context: OperationContext,
    ): Promise<OperationResult<O>>;
  }["bivarianceHack"];
}
