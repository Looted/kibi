import Ajv2020 from "ajv/dist/2020.js";
import { InputError, OperationError } from "./cli-errors.js";
import { loadOperationSpec } from "./cli-operation-loader.js";
import { isOperationName } from "./cli-operation-metadata.js";
import {
  type DiagnosticTelemetry,
  prepareOperationInput,
} from "./cli-validate.js";
import type { OperationContext } from "./public/operations/runtime-types.js";
import { operationData, toKibiResult } from "./public/operations/result-envelope.js";
import type { OperationSpec } from "./public/operations/types.js";
import type { OperationEffect } from "./public/operations/types.js";

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
  spec?: { name: string; effects: readonly OperationEffect[]; resultVersion?: string },
): CliProtocolResult {
  const envelope = toKibiResult(
    spec ?? { name: operation, effects: [], resultVersion: `kibi.${operation}.v1` },
    null,
    {
      status: "error",
      error: {
        code: error.code,
        message: error.detail,
        retryable: error.exitCode === 1,
      },
    },
  );
  return {
    exitCode: error.exitCode,
    stdout: `${JSON.stringify(envelope)}\n`,
    stderr: `Error [${error.code}]: ${error.detail}\n`,
  };
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
    );
  }

  try {
    const executionContext: CliContext = prepared.telemetry
      ? { ...context, diagnosticTelemetry: prepared.telemetry }
      : context;
    const result = await spec.execute(prepared.businessInput, executionContext);
    const output = operationData(result);
    const envelope = toKibiResult(spec, output);
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
    return { exitCode: 0, stdout: `${JSON.stringify(envelope)}\n` };
  } catch (error) {
    if (error instanceof InputError || error instanceof OperationError) {
      return errorResult(catalogName, error, spec);
    }
    if (error instanceof Error) {
      return errorResult(catalogName, new OperationError("OPERATION_FAILED", error.message), spec);
    }
    return errorResult(catalogName,
      new OperationError("OPERATION_FAILED", "Operation failed unexpectedly."),
      spec,
    );
  }
}
