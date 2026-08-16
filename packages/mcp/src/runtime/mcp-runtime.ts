import type {
  Clock,
  FilesystemPort,
  GitPort,
  NetworkPort,
  OperationContext,
  OperationRuntime,
  PrologPort,
  RuntimeOptions,
} from "kibi-runtime";
import { resolveBranchAttachment } from "kibi-runtime";

// implements REQ-kibi-operation-interface-parity
export interface McpSession<TProlog = PrologPort> {
  readonly workspaceRoot: string;
  readonly activeBranchName: () => string | Promise<string>;
  readonly attachedBranchKbPath: () => string | null | Promise<string | null>;
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
        ...(fs ? { sourceFirst: true } : {}),
        ...(git ? { git } : {}),
        ...(net ? { net } : {}),
      };
      const attachment = resolveBranchAttachment(context.workspaceRoot);
      if (!("error" in attachment) && attachment.migrationRequired) {
        console.warn(
          `[KIBI-MCP] Legacy branch attachment: Git '${attachment.gitBranch}' is reading KB '${attachment.kbBranch}'. Run 'kibi branch migrate --from ${attachment.kbBranch} --to ${attachment.gitBranch} --apply'; writes are blocked until then.`,
        );
      }
      const withAttachment =
        "error" in attachment
          ? context
          : { ...context, branchAttachment: attachment };
      if (!spec.requiresProlog) {
        // Preserve explicit host/test injection without asking the shared MCP
        // session to initialise a store merely to report its condition.
        const providedProlog = options.prolog;
        let lazyProlog: TProlog | undefined;
        const lazyContext: { current?: OperationContext } = {};
        const ensureProlog = async (): Promise<PrologPort> => {
          if (providedProlog !== undefined) return providedProlog;
          if (lazyProlog !== undefined) return session.adaptProlog(lazyProlog);
          lazyProlog = await session.ensureProlog();
          if (lazyContext.current !== undefined)
            sessionPrologs.set(lazyContext.current, lazyProlog);
          return session.adaptProlog(lazyProlog);
        };
        const operationContext: OperationContext = {
          ...withAttachment,
          ...(options.prolog ? { prolog: options.prolog } : {}),
          ensureProlog,
        };
        lazyContext.current = operationContext;
        return operationContext;
      }
      if (!("error" in attachment) && attachment.migrationRequired) {
        throw new Error(
          `Legacy branch attachment requires explicit migration before '${spec.name}'; run kibi branch migrate --from ${attachment.kbBranch} --to ${attachment.gitBranch} --apply`,
        );
      }
      if (options.prolog) {
        return { ...withAttachment, prolog: options.prolog };
      }
      const sessionProlog = await session.ensureProlog();
      const operationContext: OperationContext = {
        ...withAttachment,
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
