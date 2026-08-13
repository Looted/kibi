import type { Command } from "commander";
import { withExitCode } from "./cli-command.js";
import type { JsonInvocation } from "./cli-json-command.js";
import { getCliOperationMetadata } from "./cli-operation-metadata.js";
import type { checkCommand } from "./commands/check.js";

async function runJsonInvocation(invocation: JsonInvocation): Promise<void> {
  const executor = await import("./cli-json-command.js");
  await executor.runJsonInvocation(invocation);
}

// implements REQ-kibi-operation-interface-parity
export function registerReportingCommands(program: Command): void {
  program
    .command("find-gaps [type]")
    .alias("gaps")
    .description(getCliOperationMetadata("kb_find_gaps").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option(
      "--missing-rel <rels>",
      "Comma-separated missing relationship filters",
    )
    .option(
      "--present-rel <rels>",
      "Comma-separated present relationship filters",
    )
    .option("--tag <tags>", "Comma-separated tag filter")
    .option("--source <path>", "Source file substring filter")
    .option("--limit <n>", "Limit results", "100")
    .option("--offset <n>", "Skip results", "0")
    .option("--format <format>", "Output format: json|table", "table")
    .action(async (type, options, command: Command) => {
      if (options.input !== undefined) {
        await runJsonInvocation({
          operationName: "kb_find_gaps",
          inputPath: options.input,
          command,
          positionals: [{ name: "type", value: type }],
        });
        return;
      }
      await (await import("./commands/gaps.js")).gapsCommand(type, options);
    });

  program
    .command("coverage")
    .description(getCliOperationMetadata("kb_coverage").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--by <group>", "Coverage mode: req|symbol|type", "req")
    .option("--tag <tags>", "Comma-separated tag filter")
    .option("--include-passing", "Include passing rows", false)
    .option("--no-include-transitive", "Disable transitive symbol coverage")
    .option("--limit <n>", "Limit results", "100")
    .option("--offset <n>", "Skip results", "0")
    .option(
      "--include-migration-preview",
      "Include one read-only legacy semantic migration preview batch",
      false,
    )
    .option(
      "--migration-limit <n>",
      "Maximum migration preview batches (1-10)",
      "1",
    )
    .option(
      "--migration-offset <n>",
      "Skip ready semantic-inventory migration batches",
      "0",
    )
    .option(
      "--migration-predicate-limit <n>",
      "Maximum ranked predicate schemas per proposition",
      "5",
    )
    .option(
      "--migration-predicate-min-score <score>",
      "Minimum predicate schema rank score",
      "0.35",
    )
    .option("--format <format>", "Output format: json|table", "table")
    .action(async (options, command: Command) => {
      if (options.input !== undefined) {
        await runJsonInvocation({
          operationName: "kb_coverage",
          inputPath: options.input,
          command,
        });
        return;
      }
      await (await import("./commands/coverage.js")).coverageCommand(options);
    });

  program
    .command("graph")
    .description(getCliOperationMetadata("kb_graph").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--from <ids>", "Comma-separated seed IDs")
    .option("--relationships <rels>", "Comma-separated relationship filter")
    .option(
      "--direction <direction>",
      "Direction: outgoing|incoming|both",
      "outgoing",
    )
    .option("--depth <n>", "Traversal depth", "1")
    .option("--entity-types <types>", "Comma-separated entity type filter")
    .option("--max-nodes <n>", "Maximum node count", "200")
    .option("--max-edges <n>", "Maximum edge count", "500")
    .option("--format <format>", "Output format: json|table", "table")
    .action(async (options, command: Command) => {
      if (options.input !== undefined) {
        await runJsonInvocation({
          operationName: "kb_graph",
          inputPath: options.input,
          command,
        });
        return;
      }
      await (await import("./commands/graph.js")).graphCommand(options);
    });

  program
    .command("check")
    .description(getCliOperationMetadata("kb_check").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--fix", "Suggest fixes for violations")
    .option(
      "--kb-path <dir>",
      "Path to KB directory (overrides branch resolution)",
    )
    .option("--rules <csv>", "Comma-separated allowlist of rule names to run")
    .option("--staged", "Run check only against staged changes (experimental)")
    .option(
      "--min-links <n>",
      "Minimum number of links required for symbol coverage",
      "1",
    )
    .option("--dry-run", "Do not modify files; only print what would happen")
    .option("--format <format>", "Output format: text|json", "text")
    .action(
      withExitCode(
        async (
          options: Parameters<typeof checkCommand>[0] & { input?: string },
          command: Command,
        ) => {
          if (options.input !== undefined) {
            await runJsonInvocation({
              operationName: "kb_check",
              inputPath: options.input,
              command,
            });
            return undefined;
          }
          return (await import("./commands/check.js")).checkCommand(options);
        },
      ),
    );
}
