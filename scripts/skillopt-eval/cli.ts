import {
  CliUsageError,
  parseRunId,
  parseWorkflowOptions,
  printHelp,
} from "./cli-options";
import { runWorkflowCommand } from "./cli-workflow";
import { runCapabilityCanary, runPreflight } from "./preflight";
import { type PrototypeScenario, runPrototype } from "./prototype";

function prototypeScenario(runId: string): PrototypeScenario {
  return {
    id: runId,
    finalState: "expected",
    mcpCalls: ["kb_search", "kb_query", "kb_check"],
    privateManifestAccess: false,
  };
}

const WORKFLOW_COMMANDS = new Set([
  "dry-run",
  "prepare",
  "optimize",
  "evaluate",
  "bundle",
  "run",
  "resume",
  "status",
  "report",
  "approve",
  "adopt",
]);

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function main(args: readonly string[]): Promise<number> {
  try {
    const command = args[0];
    if (command === undefined || command === "--help" || command === "help") {
      printHelp();
      return 0;
    }
    if (command === "preflight" || command === "smoke") {
      const runId = parseRunId(
        args.slice(1),
        `Usage: cli.ts ${command} --run-id RUN_ID`,
      );
      const receipt = await (command === "preflight"
        ? runPreflight({ runId })
        : runCapabilityCanary({ runId }));
      process.stdout.write(`${JSON.stringify(receipt)}\n`);
      return receipt.verdict === "pass" ? 0 : 1;
    }
    if (command === "prototype") {
      const runId = parseRunId(
        args.slice(1),
        "Usage: cli.ts prototype --run-id RUN_ID",
      );
      process.stdout.write(
        `${JSON.stringify(runPrototype(prototypeScenario(runId)))}\n`,
      );
      return 0;
    }
    if (WORKFLOW_COMMANDS.has(command))
      return await runWorkflowCommand(
        command,
        parseWorkflowOptions(args.slice(1)),
      );
    throw new CliUsageError(`Unknown command: ${command}`);
  } catch (error) {
    if (error instanceof CliUsageError) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
