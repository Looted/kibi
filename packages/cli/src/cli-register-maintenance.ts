import type { Command } from "commander";
import { branchEnsureCommand } from "./commands/branch.js";
import { doctorCommand } from "./commands/doctor.js";
import { gcCommand } from "./commands/gc.js";
import { usageMetricsCommand } from "./commands/usage-metrics.js";
import { withExitCode } from "./cli-command.js";

// implements REQ-kibi-operation-interface-parity
export function registerMaintenanceCommands(program: Command): void {
  program
    .command("gc")
    .description("Garbage collect stale branch KBs")
    .option("--dry-run", "Preview without deleting (default)", true)
    .option("--force", "Actually delete stale branches")
    .action(async (options) => {
      await gcCommand({ dryRun: !options.force, force: options.force });
    });

  program
    .command("doctor")
    .description("Diagnose KB setup and configuration")
    .action(withExitCode(async () => doctorCommand()));

  program
    .command("usage-metrics")
    .description("Report usage and quality metrics from .kb/usage.log")
    .option("--format <format>", "Output format: json|table", "table")
    .option("--limit <n>", "Limit top zero-result source files", "10")
    .action(
      withExitCode(async (options: Parameters<typeof usageMetricsCommand>[0]) =>
        usageMetricsCommand(options),
      ),
    );

  program
    .command("branch")
    .description("Manage branch KBs")
    .argument("<action>", "Action: ensure")
    .option("--from <branch>", "Source branch to copy KB from")
    .action(async (action, options) => {
      if (action === "ensure") {
        await branchEnsureCommand(options);
      }
    });
}
