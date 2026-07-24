import { readFileSync } from "node:fs";
import { ZodError } from "zod";
import {
  ContractInputError,
  ContractIntegrityError,
  assertRunLockMatches,
  parseRunLockText,
  runLockHash,
} from "./index";

class ContractCliUsageError extends Error {
  readonly name = "ContractCliUsageError";
}

function parsePaths(
  args: readonly string[],
): readonly [string, string | undefined] {
  if (args.length === 1) {
    const path = args[0];
    if (path !== undefined) return [path, undefined];
  }
  if (args.length === 3 && args[1] === "--expected") {
    const path = args[0];
    const expected = args[2];
    if (path !== undefined && expected !== undefined) return [path, expected];
  }
  throw new ContractCliUsageError(
    "usage: contracts/cli.ts validate-run-lock FILE [--expected FILE]",
  );
}

export function main(args: readonly string[]): number {
  try {
    if (args[0] !== "validate-run-lock") {
      throw new ContractCliUsageError(
        "usage: contracts/cli.ts validate-run-lock FILE [--expected FILE]",
      );
    }
    const [path, expectedPath] = parsePaths(args.slice(1));
    const lock = parseRunLockText(readFileSync(path, "utf8"));
    if (expectedPath !== undefined) {
      const expected = parseRunLockText(readFileSync(expectedPath, "utf8"));
      assertRunLockMatches(expected, lock);
    }
    process.stdout.write(
      `${JSON.stringify({ verdict: "accepted", runId: lock.runId, runLockHash: runLockHash(lock) })}\n`,
    );
    return 0;
  } catch (error) {
    if (
      error instanceof ContractCliUsageError ||
      error instanceof ContractInputError ||
      error instanceof ContractIntegrityError ||
      error instanceof ZodError
    ) {
      process.stderr.write(`contract rejected: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
