import type { OperationEffect } from "./types.js";

export type { OperationEffect } from "./types.js";

export type PrologQueryResult = {
  readonly success: boolean;
  readonly bindings: Readonly<Record<string, string>>;
  readonly error?: string;
};

// implements REQ-kibi-operation-interface-parity
export interface PrologPort {
  query(goal: string): Promise<PrologQueryResult>;
  nextSolution(): Promise<PrologQueryResult | null>;
  save(): Promise<PrologQueryResult>;
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
  revParse(...args: readonly string[]): Promise<string>;
  showToplevel(): Promise<string>;
}

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
