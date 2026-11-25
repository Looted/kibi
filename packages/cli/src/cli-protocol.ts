import Ajv2020 from "ajv/dist/2020.js";
import { InputError, OperationError, isKbRejection } from "./cli-errors.js";
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
import { fitOperationResult } from "./public/operations/result-budget.js";
import {
  operationData,
  toKibiResult,
} from "./public/operations/result-envelope.js";
import type { OperationContext } from "./public/operations/runtime-types.js";
import type { OperationSpec } from "./public/operations/types.js";
import type { OperationEffect } from "./public/operations/types.js";
import { detachedReadOnlyDiagnostic } from "./runtime/detached-snapshot.js";
import { noteCliThrownError } from "./usage-telemetry.js";
import {
  alwaysAdvisesNoGit,
  noGitDiagnosticOfResult,
  noGitRepositoryDiagnostic,
  noGitStoreAdoptedDiagnostic,
} from "./vcs/advisory.js";

// Only whether an envelope is valid matters here, never the list of errors.
const outputValidator = new Ajv2020({ strict: false });

/**
 * An operation's data fitted to the result budget by the same function as
 * the MCP tool result, so the CLI JSON route carries the same data for the
 * same call.
 */
export function budgetedOperationResult(
  spec: Parameters<typeof fitOperationResult>[0],
  input: unknown,
  raw: unknown,
): ReturnType<typeof fitOperationResult> {
  return fitOperationResult(spec, input, {
    content: [],
    structuredContent: operationData(raw),
  });
}

export type CliContext = OperationContext & {
  readonly diagnosticTelemetry?: DiagnosticTelemetry;
};

export type CliProtocolResult = {
  readonly exitCode: number;
  readonly stdout?: string;
  readonly stderr?: string;
};

/**
 * The stderr line of a failed route that also prints its JSON result: the
 * code, and where the message is, so the message is printed once.
 */
export function envelopeErrorLine(code: string): string {
  return `Error [${code}]: see error.message in the JSON result on stdout\n`;
}

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
        // Serialized right below, where an undefined `details` disappears.
        details,
      },
    },
  );
  return {
    exitCode: error.exitCode,
    stdout: `${JSON.stringify(envelope)}\n`,
    stderr: envelopeErrorLine(error.code),
  };
}

/**
 * An answer from a detached HEAD's read-only snapshot says so in the
 * envelope: which store was read and that writes are refused.
 */
/**
 * The attachment's notices on a result: a detached HEAD answered from its
 * read-only snapshot, and (on the results it changes) a workspace without
 * Git. Each CLI call is its own process, so other results stay quiet.
 */
function withAttachmentNotices<
  T extends { readonly diagnostics: readonly unknown[] },
>(envelope: T, context: OperationContext, operation: string, data: unknown): T {
  const notices = [
    detachedReadOnlyDiagnostic(context.branchAttachment),
    alwaysAdvisesNoGit(operation)
      ? (noGitRepositoryDiagnostic(context.branchAttachment) ??
        noGitDiagnosticOfResult(data))
      : undefined,
    noGitStoreAdoptedDiagnostic(),
  ].filter((notice) => notice !== undefined);
  return notices.length > 0
    ? { ...envelope, diagnostics: [...envelope.diagnostics, ...notices] }
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
    // An output schema that does not compile accepts no envelope.
  }
  return false;
}

/**
 * The error envelope for a route that never ran because its runtime could
 * not open (no branch to attach, a detached HEAD refusing a write), so
 * stdout still carries one JSON document.
 */
export function openFailureResult(
  catalogName: string,
  spec: Parameters<typeof errorResult>[2],
  error: unknown,
): CliProtocolResult {
  return errorResult(
    catalogName,
    // A coded refusal (no Git repository to attach to) keeps its code.
    error instanceof OperationError
      ? error
      : new OperationError(
          "OPERATION_FAILED",
          error instanceof Error ? error.message : String(error),
          false,
        ),
    spec,
    false,
  );
}

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
      new InputError(
        "VALIDATION_FAILED",
        `${prepared.errors.join("; ")}. Run 'kibi ${spec.cliName.replaceAll(" ", "-")} --schema' to print the input fields and allowed values.`,
      ),
      spec,
      false,
    );
  }

  try {
    const executionContext: CliContext = prepared.telemetry
      ? { ...context, diagnosticTelemetry: prepared.telemetry }
      : context;
    const raw = await spec.execute(prepared.businessInput, executionContext);
    // The same size budget as the MCP tool result, so both carry the same
    // data for the same call.
    const fitted = budgetedOperationResult(spec, prepared.businessInput, raw);
    const output = fitted.result.structuredContent;
    const envelope = withAttachmentNotices(
      toKibiResult(spec, output, {
        appendDiagnostics: fitted.diagnostics,
        appendNextActions: fitted.nextActions,
      }),
      context,
      spec.name,
      output,
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
    // toKibiResult sets an error status only with the terminal error.
    if (envelope.status === "error") {
      const error = envelope.error as NonNullable<typeof envelope.error>;
      return {
        exitCode: 1,
        stdout: `${JSON.stringify(envelope)}\n`,
        stderr: envelopeErrorLine(error.code),
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
    // Only an Error carries a limit (see queryLimitExceededOf).
    if (limitExceeded !== null) {
      return errorResult(
        catalogName,
        new OperationError(
          QUERY_LIMIT_EXCEEDED_CODE,
          (error as Error).message,
          false,
        ),
        spec,
        true,
        { limitExceeded },
      );
    }
    if (error instanceof Error) {
      noteCliThrownError(error);
      // A rejection refuses the input or the workspace state: the same call
      // fails the same way until the agent fixes it. Any other failure is
      // unexplained and may pass when repeated.
      return errorResult(
        catalogName,
        new OperationError(
          "OPERATION_FAILED",
          error.message,
          !isKbRejection(error),
        ),
        spec,
      );
    }
    return errorResult(
      catalogName,
      new OperationError(
        "OPERATION_FAILED",
        "Operation failed unexpectedly.",
        true,
      ),
      spec,
    );
  }
}
