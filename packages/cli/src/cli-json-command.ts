import type { Command } from "commander";
import { InputError } from "./cli-errors.js";
import { loadInput } from "./cli-input.js";
import { executeOperation } from "./cli-protocol.js";
import {
  listSpecs,
  type OperationName,
} from "./public/operations/index.js";

// implements REQ-kibi-operation-interface-parity
export type JsonInvocation = {
  readonly operationName: OperationName;
  readonly inputPath: string;
  readonly command: Command;
  readonly positionals?: readonly {
    readonly name: string;
    readonly value: string | undefined;
  }[];
};

function writeInputError(error: InputError): void {
  process.stderr.write(`Error [${error.code}]: ${error.detail}\n`);
  process.exitCode = error.exitCode;
}

function findInputConflicts(invocation: JsonInvocation): string[] {
  const optionConflicts = invocation.command.options.flatMap((option) => {
    const name = option.attributeName();
    if (
      name === "input" ||
      invocation.command.getOptionValueSource(name) !== "cli"
    ) {
      return [];
    }
    return option.long === undefined ? [] : [option.long];
  });
  const positionalConflicts = (invocation.positionals ?? [])
    .filter(({ value }) => value !== undefined)
    .map(({ name }) => name);
  return [...positionalConflicts, ...optionConflicts];
}

// implements REQ-kibi-operation-interface-parity
export async function runJsonInvocation(
  invocation: JsonInvocation,
): Promise<void> {
  const conflicts = findInputConflicts(invocation);
  if (conflicts.length > 0) {
    writeInputError(
      new InputError(
        "CONFLICTING_INPUT",
        `--input cannot be combined with: ${conflicts.join(", ")}`,
      ),
    );
    return;
  }

  let input: unknown;
  try {
    input = await loadInput({ input: invocation.inputPath, cwd: process.cwd() });
  } catch (error) {
    if (error instanceof InputError) {
      writeInputError(error);
      return;
    }
    throw error;
  }

  const result = await executeOperation(invocation.operationName, input, {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(),
  });
  if (result.stdout !== undefined) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr !== undefined) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.exitCode;
}

const INTEGRATED_OPERATIONS = new Set<OperationName>([
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_coverage",
  "kb_graph",
  "kb_check",
]);

// implements REQ-kibi-operation-interface-parity
export function registerJsonOnlyCommands(program: Command): void {
  for (const spec of listSpecs()) {
    if (INTEGRATED_OPERATIONS.has(spec.name)) {
      continue;
    }
    program
      .command(spec.cliName.replaceAll(" ", "-"))
      .description(spec.description)
      .option("--input <path>", "JSON input file (use - for stdin)")
      .action(async (options: { input?: string }, command: Command) => {
        if (options.input === undefined) {
          writeInputError(
            new InputError(
              "MISSING_INPUT",
              "The --input option is required for this command.",
            ),
          );
          return;
        }
        await runJsonInvocation({
          operationName: spec.name,
          inputPath: options.input,
          command,
        });
      });
  }
}
