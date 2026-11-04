// implements REQ-kibi-operation-interface-parity
export interface CommandResult {
  readonly exitCode?: number;
}

// implements REQ-kibi-operation-interface-parity
export function withExitCode<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<CommandResult | undefined>,
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs) => {
    const result = await fn(...args);
    if (result?.exitCode !== undefined) {
      process.exitCode = result.exitCode;
    }
  };
}

const reportedErrors = new WeakSet<object>();

/** Note that a command already printed this error, so the CLI does not again. */
// implements REQ-kibi-operation-interface-parity
export function markErrorReported(error: unknown): void {
  if (typeof error === "object" && error !== null) reportedErrors.add(error);
}

// implements REQ-kibi-operation-interface-parity
export function errorWasReported(error: unknown): boolean {
  // WeakSet#has answers false for primitives, so no type guard is needed.
  return reportedErrors.has(error as object);
}
