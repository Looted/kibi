import { join } from "node:path";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import type { CodexCellRuntime } from "./real-workflow";

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export class CliUsageError extends Error {
  // implements REQ-skillopt-codex-optimization
  // covered_by TEST-skillopt-codex-optimization
  readonly name = "CliUsageError";
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type WorkflowOptions = Readonly<{
  runId: string;
  artifactRoot: string;
  fake: boolean;
  skill: CanonicalSkill | "all" | undefined;
  allowPaid: boolean;
  maxSteps: number;
  cellRuntime?: CodexCellRuntime;
}>;

function parseSkill(value: string): CanonicalSkill | "all" {
  if (value === "all") return value;
  for (const skill of CANONICAL_SKILLS) if (skill === value) return skill;
  throw new CliUsageError(`Unknown skill: ${value}`);
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function parseRunId(args: readonly string[], usage: string): string {
  if (args.length !== 2 || args[0] !== "--run-id")
    throw new CliUsageError(usage);
  const runId = args[1];
  if (runId === undefined || runId.trim() === "") {
    throw new CliUsageError("RUN_ID must be non-empty");
  }
  return runId;
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function parseWorkflowOptions(args: readonly string[]): WorkflowOptions {
  let runId: string | undefined;
  let artifactRoot: string | undefined;
  let fake = false;
  let skill: CanonicalSkill | "all" | undefined;
  let allowPaid = false;
  let maxSteps = 1;
  let fixtureRoot: string | undefined;
  let evaluatorManifestPath: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--fake") {
      fake = true;
      continue;
    }
    if (arg === "--allow-paid") {
      allowPaid = true;
      continue;
    }
    if (arg === "--skill" || arg === "--max-steps") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--"))
        throw new CliUsageError(`${arg} requires a value`);
      if (arg === "--skill") skill = parseSkill(value);
      else {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
          throw new CliUsageError("--max-steps must be an integer from 1 to 4");
        }
        maxSteps = parsed;
      }
      index += 1;
      continue;
    }
    if (
      [
        "--run-id",
        "--artifact-root",
        "--fixture-root",
        "--evaluator-manifest",
      ].includes(arg ?? "")
    ) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--"))
        throw new CliUsageError(`${arg} requires a value`);
      if (arg === "--run-id") runId = value;
      else if (arg === "--artifact-root") artifactRoot = value;
      else if (arg === "--fixture-root") fixtureRoot = value;
      else evaluatorManifestPath = value;
      index += 1;
      continue;
    }
    throw new CliUsageError(`Unknown workflow option: ${arg}`);
  }
  if (runId === undefined || runId.trim() === "")
    throw new CliUsageError("--run-id RUN_ID is required");
  return {
    runId,
    artifactRoot:
      artifactRoot ?? join(process.cwd(), "artifacts", "skillopt", runId),
    fake,
    skill,
    allowPaid,
    maxSteps,
    ...(fixtureRoot === undefined || evaluatorManifestPath === undefined
      ? {}
      : { cellRuntime: { fixtureRoot, evaluatorManifestPath } }),
  };
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function printHelp(): void {
  process.stdout.write(
    `${[
      "Usage: cli.ts <command> [options]",
      "Commands: preflight, smoke, dry-run, prepare, optimize, evaluate, bundle, run, resume, status, report, approve, adopt, prototype",
      "Workflow options: --run-id RUN_ID --artifact-root PATH [--fake] [--skill SKILL|all] [--max-steps 1..4] [--fixture-root PATH --evaluator-manifest PATH]",
      "Real optimize requires --allow-paid after preflight and smoke; held-out eligible candidates adopt automatically.",
    ].join("\n")}\n`,
  );
}
