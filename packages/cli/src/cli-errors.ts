// implements REQ-kibi-operation-interface-parity
export class InputError extends Error {
  // implements REQ-kibi-operation-interface-parity
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

// implements REQ-kibi-operation-interface-parity
export class OperationError extends Error {
  // implements REQ-kibi-operation-interface-parity
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

/** The error envelope fields a thrown Kibi error carries. */
// implements REQ-mcp-coded-error-envelope
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
// implements REQ-mcp-coded-error-envelope, REQ-kibi-operation-interface-parity
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
