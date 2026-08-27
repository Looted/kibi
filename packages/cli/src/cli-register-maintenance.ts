import type { Command } from "commander";
import { withExitCode } from "./cli-command.js";
import type { usageMetricsCommand } from "./commands/usage-metrics.js";
import type { usageRemediationCommand } from "./commands/usage-remediation.js";

// implements REQ-kibi-operation-interface-parity
export function registerMaintenanceCommands(program: Command): void {
  const engine = program
    .command("engine")
    .description("Manage the per-workspace Kibi engine");
  engine
    .command("status")
    .description("Show engine and journaled storage status")
    .action(async () =>
      (await import("./commands/engine.js")).engineStatusCommand(),
    );
  engine
    .command("stop")
    .description("Stop the current workspace engine")
    .action(async () =>
      (await import("./commands/engine.js")).engineStopCommand(),
    );

  const storage = program
    .command("storage")
    .description("Inspect and maintain journaled Kibi storage");
  storage
    .command("status")
    .description("Show journaled storage status")
    .action(async () =>
      (await import("./commands/engine.js")).storageStatusCommand(),
    );
  storage
    .command("compact")
    .description("Compact RDF journals into binary snapshots")
    .action(async () =>
      (await import("./commands/engine.js")).storageCompactCommand(),
    );
  storage
    .command("export")
    .description("Export legacy RDF/XML and audit files")
    .requiredOption("--output <directory>", "Export destination directory")
    .action(async (options: { output: string }) =>
      (await import("./commands/engine.js")).storageExportCommand(options),
    );

  program
    .command("gc")
    .description("Garbage collect stale branch KBs")
    .option("--dry-run", "Preview without deleting (default)", true)
    .option("--force", "Quarantine stale branches (reversible)")
    .option("--purge", "Permanently purge quarantined stores past retention")
    .option("--retention-days <n>", "Quarantine retention period", "30")
    .action(async (options) => {
      await (await import("./commands/gc.js")).gcCommand({
        dryRun: !options.force,
        force: options.force,
        purge: options.purge,
        retentionDays: Number(options.retentionDays),
      });
    });

  program
    .command("doctor")
    .description("Diagnose KB setup and configuration")
    .option("--format <format>", "Output format: json|table", "table")
    .action(
      withExitCode(async (options: { format?: "json" | "table" }) =>
        (await import("./commands/doctor.js")).doctorCommand(options),
      ),
    );

  program
    .command("usage-metrics")
    .description("Report usage and quality metrics from .kb/usage.log")
    .option("--format <format>", "Output format: json|table", "table")
    .option("--limit <n>", "Limit top zero-result source files", "10")
    .option(
      "--require-acceptance",
      "Exit non-zero unless the telemetry acceptance report passes",
    )
    .action(
      withExitCode(async (options: Parameters<typeof usageMetricsCommand>[0]) =>
        (await import("./commands/usage-metrics.js")).usageMetricsCommand(
          options,
        ),
      ),
    );

  program
    .command("usage-remediation")
    .description(
      "Enumerate exact diagnostic events and report-level evidence gaps requiring repair",
    )
    .option("--format <format>", "Output format: json|table", "table")
    .option("--limit <n>", "Limit rendered table rows", "50")
    .action(
      withExitCode(
        async (options: Parameters<typeof usageRemediationCommand>[0]) =>
          (
            await import("./commands/usage-remediation.js")
          ).usageRemediationCommand(options),
      ),
    );

  program
    .command("branch")
    .description("Manage branch KBs")
    .argument("<action>", "Action: ensure|migrate|recover|restore")
    .option("--branch <branch>", "Exact branch identity to restore")
    .option("--from <branch>", "Legacy source branch for explicit migration")
    .option(
      "--to <branch>",
      "Exact target Git branch identity (required for migration)",
    )
    .option("--approval-hash <sha256>", "Hash printed by the migration preview")
    .option(
      "--recover-journal <id>",
      "Recover an interrupted branch migration journal",
    )
    .option(
      "--apply",
      "Apply an explicit branch migration (preview is default)",
    )
    .action(async (action, options) => {
      if (action === "ensure") {
        await (await import("./commands/branch.js")).branchEnsureCommand(
          options,
        );
      } else if (action === "migrate") {
        await (await import("./commands/branch.js")).branchMigrateCommand(
          options,
        );
      } else if (action === "recover") {
        await (await import("./commands/branch.js")).branchRecoverCommand(
          options,
        );
      } else if (action === "restore") {
        await (await import("./commands/branch.js")).branchRestoreCommand(
          options,
        );
      } else {
        throw new Error(`Unknown branch action '${action}'`);
      }
    });
}
