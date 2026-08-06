import {
  CliUsageError,
  parseRunId,
  parseWorkflowOptions,
  printHelp,
} from "./cli-options";
import {
  type WorkflowDependencies,
  defaultWorkflowDependencies,
  runWorkflowCommand,
} from "./cli-workflow";
import { runCapabilityCanary, runPreflight } from "./preflight";
import { type PrototypeScenario, runPrototype } from "./prototype";

export type CliDependencies = WorkflowDependencies;

export const defaultCliDependencies = {
  ...defaultWorkflowDependencies,
  runPreflight,
  runCapabilityCanary,
} satisfies CliDependencies;

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
export async function main(
  args: readonly string[],
  dependencies: CliDependencies = defaultCliDependencies,
): Promise<number> {
  try {
    const command = args[0];
    if (command === undefined || command === "--help" || command === "help") {
      printHelp();
      return 0;
    }
    if (command === "preflight" || command === "smoke") {
      const commandArgs = args.slice(1);
      if (command === "smoke") {
        const acknowledgements = commandArgs.filter(
          (arg) => arg === "--allow-paid",
        );
        if (acknowledgements.length !== 1) {
          throw new CliUsageError(
            "smoke requires exactly one --allow-paid acknowledgement; paidModelCalls=0",
          );
        }
      }
      const runId = parseRunId(
        commandArgs.filter((arg) => arg !== "--allow-paid"),
        `Usage: cli.ts ${command}${command === "smoke" ? " --allow-paid" : ""} --run-id RUN_ID`,
      );
      const receipt = await (command === "preflight"
        ? dependencies.runPreflight({ runId })
        : dependencies.runCapabilityCanary({ runId }));
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
        dependencies,
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
