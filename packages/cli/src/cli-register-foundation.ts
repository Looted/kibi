import type { Command } from "commander";
import { withExitCode } from "./cli-command.js";
import type { JsonInvocation } from "./cli-json-command.js";
import { getCliOperationMetadata } from "./cli-operation-metadata.js";
import type { initCommand } from "./commands/init.js";
import type { migrateCommand } from "./commands/migrate.js";
import type { queryCommand } from "./commands/query.js";
import type { syncCommand } from "./commands/sync.js";

async function runJsonInvocation(invocation: JsonInvocation): Promise<void> {
  const executor = await import("./cli-json-command.js");
  await executor.runJsonInvocation(invocation);
}

// implements REQ-kibi-operation-interface-parity
export function registerFoundationCommands(program: Command): void {
  program
    .command("init")
    .description("Initialize .kb/ directory")
    .option(
      "--no-hooks",
      "Do not install git hooks (hooks installed by default)",
    )
    .action(
      withExitCode(async (options: Parameters<typeof initCommand>[0]) =>
        (await import("./commands/init.js")).initCommand(options),
      ),
    );

  program
    .command("migrate")
    .description("Migrate .kb/config.json to the latest schema version")
    .option("--dry-run", "Preview migration changes without writing files")
    .option("--yes", "Apply migration changes without prompting")
    .action(
      withExitCode(async (options: Parameters<typeof migrateCommand>[0]) =>
        (await import("./commands/migrate.js")).migrateCommand(options),
      ),
    );

  program
    .command("sync")
    .description("Sync entities from documents")
    .option("--validate-only", "Perform validation without mutations")
    .option(
      "--refresh-symbol-coordinates",
      "Refresh generated symbol coordinates",
    )
    .option(
      "--rebuild",
      "Rebuild branch snapshot from scratch (discards current KB)",
    )
    .action(
      withExitCode(async (options: Parameters<typeof syncCommand>[0]) =>
        (await import("./commands/sync.js")).syncCommand(options),
      ),
    );

  program
    .command("query [type]")
    .alias("kb-query")
    .description(getCliOperationMetadata("kb_query").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--id <id>", "Query specific entity by ID")
    .option("--tag <tag>", "Filter by tag")
    .option("--source <path>", "Filter by source file path (substring match)")
    .option("--relationships <id>", "Get relationships from entity")
    .option("--format <format>", "Output format: json|table", "json")
    .option("--limit <n>", "Limit results", "100")
    .option("--offset <n>", "Skip results", "0")
    .action(
      withExitCode(
        async (
          type: Parameters<typeof queryCommand>[0],
          options: Parameters<typeof queryCommand>[1] & { input?: string },
          command: Command,
        ) => {
          if (options.input !== undefined) {
            await runJsonInvocation({
              operationName: "kb_query",
              inputPath: options.input,
              command,
              positionals: [{ name: "type", value: type }],
            });
            return undefined;
          }
          return (await import("./commands/query.js")).queryCommand(
            type,
            options,
          );
        },
      ),
    );

  program
    .command("search [query]")
    .description(getCliOperationMetadata("kb_search").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--type <type>", "Filter by entity type")
    .option("--format <format>", "Output format: json|table", "table")
    .option("--limit <n>", "Limit results", "20")
    .option("--offset <n>", "Skip results", "0")
    .action(async (query, options, command: Command) => {
      if (options.input !== undefined) {
        await runJsonInvocation({
          operationName: "kb_search",
          inputPath: options.input,
          command,
          positionals: [{ name: "query", value: query }],
        });
        return;
      }
      await (await import("./commands/search.js")).searchCommand(
        query,
        options,
      );
    });

  program
    .command("status")
    .description(getCliOperationMetadata("kb_status").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--format <format>", "Output format: json|table", "table")
    .action(async (options, command: Command) => {
      if (options.input !== undefined) {
        await runJsonInvocation({
          operationName: "kb_status",
          inputPath: options.input,
          command,
        });
        return;
      }
      await (await import("./commands/status.js")).statusCommand(options);
    });
}
