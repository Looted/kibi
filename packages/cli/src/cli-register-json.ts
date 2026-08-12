import type { Command } from "commander";
import { CLI_OPERATION_METADATA } from "./cli-operation-metadata.js";
import type { OperationName } from "./public/operations/types.js";

const INTEGRATED_OPERATIONS = new Set<OperationName>([
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_find_gaps",
  "kb_coverage",
  "kb_graph",
  "kb_check",
]);

// implements REQ-kibi-operation-interface-parity
// implements REQ-test-journaled-engine-harness
export function registerJsonOnlyCommands(program: Command): void {
  for (const metadata of CLI_OPERATION_METADATA) {
    if (INTEGRATED_OPERATIONS.has(metadata.name)) continue;
    program
      .command(metadata.cliName.replaceAll(" ", "-"))
      .description(metadata.description)
      .option("--input <path>", "JSON input file (use - for stdin)")
      .action(async (options: { input?: string }, command: Command) => {
        if (options.input === undefined) {
          process.stderr.write(
            "Error [MISSING_INPUT]: The --input option is required for this command.\n",
          );
          process.exitCode = 2;
          return;
        }
        const { runJsonInvocation } = await import("./cli-json-command.js");
        await runJsonInvocation({
          operationName: metadata.name,
          inputPath: options.input,
          command,
        });
      });
  }
}
