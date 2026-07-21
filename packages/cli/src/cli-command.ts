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
