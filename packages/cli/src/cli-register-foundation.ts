import type { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { migrateCommand } from "./commands/migrate.js";
import { queryCommand } from "./commands/query.js";
import { searchCommand } from "./commands/search.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { withExitCode } from "./cli-command.js";
import { runJsonInvocation } from "./cli-json-command.js";
import { getSpec } from "./public/operations/index.js";

// implements REQ-kibi-operation-interface-parity
export function registerFoundationCommands(program: Command): void {
  program
    .command("init")
    .description("Initialize .kb/ directory")
    .option("--no-hooks", "Do not install git hooks (hooks installed by default)")
    .action(
      withExitCode(async (options: Parameters<typeof initCommand>[0]) =>
        initCommand(options),
      ),
    );

  program
    .command("migrate")
    .description("Migrate .kb/config.json to the latest schema version")
    .option("--dry-run", "Preview migration changes without writing files")
    .option("--yes", "Apply migration changes without prompting")
    .action(
      withExitCode(async (options: Parameters<typeof migrateCommand>[0]) =>
        migrateCommand(options),
      ),
    );

  program
    .command("sync")
    .description("Sync entities from documents")
    .option("--validate-only", "Perform validation without mutations")
    .option("--refresh-symbol-coordinates", "Refresh generated symbol coordinates")
    .option("--rebuild", "Rebuild branch snapshot from scratch (discards current KB)")
    .action(
      withExitCode(async (options: Parameters<typeof syncCommand>[0]) =>
        syncCommand(options),
      ),
    );

  program
    .command("query [type]")
    .alias("kb-query")
    .description(getSpec("kb_query").description)
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
          return queryCommand(type, options);
        },
      ),
    );

  program
    .command("search [query]")
    .description(getSpec("kb_search").description)
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
      await searchCommand(query, options);
    });

  program
    .command("status")
    .description(getSpec("kb_status").description)
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
      await statusCommand(options);
    });
}
