import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildOfflineReviewArtifacts,
  planOfflineAdoption,
  writeOfflineReviewArtifacts,
} from "./offline-artifacts";
import { RunStore, runOfflineWorkflow } from "./orchestration";
import { runCapabilityCanary, runPreflight } from "./preflight";
import { type PrototypeScenario, runPrototype } from "./prototype";

class CliUsageError extends Error {
  readonly name = "CliUsageError";
}

type WorkflowOptions = Readonly<{
  runId: string;
  artifactRoot: string;
  fake: boolean;
}>;

function parseRunId(args: readonly string[], usage: string): string {
  if (args.length !== 2 || args[0] !== "--run-id") {
    throw new CliUsageError(usage);
  }
  const runId = args[1];
  if (runId === undefined || runId.trim() === "") {
    throw new CliUsageError("RUN_ID must be non-empty");
  }
  return runId;
}

function parseWorkflowOptions(args: readonly string[]): WorkflowOptions {
  let runId: string | undefined;
  let artifactRoot: string | undefined;
  let fake = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--fake") {
      fake = true;
      continue;
    }
    if (arg === "--run-id" || arg === "--artifact-root") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new CliUsageError(`${arg} requires a value`);
      }
      if (arg === "--run-id") runId = value;
      else artifactRoot = value;
      index += 1;
      continue;
    }
    throw new CliUsageError(`Unknown workflow option: ${arg}`);
  }
  if (runId === undefined || runId.trim() === "") {
    throw new CliUsageError("--run-id RUN_ID is required");
  }
  return {
    runId,
    artifactRoot:
      artifactRoot ?? join(process.cwd(), "artifacts", "skillopt", runId),
    fake,
  };
}

function prototypeScenario(runId: string): PrototypeScenario {
  return {
    id: runId,
    finalState: "expected",
    mcpCalls: ["kb_search", "kb_query", "kb_check"],
    privateManifestAccess: false,
  };
}

function printHelp(): void {
  process.stdout.write(
    `${[
      "Usage: cli.ts <command> [options]",
      "Commands: preflight, smoke, dry-run, prepare, optimize, evaluate, bundle, run, resume, status, report, approve, adopt, prototype",
      "Workflow options: --run-id RUN_ID --artifact-root PATH [--fake]",
      "Real model commands require the bounded smoke gate; --fake is offline-only.",
    ].join("\n")}\n`,
  );
}

async function runWorkflowCommand(
  command: string,
  options: WorkflowOptions,
): Promise<number> {
  if (command === "dry-run" || command === "prepare") {
    await mkdir(options.artifactRoot, { recursive: true, mode: 0o700 });
    await writeFile(
      join(options.artifactRoot, "dry-run.json"),
      `${JSON.stringify({
        schemaVersion: "1.0.0",
        artifactType: "skillopt-dry-run",
        mode: "dry-run",
        runId: options.runId,
        artifactRoot: options.artifactRoot,
      })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    process.stdout.write(`${JSON.stringify({ verdict: "pass", command })}\n`);
    return 0;
  }
  if (command === "status") {
    const state = await new RunStore(
      options.artifactRoot,
      options.runId,
    ).readState();
    process.stdout.write(
      `${JSON.stringify({ runId: options.runId, state })}\n`,
    );
    return state === undefined ? 1 : 0;
  }
  if (command === "report" || command === "approve" || command === "adopt") {
    if (!options.fake) {
      throw new CliUsageError(
        `${command} requires --fake for offline review artifacts`,
      );
    }
    const artifacts = await buildOfflineReviewArtifacts(
      options.runId,
      options.artifactRoot,
    );
    await writeOfflineReviewArtifacts(options.artifactRoot, artifacts);
    if (command === "adopt") {
      const plan = await planOfflineAdoption(process.cwd(), artifacts);
      process.stdout.write(
        `${JSON.stringify({ command, dryRun: true, plan })}\n`,
      );
      return 0;
    }
    process.stdout.write(`${JSON.stringify({ command, verdict: "pass" })}\n`);
    return 0;
  }
  if (!options.fake) {
    throw new CliUsageError(
      `${command} requires --fake until the bounded real smoke gate is enabled`,
    );
  }
  const result = await runOfflineWorkflow({
    root: options.artifactRoot,
    runId: options.runId,
    runLockHash: "0".repeat(64),
  });
  process.stdout.write(`${JSON.stringify({ command, ...result })}\n`);
  return result.phase === "complete" ? 0 : 1;
}

// implements REQ-skill-behavioral-efficacy
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
    if (
      [
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
      ].includes(command)
    ) {
      return await runWorkflowCommand(
        command,
        parseWorkflowOptions(args.slice(1)),
      );
    }
    throw new CliUsageError(`Unknown command: ${command}`);
  } catch (error) {
    if (error instanceof CliUsageError) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
