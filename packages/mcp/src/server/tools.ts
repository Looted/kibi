/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import process from "node:process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import {
  type DetachedReadOnlyDiagnostic,
  type OperationRuntime,
  type ProgressReporter,
  QUERY_LIMIT_EXCEEDED_CODE,
  type RuntimeOperationSpec,
  detachedReadOnlyDiagnostic,
  executeOperation,
  queryLimitExceededOf,
} from "kibi-runtime";
import { operationData, toKibiResult } from "kibi-runtime";
import type { z } from "zod";
import { routedBusinessArgs, routedOperationName } from "../diagnostics.js";
import { isMcpDebugEnabled } from "../env.js";
import { enabledOptionalTools } from "../tools-config.js";
import {
  appendDiagnosticErrorUsage,
  appendDiagnosticSuccessUsage,
} from "./diagnostic-usage.js";
import { getJob, jobSnapshot } from "./jobs.js";
import { jsonSchemaToZod } from "./json-schema-to-zod.js";
import { registerConfiguredTools } from "./tool-registration.js";
import type {
  ToolHandler,
  ToolHandlerArgs,
  ToolsRuntime,
} from "./tool-types.js";
import {
  DEFAULT_TOOLS_RUNTIME,
  _resetSessionModulePromise,
  _setToolsServerDepsForTests,
} from "./tools-runtime.js";
import {
  type RoutingDecision,
  WORKSPACE_ROOT_ARGUMENT,
  type WorkspaceMismatchDiagnostic,
  getWorkspaceRouter,
} from "./workspace-router.js";

export type { ToolConfig, ToolHandler, ToolsRuntime } from "./tool-types.js";
export { jsonSchemaToZod } from "./json-schema-to-zod.js";
export { _resetSessionModulePromise, _setToolsServerDepsForTests };

const DEFAULT_TOOL_TIMEOUT_MS = 90_000;
const TOOL_TIMEOUT_ENV = "KIBI_MCP_TOOL_TIMEOUT_MS";
// Give cancellation a short bounded grace period, but do not hold the MCP
// request open for the full five-second shutdown budget when a handler never
// observes AbortSignal.
const TOOL_TIMEOUT_GRACE_MS = 100;
// Mutations that ignore AbortSignal may leave the journal indeterminate. Only
// then tear down the shared session engine — never on ordinary read timeouts,
// which would reject sibling tools with "Kibi engine connection closed".
const TOOL_TIMEOUT_WEDGE_MS = 1_000;

function isMutationEffect(effects: readonly string[] | undefined): boolean {
  return (
    effects?.some(
      (effect) => effect === "kb-write" || effect === "workspace-write",
    ) ?? false
  );
}

/** Embed envelope data in content text for opted-in tools (hosts that hide structuredContent).
 * Preserves non-text content parts; only augments/replaces text parts. */
function withAgentVisibleText(
  content: readonly { type: string; text?: string; [key: string]: unknown }[],
  data: unknown,
): { type: string; text?: string; [key: string]: unknown }[] {
  const textParts = content.filter(
    (part) => part.type === "text" && typeof part.text === "string",
  );
  const nonTextParts = content.filter((part) => part.type !== "text");
  const summary = textParts
    .map((part) => part.text as string)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const payload = JSON.stringify(data);
  // Prefer JSON-first so first-line-only host summaries still include machine data.
  const text = summary.length > 0 ? `${payload}\n${summary}` : payload;
  return [{ type: "text", text }, ...nonTextParts];
}

// implements REQ-002
function debugLog(...args: Parameters<typeof console.error>): void {
  if (isMcpDebugEnabled()) {
    console.error(...args);
  }
}

// implements REQ-002
function getToolTimeoutMs(): number {
  const raw = process.env[TOOL_TIMEOUT_ENV]?.trim();
  if (!raw) {
    return DEFAULT_TOOL_TIMEOUT_MS;
  }

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TOOL_TIMEOUT_MS;
}

// implements REQ-002
function createToolTimeoutError(toolName: string, timeoutMs: number): Error {
  const error = new Error(`Tool ${toolName} timed out after ${timeoutMs}ms`);
  Object.assign(error, { code: "KIBI_TOOL_TIMEOUT", toolName, timeoutMs });
  return error;
}

function isToolTimeoutError(value: unknown): value is Error & {
  readonly code: "KIBI_TOOL_TIMEOUT";
  readonly toolName: string;
  readonly timeoutMs: number;
} {
  return (
    value instanceof Error &&
    (value as Error & { code?: unknown }).code === "KIBI_TOOL_TIMEOUT"
  );
}

/**
 * Lets an operation that reports progress push its tool timeout back: the
 * timeout then bounds inactivity rather than total duration, matching MCP
 * clients that reset their own request timeout on progress notifications.
 */
type ToolTimeoutActivity = { touch: () => void };

// implements REQ-002
async function withToolTimeout<T>(
  toolName: string,
  operation: Promise<T>,
  onTimeout: (error: Error, timeoutMs: number) => Promise<void>,
  activity?: ToolTimeoutActivity,
): Promise<T> {
  const timeoutMs = getToolTimeoutMs();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let fired = false;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const fire = () => {
        fired = true;
        const error = createToolTimeoutError(toolName, timeoutMs);
        // Do not report the timeout until cancellation/reset has completed
        // and the original request has reached a terminal state. This is
        // especially important for source-first mutations: a caller must
        // never retry while the authoritative journal is still deciding its
        // outcome.
        void onTimeout(error, timeoutMs)
          .then(async () => {
            await Promise.race([
              operation.then(
                () => undefined,
                () => undefined,
              ),
              new Promise<void>((resolve) =>
                setTimeout(resolve, TOOL_TIMEOUT_GRACE_MS),
              ),
            ]);
          })
          .finally(() => reject(error));
      };
      timeout = setTimeout(fire, timeoutMs);
      if (activity) {
        activity.touch = () => {
          if (fired) return;
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(fire, timeoutMs);
        };
      }
    });
    // When abort settles `operation` before this timeout promise rejects,
    // the late reject must not become an unhandled rejection.
    timeoutPromise.catch(() => undefined);
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

/** The parts of the MCP SDK request context a tool handler uses. */
type ToolRequestExtra = {
  readonly _meta?: { readonly progressToken?: string | number };
  readonly sendNotification?: (notification: {
    method: "notifications/progress";
    params: {
      progressToken: string | number;
      progress: number;
      total?: number;
      message?: string;
    };
  }) => Promise<void>;
};

/**
 * Forward operation progress as MCP notifications/progress when the request
 * carries a progressToken, and push the server-side tool timeout back on each
 * report. Progress values must increase, so repeats are nudged forward.
 */
// implements REQ-bootstrap-apply-long-running
export function progressReporter(
  extra: ToolRequestExtra | undefined,
  activity: ToolTimeoutActivity,
): ProgressReporter | undefined {
  const token = extra?._meta?.progressToken;
  const send = extra?.sendNotification;
  if (token === undefined || typeof send !== "function") return undefined;
  let last = -1;
  return ({ progress, total, message }) => {
    activity.touch();
    const value = progress > last ? progress : last + 0.001;
    last = value;
    void send({
      method: "notifications/progress",
      params: {
        progressToken: token,
        progress: value,
        ...(total === undefined ? {} : { total }),
        ...(message === undefined ? {} : { message }),
      },
    }).catch((error: unknown) => {
      debugLog(
        "[KIBI-MCP] progress notification failed:",
        error instanceof Error ? error.message : String(error),
      );
    });
  };
}

/**
 * A module that vanished after startup means the package was upgraded or
 * reinstalled under a running server; only a restart loads the new install.
 */
function staleInstallHint(error: Error): string {
  const code = (error as Error & { code?: unknown }).code;
  const missingModule =
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "MODULE_NOT_FOUND" ||
    /Cannot find (module|package)/.test(error.message);
  return missingModule
    ? " — this Kibi MCP server is running from files that are no longer installed (Kibi was likely upgraded or reinstalled after it started). Restart the Kibi MCP server; the project-local kibi CLI works in the meantime."
    : "";
}

/**
 * The decision when no workspace router is installed (unit tests, embedded
 * use): every call is local, and `workspaceRoot` is dropped so handlers never
 * see a routing-only argument. kb_check keeps it: there it also names the
 * tree to inspect for impact diagnostics.
 */
function localDecision(
  name: string,
  args: Record<string, unknown>,
): RoutingDecision {
  if (!(WORKSPACE_ROOT_ARGUMENT in args) || name === "kb_check") {
    return { kind: "local", args };
  }
  const { [WORKSPACE_ROOT_ARGUMENT]: _ignored, ...rest } = args;
  return { kind: "local", args: rest };
}

/** A result's diagnostics carry a routing or detached-HEAD notice when one applies. */
function withWorkspaceNotice<T extends { diagnostics: readonly unknown[] }>(
  envelope: T,
  notice: WorkspaceMismatchDiagnostic | DetachedReadOnlyDiagnostic | undefined,
): T {
  if (!notice) return envelope;
  return { ...envelope, diagnostics: [...envelope.diagnostics, notice] };
}

/**
 * Observe the context an operation opens so its envelope can say when a
 * detached HEAD answered from the read-only snapshot, and which store.
 */
// implements REQ-branch-store-recovery-v4
function observeDetachedReads(base: OperationRuntime): {
  readonly runtime: OperationRuntime;
  readonly notice: () => DetachedReadOnlyDiagnostic | undefined;
} {
  let notice: DetachedReadOnlyDiagnostic | undefined;
  return {
    runtime: {
      // Read the attachment at close (success or error) so opening the
      // context costs no extra event-loop turn.
      open: (spec, options) => base.open(spec, options),
      afterSuccess: (spec, context) => base.afterSuccess(spec, context),
      close: (context, outcome) => {
        notice = detachedReadOnlyDiagnostic(context.branchAttachment);
        return base.close(context, outcome);
      },
    },
    notice: () => notice,
  };
}

// implements REQ-002
export function addTool<TProlog>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: object,
  handler: ToolHandler,
  // INTENTIONAL: DEFAULT_TOOLS_RUNTIME is typed as ToolsRuntime<PrologProcess>; the
  // generic TProlog parameter exists so tests can inject a mock type. The cast is safe
  // because the runtime object satisfies the full ToolsRuntime contract at runtime.
  runtime: ToolsRuntime<TProlog> = DEFAULT_TOOLS_RUNTIME as unknown as ToolsRuntime<TProlog>,
  spec?: RuntimeOperationSpec<Record<string, unknown>, unknown>,
  annotations?: ToolAnnotations,
  outputSchema?: object,
): void {
  const wrappedHandler = async (
    rawArgs: Record<string, unknown>,
    extra?: ToolRequestExtra,
  ): Promise<unknown> => {
    const startedAt = new Date();
    const diagnosticModeEnabled = runtime.diagnosticModeEnabled();
    let args = rawArgs;
    let workspaceNotice: WorkspaceMismatchDiagnostic | undefined;
    let businessArgs: Record<string, unknown> = rawArgs;
    let telemetry: Record<string, unknown> | null = null;

    try {
      // Validate that args is a valid object
      if (typeof args !== "object" || args === null) {
        throw new Error(
          `Invalid arguments for tool ${name}: expected object, got ${typeof args}`,
        );
      }

      // Answer from the workspace the caller is working in. A call routed to
      // another workspace's kibi-mcp returns that server's result as is; the
      // child logs its own usage and the parent records nothing for it.
      // Without a router the decision is synchronous, so a plain call reaches
      // its handler without an extra microtask.
      const router = getWorkspaceRouter();
      const routing = router
        ? await router.route(name, args)
        : localDecision(name, args);
      if (routing.kind === "remote") return routing.result;
      args = routing.args;
      workspaceNotice = routing.notice;
      ({ businessArgs, telemetry } = diagnosticModeEnabled
        ? runtime.extractToolCallPayload(args)
        : { businessArgs: args, telemetry: null });
      // Check if shutting down before processing
      if (await runtime.isShuttingDown()) {
        throw new Error(`Tool ${name} rejected: server is shutting down`);
      }

      // Extract or generate requestId from args
      const requestIdArg = (businessArgs as ToolHandlerArgs)._requestId;
      const requestId =
        typeof requestIdArg === "string"
          ? requestIdArg
          : `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      // Log tool call for debugging (to stderr to avoid breaking stdio protocol)
      if (isMcpDebugEnabled()) {
        console.error(
          `[KIBI-MCP] Tool called: ${name} (requestId: ${requestId}) with args:`,
          JSON.stringify(businessArgs),
        );
      }

      // Track the handler promise in inFlightRequests Map
      const trackedRequests = await runtime.inFlightRequests();
      const controller = new AbortController();
      const operationSpec: RuntimeOperationSpec<
        Record<string, unknown>,
        unknown
      > = spec ?? {
        name,
        effects: ["local-read"],
        requiresProlog: false,
        execute: async (input, _context) => handler(input),
      };
      const observed = observeDetachedReads(runtime.operationRuntime);
      const activity: ToolTimeoutActivity = { touch: () => undefined };
      const onProgress = progressReporter(extra, activity);
      const handlerPromise = executeOperation(
        observed.runtime,
        operationSpec,
        businessArgs,
        {
          signal: controller.signal,
          ...(onProgress ? { onProgress } : {}),
        },
      );
      trackedRequests.set(requestId, handlerPromise);
      let resetAttempted = false;
      let resetSucceeded = false;
      let resetError: string | null = null;

      try {
        // Execute handler
        const result = await withToolTimeout(
          name,
          handlerPromise,
          async (error) => {
            controller.abort(error);
            // Read/discovery timeouts must cancel in-flight RPCs without
            // terminating the shared session engine. A global resetProlog here
            // rejects sibling tools with "Kibi engine connection closed".
            if (!isMutationEffect(operationSpec.effects)) {
              return;
            }
            const settled = await Promise.race([
              handlerPromise.then(
                () => true,
                () => true,
              ),
              new Promise<boolean>((resolve) =>
                setTimeout(() => resolve(false), TOOL_TIMEOUT_WEDGE_MS),
              ),
            ]);
            if (settled) {
              return;
            }
            resetAttempted = true;
            try {
              await runtime.resetProlog(`tool timeout: ${name}`);
              resetSucceeded = true;
            } catch (resetFailure) {
              resetError =
                resetFailure instanceof Error
                  ? resetFailure.message
                  : String(resetFailure);
            }
          },
          activity,
        );

        const data = operationData(result);
        const envelope = withWorkspaceNotice(
          withWorkspaceNotice(
            toKibiResult(operationSpec, data),
            workspaceNotice,
          ),
          observed.notice(),
        );

        // Log usage in diagnostic mode
        if (diagnosticModeEnabled) {
          await appendDiagnosticSuccessUsage({
            runtime,
            // Usage evidence records the routed operation (kb_model mode
            // predicates logs as kb_suggest_predicates) so telemetry
            // acceptance keeps reading one operation per entry.
            toolName: routedOperationName(name, businessArgs),
            requestId,
            args,
            businessArgs: routedBusinessArgs(name, businessArgs),
            telemetry,
            startedAt,
            result: envelope,
          });
        }

        if (
          result !== null &&
          typeof result === "object" &&
          !Array.isArray(result) &&
          "content" in result
        ) {
          const withContent = result as {
            content: readonly {
              type: string;
              text?: string;
              [key: string]: unknown;
            }[];
          };
          const content =
            operationSpec.agentVisibleStructuredData === true
              ? withAgentVisibleText(withContent.content, data)
              : withContent.content;
          return {
            ...(result as Record<string, unknown>),
            content,
            structuredContent: envelope,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(envelope) }],
          structuredContent: envelope,
        };
      } catch (error) {
        // Log error in diagnostic mode
        if (diagnosticModeEnabled) {
          await appendDiagnosticErrorUsage({
            runtime,
            // Usage evidence records the routed operation (kb_model mode
            // predicates logs as kb_suggest_predicates) so telemetry
            // acceptance keeps reading one operation per entry.
            toolName: routedOperationName(name, businessArgs),
            requestId,
            args,
            businessArgs: routedBusinessArgs(name, businessArgs),
            telemetry,
            startedAt,
            error,
            resetState: { resetAttempted, resetSucceeded, resetError },
          });
        }
        if (
          isToolTimeoutError(error) &&
          isMutationEffect(operationSpec.effects) &&
          // A kb_upsert dry run writes nothing, so its outcome is known.
          !(name === "kb_upsert" && businessArgs.dryRun === true)
        ) {
          const recoveryActions = [
            {
              operation: "kb_status" as const,
              reason:
                "Determine whether the mutation crossed the authoritative source/journal commit boundary before taking any further action.",
              required: true,
            },
            {
              operation: "kb_apply_plan" as const,
              reason:
                "If status exposes a recovery journal, replay that typed journal action; never retry the timed-out mutation request.",
              required: true,
            },
          ];
          const timeoutData = {
            effectFailures: [
              {
                kind: "mutation",
                errorCode: "MUTATION_OUTCOME_UNKNOWN",
                detail: {
                  requestId,
                  timeoutMs: error.timeoutMs,
                },
              },
            ],
            nextActions: recoveryActions,
          };
          const envelope = toKibiResult(operationSpec, timeoutData, {
            status: "error",
            nextActions: recoveryActions,
            error: {
              code: "MUTATION_OUTCOME_UNKNOWN",
              message:
                "The mutation timed out after cancellation; its commit state is indeterminate. Inspect status and replay the typed recovery action if required.",
              retryable: false,
              details: { requestId, tool: name },
            },
          });
          return {
            content: [{ type: "text", text: JSON.stringify(envelope) }],
            structuredContent: envelope,
          };
        }
        const limitExceeded = queryLimitExceededOf(error);
        if (error instanceof Error && limitExceeded !== null) {
          // A read stopped at its engine limit has no answer: say which
          // limit stopped it rather than failing like a broken tool.
          const envelope = withWorkspaceNotice(
            withWorkspaceNotice(
              toKibiResult(operationSpec, null, {
                status: "error",
                error: {
                  code: QUERY_LIMIT_EXCEEDED_CODE,
                  message: error.message,
                  retryable: false,
                  details: { limitExceeded },
                },
              }),
              workspaceNotice,
            ),
            observed.notice(),
          );
          return {
            content: [{ type: "text", text: JSON.stringify(envelope) }],
            structuredContent: envelope,
            isError: true,
          };
        }
        throw error;
      } finally {
        // Always clean up from Map when done (success or failure)
        trackedRequests.delete(requestId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[KIBI-MCP] Error in tool ${name}:`, err.message);
      if (err.stack) {
        debugLog(`[KIBI-MCP] Tool ${name} stack:`, err.stack);
      }
      throw new Error(
        `Tool ${name} failed: ${err.message}${staleInstallHint(err)}`,
        { cause: err },
      );
    }
  };

  (
    server as McpServer & {
      registerTool: (
        n: string,
        c: {
          description: string;
          inputSchema: z.ZodTypeAny;
          outputSchema?: z.ZodTypeAny;
          annotations?: ToolAnnotations;
        },
        h: (
          args: Record<string, unknown>,
          extra?: ToolRequestExtra,
        ) => Promise<unknown>,
      ) => void;
    }
  ).registerTool(
    name,
    {
      description,
      inputSchema: jsonSchemaToZod(inputSchema),
      ...(outputSchema ? { outputSchema: jsonSchemaToZod(outputSchema) } : {}),
      ...(annotations ? { annotations } : {}),
    },
    wrappedHandler,
  );
}

// implements REQ-002, REQ-013
export function registerAllTools<TProlog>(
  server: McpServer,
  // INTENTIONAL: same generic bridge cast as addTool — see comment there.
  runtime: ToolsRuntime<TProlog> = DEFAULT_TOOLS_RUNTIME as unknown as ToolsRuntime<TProlog>,
): void {
  registerConfiguredTools(server, runtime, addTool);
  if (enabledOptionalTools().has("kb_job_status")) {
    registerJobStatusTool(server);
  }
}

/**
 * kb_job_status polls background jobs started by long-running operations
 * (`kb_check` and `kb_apply_plan` with `async: true`). This is an MCP-server-native
 * companion to the job receipts, not part of the canonical CLI operation
 * catalog: jobs live in the server process and have no CLI counterpart.
 */
function registerJobStatusTool(server: McpServer): void {
  addTool(
    server,
    "kb_job_status",
    "Poll a background job started with async:true (kb_check or kb_apply_plan async jobs). Returns the kibi.job.v1 state: running, succeeded (with the full result), or failed (with the error).",
    {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "The jobId from the kibi.job.v1 receipt.",
        },
      },
      required: ["jobId"],
    },
    async (args) => {
      const jobId = typeof args.jobId === "string" ? args.jobId : "";
      const job = jobId === "" ? undefined : getJob(jobId);
      if (job === undefined) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                kibiProtocol: 1,
                jobVersion: "kibi.job.v1",
                jobId,
                status: "unknown",
                error:
                  "No such job. Jobs are process-local and dropped on server restart; check the jobId or re-run the operation with async:true.",
              }),
            },
          ],
          structuredContent: {
            kibiProtocol: 1,
            jobVersion: "kibi.job.v1",
            jobId,
            status: "unknown",
            error:
              "No such job. Jobs are process-local and dropped on server restart; check the jobId or re-run the operation with async:true.",
          },
        };
      }
      const snapshot = jobSnapshot(job);
      return {
        content: [{ type: "text", text: JSON.stringify(snapshot) }],
        structuredContent: snapshot,
      };
    },
    undefined,
    undefined,
    {
      title: "Poll a Kibi background job",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  );
}
