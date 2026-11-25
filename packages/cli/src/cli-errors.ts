import type { RejectionIssue } from "kibi-agent-core/usage-telemetry";
import type { BranchResolutionError } from "./utils/branch-resolver.js";
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

/**
 * A failed operation. It is not retryable unless the caller says so: only a
 * failure that the same call, repeated unchanged, may get past (a lock held
 * by a live owner, an unexplained engine failure) sets `retryable`, so a
 * refusal the agent must fix never invites a blind retry.
 */
export class OperationError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: string,
    readonly detail: string,
    readonly retryable = false,
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
 * Whether a failure is a KB rejection, itself or as the cause of a wrapper,
 * so the error envelope never offers to retry a refusal unchanged.
 */
export function isKbRejection(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    if (current instanceof KbRejection) return true;
    current = current.cause;
  }
  return false;
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
  | "RELATIONSHIP_ENDPOINT_MISSING"
  | "RELATIONSHIP_SELF_REFERENCE"
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
      typeof candidate.retryable === "boolean" ? candidate.retryable : false,
  };
}

/**
 * The workspace has no branch for Kibi to attach to. A directory outside any
 * Git repository, or a machine without Git, gets one short instruction an
 * agent can follow on its own: start the repository (or install Git) and
 * retry. KIBI_BRANCH is named as the standalone alternative together with its
 * cost: every later command, hook and MCP server needs the same value, since
 * no marker in .kb/ ever stands in for the branch (ADR-012). Any other
 * resolution failure keeps the resolver's diagnostic. The message always
 * starts with "Failed to resolve active branch", which callers that tolerate
 * a missing attachment match on.
 */
export class BranchResolutionFailure extends OperationError {
  constructor(attachment: BranchResolutionError) {
    const [code, detail] = branchFailureDetail(attachment);
    // The name stays OperationError, so codedErrorOf still reads a copy
    // bundled into another package.
    super(code, `Failed to resolve active branch: ${detail}`, false);
  }
}

const STANDALONE_ALTERNATIVE =
  "To use Kibi without Git, set KIBI_BRANCH=<name> for this and every later Kibi command, Git hook and MCP server in this workspace.";

function branchFailureDetail(
  attachment: BranchResolutionError,
): [code: string, detail: string] {
  switch (attachment.code) {
    case "NOT_A_GIT_REPO":
      return [
        "NOT_A_GIT_REPOSITORY",
        `this directory is not inside a Git repository, and Kibi keeps its knowledge per Git branch. Run 'git init' here (or run Kibi from inside the repository), then retry. ${STANDALONE_ALTERNATIVE}`,
      ];
    case "GIT_NOT_AVAILABLE":
      return [
        "GIT_NOT_AVAILABLE",
        `Git is not installed or not on PATH, and Kibi keeps its knowledge per Git branch. Install Git, then retry. ${STANDALONE_ALTERNATIVE}`,
      ];
    case "DETACHED_HEAD":
      return ["DETACHED_HEAD", attachment.error];
    default:
      return ["BRANCH_UNRESOLVED", attachment.error];
  }
}
