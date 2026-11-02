import type { Command } from "commander";
import { CLI_OPERATION_METADATA } from "./cli-operation-metadata.js";
import type { OperationName } from "./public/operations/types.js";
import { noteCliErrorCategory } from "./usage-telemetry.js";

/** Operations whose CLI command has its own flags instead of the JSON-only route. */
// implements REQ-kibi-operation-interface-parity
export const INTEGRATED_OPERATIONS: ReadonlySet<string> =
  new Set<OperationName>([
    "kb_query",
    "kb_search",
    "kb_status",
    "kb_find_gaps",
    "kb_coverage",
    "kb_graph",
    "kb_check",
  ]);

// implements REQ-kibi-operation-interface-parity
/**
 * The error for a JSON-only command run without `--input`: it names both
 * ways to pass the document and where to read the fields it takes.
 */
export function missingInputMessage(commandName: string): string {
  return `Error [MISSING_INPUT]: The --input option is required for this command. Pass a JSON file path, or '-' to read standard input, for example: echo '{}' | kibi ${commandName} --input -. Run 'kibi ${commandName} --schema' to print the input fields it accepts.\n`;
}

// implements REQ-kibi-operation-interface-parity
/** Print an operation's JSON input schema, the contract `--input` is validated against. */
export async function printOperationInputSchema(
  operationName: OperationName,
): Promise<void> {
  const { loadOperationSpec } = await import("./cli-operation-loader.js");
  const spec = await loadOperationSpec(operationName);
  process.stdout.write(
    `${JSON.stringify(spec.businessInputSchema, null, 2)}\n`,
  );
}

// implements REQ-kibi-operation-interface-parity
// implements REQ-test-journaled-engine-harness
export function registerJsonOnlyCommands(program: Command): void {
  for (const metadata of CLI_OPERATION_METADATA) {
    if (INTEGRATED_OPERATIONS.has(metadata.name)) continue;
    const commandName = metadata.cliName.replaceAll(" ", "-");
    program
      .command(commandName)
      .description(metadata.description)
      .option("--input <path>", "JSON input file (use - for stdin)")
      .option("--schema", "Print the JSON input schema and exit")
      .action(
        async (
          options: { input?: string; schema?: boolean },
          command: Command,
        ) => {
          if (options.schema === true) {
            await printOperationInputSchema(metadata.name);
            return;
          }
          if (options.input === undefined) {
            noteCliErrorCategory("MISSING_INPUT");
            process.stderr.write(missingInputMessage(commandName));
            process.exitCode = 2;
            return;
          }
          const { runJsonInvocation } = await import("./cli-json-command.js");
          await runJsonInvocation({
            operationName: metadata.name,
            inputPath: options.input,
            command,
          });
        },
      );
  }
}
