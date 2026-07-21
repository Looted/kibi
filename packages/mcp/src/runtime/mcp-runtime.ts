import type {
  Clock,
  FilesystemPort,
  GitPort,
  NetworkPort,
  OperationContext,
  OperationRuntime,
  PrologPort,
  RuntimeOptions,
} from "kibi-cli/operations/runtime-types";

// implements REQ-kibi-operation-interface-parity
export interface McpSession<TProlog = PrologPort> {
  readonly workspaceRoot: string;
  readonly activeBranchName: () => string | Promise<string>;
  readonly attachedBranchKbPath: () =>
    | string
    | null
    | Promise<string | null>;
  readonly ensureProlog: () => Promise<TProlog>;
  readonly adaptProlog: (prolog: TProlog) => PrologPort;
  readonly refreshAttachedBranchStamp: () => Promise<void>;
  readonly requestCleanup?: (
    context: OperationContext,
    outcome: { readonly status: "success" | "error" },
  ) => Promise<void>;
  readonly signal?: AbortSignal;
  readonly clock?: Clock;
  readonly fs?: FilesystemPort;
  readonly git?: GitPort;
  readonly net?: NetworkPort;
}

export interface McpOperationRuntime<TProlog> extends OperationRuntime {
  sessionProlog(context: OperationContext): TProlog | undefined;
}

// implements REQ-kibi-operation-interface-parity
export function createMcpRuntime<TProlog = PrologPort>(
  session: McpSession<TProlog>,
): McpOperationRuntime<TProlog> {
  const sessionPrologs = new WeakMap<OperationContext, TProlog>();
  return {
    open: async (spec, options: RuntimeOptions = {}) => {
      const fs = options.fs ?? session.fs;
      const git = options.git ?? session.git;
      const net = options.net ?? session.net;
      const context: OperationContext = {
        workspaceRoot: options.workspaceRoot ?? session.workspaceRoot,
        signal:
          options.signal ?? session.signal ?? new AbortController().signal,
        clock: options.clock ?? session.clock ?? (() => new Date()),
        ...(fs ? { fs } : {}),
        ...(git ? { git } : {}),
        ...(net ? { net } : {}),
      };
      if (!spec.requiresProlog) {
        return context;
      }
      if (options.prolog) {
        return { ...context, prolog: options.prolog };
      }
      const sessionProlog = await session.ensureProlog();
      const operationContext: OperationContext = {
        ...context,
        prolog: session.adaptProlog(sessionProlog),
      };
      sessionPrologs.set(operationContext, sessionProlog);
      return operationContext;
    },
    afterSuccess: async (spec) => {
      if (
        spec.effects.includes("kb-write") &&
        (await session.attachedBranchKbPath()) !== null
      ) {
        await session.refreshAttachedBranchStamp();
      }
    },
    close: async (context, outcome) => {
      await session.requestCleanup?.(context, outcome);
      sessionPrologs.delete(context);
    },
    sessionProlog: (context) => sessionPrologs.get(context),
  };
}
