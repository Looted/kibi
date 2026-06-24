import {
  buildDiagnosticToolCall,
  deriveDiagnosticHints,
} from "../diagnostics.js";
import type { ToolsRuntime } from "./tool-types.js";

type DiagnosticUsageBase<TProlog> = {
  readonly runtime: ToolsRuntime<TProlog>;
  readonly toolName: string;
  readonly requestId: string;
  readonly args: Record<string, unknown>;
  readonly businessArgs: Record<string, unknown>;
  readonly telemetry: Record<string, unknown> | null;
  readonly startedAt: Date;
};

type DiagnosticErrorResetState = {
  readonly resetAttempted: boolean;
  readonly resetSucceeded: boolean;
  readonly resetError: string | null;
};

// implements REQ-002
export async function appendDiagnosticSuccessUsage<TProlog>(
  input: DiagnosticUsageBase<TProlog> & { readonly result: unknown },
): Promise<void> {
  const finishedAt = new Date();
  const diagnosticFields = input.runtime.deriveDiagnosticFields(
    input.toolName,
    input.businessArgs,
    input.telemetry,
    input.result,
  );
  const toolCall = buildDiagnosticToolCall({
    tool: input.toolName,
    requestId: input.requestId,
    args: input.args,
    diagnosticPhase: "success",
    telemetry: input.telemetry,
  });
  const processHandle = await input.runtime.prologProcess();
  const branchName = await input.runtime.activeBranchName();
  input.runtime.appendUsageLogLine({
    timestamp: finishedAt.toISOString(),
    request_id: input.requestId,
    tool: input.toolName,
    telemetry: input.telemetry,
    business_args: input.businessArgs,
    tool_call: toolCall,
    retry_key: toolCall.retry_key,
    diagnostic_phase: toolCall.diagnostic_phase,
    status: "success",
    started_at: input.startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - input.startedAt.getTime(),
    prolog_pid: processHandle?.getPid() ?? null,
    active_branch: branchName,
    ...diagnosticFields,
  });
}

// implements REQ-002
export async function appendDiagnosticErrorUsage<TProlog>(
  input: DiagnosticUsageBase<TProlog> & {
    readonly error: unknown;
    readonly resetState: DiagnosticErrorResetState;
  },
): Promise<void> {
  const finishedAt = new Date();
  const err =
    input.error instanceof Error ? input.error : new Error(String(input.error));
  const diagnosticErrorFields = input.runtime.classifyDiagnosticError(err);
  const diagnosticHints = deriveDiagnosticHints({
    tool: input.toolName,
    error: err,
    businessArgs: input.businessArgs,
  });
  const toolCall = buildDiagnosticToolCall({
    tool: input.toolName,
    requestId: input.requestId,
    args: input.args,
    diagnosticPhase: "error",
    error: err,
    telemetry: input.telemetry,
  });
  const processHandle = await input.runtime.prologProcess();
  const branchName = await input.runtime.activeBranchName();
  input.runtime.appendUsageLogLine({
    timestamp: finishedAt.toISOString(),
    request_id: input.requestId,
    tool: input.toolName,
    telemetry: input.telemetry,
    business_args: input.businessArgs,
    tool_call: toolCall,
    retry_key: toolCall.retry_key,
    diagnostic_phase: toolCall.diagnostic_phase,
    status: "error",
    started_at: input.startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - input.startedAt.getTime(),
    prolog_pid: processHandle?.getPid() ?? null,
    active_branch: branchName,
    reset_attempted: input.resetState.resetAttempted,
    reset_succeeded: input.resetState.resetSucceeded,
    reset_error: input.resetState.resetError,
    diagnostic_hints: [diagnosticHints],
    ...diagnosticErrorFields,
  });
}
