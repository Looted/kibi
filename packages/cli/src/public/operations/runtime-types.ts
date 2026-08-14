import type { BranchAttachment } from "../../utils/branch-resolver.js";
import type { OperationEffect } from "./types.js";

export type { OperationEffect } from "./types.js";

export type PrologQueryResult = {
  readonly success: boolean;
  readonly bindings: Readonly<Record<string, string>>;
  readonly error?: string;
};

export type PrologEntityQueryInput = Readonly<{
  type?: string;
  id?: string;
  tags?: readonly string[];
  sourceFile?: string;
  limit: number;
  offset: number;
}>;

export type PrologEntityQueryResult = Readonly<{
  entities: readonly Record<string, unknown>[];
  count: number;
}>;

export type PrologSearchQueryInput = Readonly<{
  query: string;
  type?: string;
  /** Candidate bound before deterministic TypeScript ranking. */
  limit: number;
  offset: number;
}>;

export type PrologSearchQueryResult = Readonly<{
  entities: readonly Record<string, unknown>[];
  count: number;
}>;

// implements REQ-kibi-operation-interface-parity
export interface PrologPort {
  query(goal: string): Promise<PrologQueryResult>;
  /** Optional index-backed page query supplied by the journaled engine. */
  queryEntities?(
    input: PrologEntityQueryInput,
  ): Promise<PrologEntityQueryResult>;
  /** Optional normalized-token candidate lookup supplied by the engine. */
  searchEntities?(
    input: PrologSearchQueryInput,
  ): Promise<PrologSearchQueryResult>;
  nextSolution(): Promise<PrologQueryResult | null>;
  invalidateCache?(): void;
  save(): Promise<PrologQueryResult>;
  /** Present on the journaled engine; used to distinguish a persistent port from one-shot SWI. */
  storageStatus?(): Promise<PrologQueryResult>;
  /** Typed public freshness query; avoids exposing module loading over RPC. */
  queryStatusJson?(): Promise<PrologQueryResult>;
}

export type FilesystemStat = {
  readonly isFile: () => boolean;
  readonly isDirectory: () => boolean;
};

export interface FilesystemPort {
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  stat(path: string): Promise<FilesystemStat>;
}

export interface GitPort {
  /** Optional low-level Git probes; the journaled runtime may provide them. */
  revParse?(...args: readonly string[]): Promise<string>;
  showToplevel?(): Promise<string>;
  workspaceSnapshot?(workspaceRoot: string): Promise<WorkspaceSnapshot>;
}

export type WorkspaceSnapshot = Readonly<{
  version: "kibi.workspace-snapshot.v2";
  hash: string;
  dirty: boolean;
  fileCount: number;
  readonly changes?: readonly {
    readonly path: string;
    readonly status: string;
    readonly snapshotRelevant: boolean;
  }[];
  readonly changeCount?: number;
  readonly changesTruncated?: boolean;
}>;

export interface NetworkPort {
  fetch(input: string | URL, init?: RequestInit): Promise<Response>;
}

export type Clock = () => Date;

export type RuntimeOptions = {
  readonly workspaceRoot?: string;
  readonly signal?: AbortSignal;
  readonly clock?: Clock;
  readonly prolog?: PrologPort;
  readonly fs?: FilesystemPort;
  readonly git?: GitPort;
  readonly net?: NetworkPort;
};

export type OperationContext = {
  readonly workspaceRoot: string;
  readonly signal: AbortSignal;
  readonly clock: Clock;
  readonly prolog?: PrologPort;
  readonly fs?: FilesystemPort;
  readonly git?: GitPort;
  readonly net?: NetworkPort;
  readonly branchAttachment?: BranchAttachment;
};

export interface RuntimeOperationSpec<TInput = unknown, TResult = unknown> {
  readonly name: string;
  readonly effects: readonly OperationEffect[];
  readonly requiresProlog: boolean;
  execute(input: TInput, context: OperationContext): Promise<TResult>;
}

export type OperationOutcome =
  | { readonly status: "success"; readonly result: unknown }
  | { readonly status: "error"; readonly error: unknown };

// implements REQ-kibi-operation-interface-parity
export interface OperationRuntime {
  open(
    spec: RuntimeOperationSpec<unknown, unknown>,
    opts?: RuntimeOptions,
  ): Promise<OperationContext>;
  afterSuccess(
    spec: RuntimeOperationSpec<unknown, unknown>,
    context: OperationContext,
  ): Promise<void>;
  close(context: OperationContext, outcome: OperationOutcome): Promise<void>;
}

// implements REQ-kibi-operation-interface-parity
export async function executeOperation<TInput, TResult>(
  runtime: OperationRuntime,
  spec: RuntimeOperationSpec<TInput, TResult>,
  input: TInput,
  opts?: RuntimeOptions,
): Promise<TResult> {
  const context = await runtime.open(spec, opts);
  let result: TResult;
  try {
    result = await spec.execute(input, context);
    if (spec.effects.includes("kb-write")) {
      await runtime.afterSuccess(spec, context);
    }
  } catch (error) {
    await runtime.close(context, { status: "error", error });
    throw error;
  }
  await runtime.close(context, { status: "success", result });
  return result;
}
