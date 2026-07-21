import { runPreflight } from "./preflight";
import { type PrototypeScenario, runPrototype } from "./prototype";

class CliUsageError extends Error {
  readonly name = "CliUsageError";
}

function parsePreflightRunId(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--run-id") {
    throw new CliUsageError("Usage: cli.ts preflight --run-id RUN_ID");
  }
  const runId = args[1];
  if (runId === undefined || runId.trim() === "") {
    throw new CliUsageError("RUN_ID must be non-empty");
  }
  return runId;
}

function parsePrototypeRunId(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--run-id") {
    throw new CliUsageError("Usage: cli.ts prototype --run-id RUN_ID");
  }
  const runId = args[1];
  if (runId === undefined || runId.trim() === "") {
    throw new CliUsageError("RUN_ID must be non-empty");
  }
  return runId;
}

function prototypeScenario(runId: string): PrototypeScenario {
  return {
    id: runId,
    finalState: "expected",
    mcpCalls: ["kb_search", "kb_query", "kb_check"],
    privateManifestAccess: false,
  };
}

// implements REQ-skill-behavioral-efficacy
export function main(args: readonly string[]): number {
  try {
    const command = args[0];
    if (command === "preflight") {
      const runId = parsePreflightRunId(args.slice(1));
      const receipt = runPreflight({
        runId,
        targetModel: "gpt-5.4-mini",
        optimizerModel: "gpt-5.5",
        modelAccess: process.env.SKILLOPT_MODEL_ACCESS === "true",
      });
      process.stdout.write(`${JSON.stringify(receipt)}\n`);
      return receipt.verdict === "pass" ? 0 : 1;
    }
    if (command !== "prototype") {
      throw new CliUsageError("Usage: cli.ts prototype --run-id RUN_ID");
    }
    const runId = parsePrototypeRunId(args.slice(1));
    process.stdout.write(
      `${JSON.stringify(runPrototype(prototypeScenario(runId)))}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof CliUsageError) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
