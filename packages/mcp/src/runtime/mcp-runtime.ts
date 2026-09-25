import type {
  Clock,
  FilesystemPort,
  GitPort,
  NetworkPort,
  OperationContext,
  OperationPlugins,
  OperationRuntime,
  PrologPort,
  RuntimeOptions,
} from "kibi-runtime";
import {
  type CapabilityRegistry,
  CapabilityRegistryCache,
  ensureCapabilityRegistry,
  resolveBranchAttachment,
} from "kibi-runtime";

// implements REQ-kibi-operation-interface-parity
export interface McpSession<TProlog = PrologPort> {
  readonly workspaceRoot: string;
  readonly activeBranchName?: () => string | Promise<string>;
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
  /** Optional injectable capability registry (or lazy factory). */
  readonly plugins?: OperationPlugins;
}

export interface McpOperationRuntime<TProlog> extends OperationRuntime {
  sessionProlog(context: OperationContext): TProlog | undefined;
}

export function attachedContextWithProlog<T extends object>(
  withAttachment: T,
  prolog: PrologPort,
): T & { prolog: PrologPort } {
  return { ...withAttachment, prolog };
}

function resolvePluginsOption(
  plugins: OperationPlugins | undefined,
): (() => Promise<CapabilityRegistry>) | undefined {
  if (plugins === undefined) return undefined;
  if (typeof plugins === "function") return plugins;
  return async () => plugins;
}

// implements REQ-kibi-operation-interface-parity
export function createMcpRuntime<TProlog = PrologPort>(
  session: McpSession<TProlog>,
): McpOperationRuntime<TProlog> {
  const sessionPrologs = new WeakMap<OperationContext, TProlog>();
  // Per-runtime cache — not a process-global singleton.
  const pluginCache = new CapabilityRegistryCache();
  return {
    open: async (spec, options: RuntimeOptions = {}) => {
      const fs = options.fs ?? session.fs;
      const git = options.git ?? session.git;
      const net = options.net ?? session.net;
      const pluginsOption = options.plugins ?? session.plugins;
      const injectedPlugins = resolvePluginsOption(pluginsOption);
      const workspaceRoot = options.workspaceRoot ?? session.workspaceRoot;
      const ensurePlugins = async (): Promise<CapabilityRegistry> => {
        if (injectedPlugins) return injectedPlugins();
        return ensureCapabilityRegistry(workspaceRoot, { cache: pluginCache });
      };
      const context: OperationContext = {
        workspaceRoot,
        signal:
          options.signal ?? session.signal ?? new AbortController().signal,
        clock: options.clock ?? session.clock ?? (() => new Date()),
        ensurePlugins,
        ...(pluginsOption !== undefined ? { plugins: pluginsOption } : {}),
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
        return attachedContextWithProlog(withAttachment, options.prolog);
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
