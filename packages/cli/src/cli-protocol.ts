import { InputError, OperationError } from "./cli-errors.js";
import { loadOperationSpec } from "./cli-operation-loader.js";
import { isOperationName } from "./cli-operation-metadata.js";
import {
  type DiagnosticTelemetry,
  prepareOperationInput,
} from "./cli-validate.js";
import type { OperationContext } from "./public/operations/runtime-types.js";

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

function errorResult(error: InputError | OperationError): CliProtocolResult {
  return {
    exitCode: error.exitCode,
    stderr: `Error [${error.code}]: ${error.detail}\n`,
  };
}

// implements REQ-kibi-operation-interface-parity
export async function executeOperation(
  catalogName: string,
  input: unknown,
  context: CliContext,
): Promise<CliProtocolResult> {
  if (!isOperationName(catalogName)) {
    return errorResult(
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
      new InputError("VALIDATION_FAILED", prepared.errors.join("; ")),
    );
  }

  try {
    const executionContext: CliContext = prepared.telemetry
      ? { ...context, diagnosticTelemetry: prepared.telemetry }
      : context;
    const result = await spec.execute(prepared.businessInput, executionContext);
    const output = result.structuredContent ?? result;
    return { exitCode: 0, stdout: `${JSON.stringify(output)}\n` };
  } catch (error) {
    if (error instanceof InputError || error instanceof OperationError) {
      return errorResult(error);
    }
    if (error instanceof Error) {
      return errorResult(new OperationError("OPERATION_FAILED", error.message));
    }
    return errorResult(
      new OperationError("OPERATION_FAILED", "Operation failed unexpectedly."),
    );
  }
}
