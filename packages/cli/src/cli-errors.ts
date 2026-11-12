import type { RejectionIssue } from "kibi-agent-core/usage-telemetry";
export class InputError extends Error {
  readonly exitCode = 2;
  readonly retryable = false;

  constructor(
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "InputError";
  }
}

export class OperationError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: string,
    readonly detail: string,
    readonly retryable = true,
  ) {
    super(detail);
    this.name = "OperationError";
  }
}

/**
 * A KB operation refusing its input or the workspace state: a payload that
 * fails validation, a contradiction, an id that does not exist. The message
 * is what the caller always got; `code` names the refusal for anonymous
 * telemetry, which counts it as an expected outcome rather than a failure.
 * It is not an envelope error: the result still reports OPERATION_FAILED.
 */
export class KbRejection extends Error {
  constructor(
    readonly code: KbRejectionCode,
    message: string,
    /**
     * Why, as fixed rule ids and Kibi schema field paths (never values), for
     * the anonymous telemetry that shows where agents struggle.
     */
    readonly issues: readonly RejectionIssue[] = [],
  ) {
    super(message);
  }
}

/**
 * Wrap a failure in a message prefix such as `Upsert execution failed: `,
 * keeping a rejection's code so the refusal is not counted as a fault, and
 * any other failure as the `cause`, so telemetry names the error underneath
 * instead of the wrapper.
 */
export function prefixedFailure(prefix: string, error: unknown): Error {
  const message = `${prefix}${error instanceof Error ? error.message : String(error)}`;
  return error instanceof KbRejection
    ? new KbRejection(error.code, message, error.issues)
    : new Error(message, { cause: error });
}

export type KbRejectionCode =
  | "ENTITY_NOT_FOUND"
  | "ENTITY_VALIDATION_FAILED"
  | "FIRM_DECISION_LOCKED"
  | "INCOMPLETE_PROPOSITIONS"
  | "INVALID_RELATIONSHIP"
  | "LEGACY_BRANCH_STORAGE"
  | "RELATIONSHIP_SOURCE_MISMATCH"
  | "RELATIONSHIP_VALIDATION_FAILED"
  | "SEMANTIC_CONTRADICTION"
  | "UNCOMPILED_SOURCE"
  | "VALIDATION_FAILED";

/** The error envelope fields a thrown Kibi error carries. */
export type CodedErrorFields = {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
};

const ERROR_CODE = /^[A-Z][A-Z0-9_]*$/;

/**
 * The code, message and retryability of a thrown InputError or
 * OperationError, so the CLI JSON route and the MCP server answer it with the
 * same error envelope. A copy of these classes bundled into another package
 * fails `instanceof`, so an error with the same name and a code-shaped `code`
 * counts too. Any other error carries no Kibi code and returns null.
 */
export function codedErrorOf(error: unknown): CodedErrorFields | null {
  if (error instanceof InputError || error instanceof OperationError)
    return {
      code: error.code,
      message: error.detail,
      retryable: error.retryable,
    };
  if (!(error instanceof Error)) return null;
  const candidate = error as Error & {
    readonly code?: unknown;
    readonly detail?: unknown;
    readonly retryable?: unknown;
  };
  if (
    (candidate.name !== "InputError" && candidate.name !== "OperationError") ||
    typeof candidate.code !== "string" ||
    !ERROR_CODE.test(candidate.code)
  )
    return null;
  return {
    code: candidate.code,
    message:
      typeof candidate.detail === "string" ? candidate.detail : error.message,
    retryable:
      typeof candidate.retryable === "boolean"
        ? candidate.retryable
        : candidate.name === "OperationError",
  };
}
