import Ajv2020 from "ajv/dist/2020.js";
import { InputError, OperationError } from "./cli-errors.js";
import { loadOperationSpec } from "./cli-operation-loader.js";
import { isOperationName } from "./cli-operation-metadata.js";
import {
  type DiagnosticTelemetry,
  prepareOperationInput,
} from "./cli-validate.js";
import {
  QUERY_LIMIT_EXCEEDED_CODE,
  queryLimitExceededOf,
} from "./engine-limits.js";
import {
  operationData,
  toKibiResult,
} from "./public/operations/result-envelope.js";
import type { OperationContext } from "./public/operations/runtime-types.js";
import type { OperationSpec } from "./public/operations/types.js";
import type { OperationEffect } from "./public/operations/types.js";
import { detachedReadOnlyDiagnostic } from "./runtime/detached-snapshot.js";

const outputValidator = new Ajv2020({ strict: false, allErrors: true });

// implements REQ-kibi-operation-interface-parity
export type CliContext = OperationContext & {
  readonly diagnosticTelemetry?: DiagnosticTelemetry;
};

// implements REQ-kibi-operation-interface-parity
export type CliProtocolResult = {
  readonly exitCode: number;
  readonly stdout?: string;
  readonly stderr?: string;
};

function errorResult(
  operation: string,
  error: InputError | OperationError,
  spec?: {
    name: string;
    effects: readonly OperationEffect[];
    resultVersion?: string;
  },
  attempted = true,
  details?: unknown,
): CliProtocolResult {
  const envelope = toKibiResult(
    spec ?? {
      name: operation,
      effects: [],
      resultVersion: `kibi.${operation}.v1`,
    },
    null,
    {
      status: "error",
      attempted,
      error: {
        code: error.code,
        message: error.detail,
        retryable: error.retryable,
        ...(details !== undefined ? { details } : {}),
      },
    },
  );
  return {
    exitCode: error.exitCode,
    stdout: `${JSON.stringify(envelope)}\n`,
    stderr: `Error [${error.code}]: ${error.detail}\n`,
  };
}

/**
 * An answer from a detached HEAD's read-only snapshot says so in the
 * envelope: which store was read and that writes are refused.
 */
// implements REQ-branch-store-recovery-v4
function withDetachedReadOnlyNotice<
  T extends { readonly diagnostics: readonly unknown[] },
>(envelope: T, context: OperationContext): T {
  const notice = detachedReadOnlyDiagnostic(context.branchAttachment);
  return notice
    ? { ...envelope, diagnostics: [...envelope.diagnostics, notice] }
    : envelope;
}

function protocolValid(
  spec: Pick<OperationSpec, "outputSchema">,
  envelope: unknown,
): boolean {
  if (!spec.outputSchema) return true;
  try {
    return outputValidator.compile(spec.outputSchema)(envelope) === true;
  } catch {
    return false;
  }
}

/**
 * The error envelope for a route that never ran because its runtime could
 * not open (no branch to attach, a detached HEAD refusing a write), so
 * stdout still carries one JSON document.
 */
// implements REQ-kibi-operation-interface-parity, REQ-branch-store-recovery-v4
export function openFailureResult(
  catalogName: string,
  spec: Parameters<typeof errorResult>[2],
  error: unknown,
): CliProtocolResult {
  return errorResult(
    catalogName,
    new OperationError(
      "OPERATION_FAILED",
      error instanceof Error ? error.message : String(error),
      false,
    ),
    spec,
    false,
  );
}

// implements REQ-kibi-operation-interface-parity
export async function executeOperation(
  catalogName: string,
  input: unknown,
  context: CliContext,
): Promise<CliProtocolResult> {
  if (!isOperationName(catalogName)) {
    return errorResult(
      catalogName,
      new InputError(
        "UNKNOWN_OPERATION",
        `Unknown operation '${catalogName}'.`,
      ),
    );
  }
  const spec = await loadOperationSpec(catalogName);

  const prepared = prepareOperationInput(input, spec.businessInputSchema);
  if (!prepared.valid) {
    return errorResult(
      catalogName,
      new InputError("VALIDATION_FAILED", prepared.errors.join("; ")),
      spec,
      false,
    );
  }

  try {
    const executionContext: CliContext = prepared.telemetry
      ? { ...context, diagnosticTelemetry: prepared.telemetry }
      : context;
    const result = await spec.execute(prepared.businessInput, executionContext);
    const output = operationData(result);
    const envelope = withDetachedReadOnlyNotice(
      toKibiResult(spec, output),
      context,
    );
    if (!protocolValid(spec, envelope)) {
      return errorResult(
        catalogName,
        new OperationError(
          "PROTOCOL_VALIDATION_FAILED",
          "Operation produced a result that does not satisfy its generated output contract.",
        ),
        spec,
      );
    }
    // A result the operation itself reports as an error (a rejected
    // bootstrap, a refused migration plan) exits non-zero like any other.
    if (envelope.status === "error") {
      return {
        exitCode: 1,
        stdout: `${JSON.stringify(envelope)}\n`,
        ...(envelope.error
          ? {
              stderr: `Error [${envelope.error.code}]: ${envelope.error.message}\n`,
            }
          : {}),
      };
    }
    return { exitCode: 0, stdout: `${JSON.stringify(envelope)}\n` };
  } catch (error) {
    if (error instanceof InputError || error instanceof OperationError) {
      return errorResult(catalogName, error, spec);
    }
    // A read stopped at its engine limit reports the limit, not a failure
    // that could pass for a missing answer.
    const limitExceeded = queryLimitExceededOf(error);
    if (error instanceof Error && limitExceeded !== null) {
      return errorResult(
        catalogName,
        new OperationError(QUERY_LIMIT_EXCEEDED_CODE, error.message, false),
        spec,
        true,
        { limitExceeded },
      );
    }
    if (error instanceof Error) {
      return errorResult(
        catalogName,
        new OperationError("OPERATION_FAILED", error.message),
        spec,
      );
    }
    return errorResult(
      catalogName,
      new OperationError("OPERATION_FAILED", "Operation failed unexpectedly."),
      spec,
    );
  }
}
