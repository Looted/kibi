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
import {
  SKILLOPT_HOST_ENV,
  type SkillOptHost,
  SkillOptHostSelectionError,
  resolveSkillOptHost,
} from "./runtime/skillopt-host";
import { skillOptHostImplementation } from "./runtime/skillopt-host-registry";

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
  "run",
  "resume",
  "status",
  "report",
  "approve",
  "adopt",
]);

/** Commands that run the selected host: preflight, canaries or target cells. */
const HOST_COMMANDS = new Set([
  "preflight",
  "smoke",
  "prepare",
  "optimize",
  "evaluate",
  "run",
  "resume",
]);

/**
 * Removes `--host VALUE` from the arguments and resolves the run's harness:
 * the flag wins over KIBI_SKILLOPT_HOST, Codex is the default.
 */
// implements REQ-skillopt-host-neutral-optimization
export function extractHostOption(
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Readonly<{ host: SkillOptHost; args: readonly string[] }> {
  const rest: string[] = [];
  let requested: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== "--host") {
      if (arg !== undefined) rest.push(arg);
      continue;
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new CliUsageError("--host requires a value");
    if (requested !== undefined)
      throw new CliUsageError("--host may be supplied once");
    requested = value;
    index += 1;
  }
  try {
    return { host: resolveSkillOptHost({ requested, env }), args: rest };
  } catch (error) {
    if (error instanceof SkillOptHostSelectionError)
      throw new CliUsageError(error.message);
    throw error;
  }
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function main(
  rawArgs: readonly string[],
  dependencies: CliDependencies = defaultCliDependencies,
): Promise<number> {
  try {
    const selection = extractHostOption(rawArgs);
    const args = selection.args;
    const command = args[0];
    if (command === undefined || command === "--help" || command === "help") {
      printHelp();
      return 0;
    }
    // This workflow's preflight, canary and trainer bridge only run on hosts
    // that support it; any other harness is refused before paid preparation
    // instead of silently running Codex.
    if (
      HOST_COMMANDS.has(command) &&
      !skillOptHostImplementation(selection.host).legacyWorkflow
    ) {
      throw new CliUsageError(
        `${command} does not run on host ${selection.host}; use campaign.ts --host ${selection.host}`,
      );
    }
    // Pin the resolved host for every cell and bridge process this run starts.
    process.env[SKILLOPT_HOST_ENV] = selection.host;
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
        parseWorkflowOptions(args.slice(1), command),
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
