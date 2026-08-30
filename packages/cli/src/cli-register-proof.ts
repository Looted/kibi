import type { Command } from "commander";
import { withExitCode } from "./cli-command.js";

// implements REQ-kibi-proof-evidence-protocol
export function registerProofCommand(program: Command): void {
  program
    .command("prove")
    .description(
      "Run the configured proof producers and ingest valid kibi.proof-run.v1 evidence",
    )
    .option("--test <id>", "Prove a single test entity")
    .option(
      "--requirement <id>",
      "Prove every proof-bearing test behind a requirement",
    )
    .option("--integration <id>", "Prove only tests bound to one integration")
    .option("--all", "Prove every proof-bearing test in the knowledge base")
    .action(
      withExitCode(
        async (options: {
          test?: string;
          requirement?: string;
          integration?: string;
          all?: boolean;
        }) => {
          const mode = [
            options.test ? "test" : undefined,
            options.requirement ? "requirement" : undefined,
            options.integration ? "integration" : undefined,
            options.all ? "all" : undefined,
          ].filter(Boolean).length;
          if (mode > 1)
            throw new Error(
              "prove: choose exactly one selector: --test, --requirement, --integration, or --all",
            );
          return await (await import("./commands/prove.js")).proveCommand({
            ...(options.test === undefined ? {} : { testId: options.test }),
            ...(options.requirement === undefined
              ? {}
              : { requirement: options.requirement }),
            ...(options.integration === undefined
              ? {}
              : { integration: options.integration }),
            all: mode === 0,
          });
        },
      ),
    );

  const proof = program
    .command("proof")
    .description("Inspect proof integration");
  proof
    .command("inspect")
    .description(
      "Detect test infrastructure and recommend the strongest available proof integration",
    )
    .option("--json", "Emit structured JSON", false)
    .action(
      withExitCode(async (options: { json?: boolean }) => {
        const result = await (
          await import("./proof/inspect.js")
        ).inspectProofEnvironment(process.cwd());
        if (options.json) {
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
          return undefined;
        }
        process.stdout.write(renderInspection(result));
        return undefined;
      }),
    );
}

function renderInspection(result: unknown): string {
  const inspection = result as {
    languages: string[];
    buildSystems: string[];
    detectedRunners: string[];
    ciWorkflows: string[];
    currentIntegration: string | null;
    recommendation: string;
    missing: string[];
  };
  const lines: string[] = ["Proof environment", ""];
  if (inspection.languages.length > 0)
    lines.push(`Languages: ${inspection.languages.join(", ")}`);
  if (inspection.buildSystems.length > 0)
    lines.push(`Build systems: ${inspection.buildSystems.join(", ")}`);
  lines.push("");
  lines.push("Detected runners:");
  if (inspection.detectedRunners.length === 0) {
    lines.push("  (none detected)");
  } else {
    for (const runner of inspection.detectedRunners)
      lines.push(`  ✓ ${runner}`);
  }
  if (inspection.ciWorkflows.length > 0)
    lines.push(`CI workflows: ${inspection.ciWorkflows.join(", ")}`);
  lines.push("");
  lines.push(`Current integration: ${inspection.currentIntegration ?? "none"}`);
  lines.push("");
  lines.push(`Recommendation: ${inspection.recommendation}`);
  if (inspection.missing.length > 0) {
    lines.push("");
    lines.push("Missing:");
    for (const entry of inspection.missing) lines.push(`  - ${entry}`);
  }
  return `${lines.join("\n")}\n`;
}
