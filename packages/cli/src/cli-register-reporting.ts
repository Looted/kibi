import type { Command } from "commander";
import { withExitCode } from "./cli-command.js";
import { runJsonInvocation } from "./cli-json-command.js";
import { checkCommand } from "./commands/check.js";
import { coverageCommand } from "./commands/coverage.js";
import { gapsCommand } from "./commands/gaps.js";
import { graphCommand } from "./commands/graph.js";
import { getSpec } from "./public/operations/index.js";

// implements REQ-kibi-operation-interface-parity
export function registerReportingCommands(program: Command): void {
  program
    .command("find-gaps [type]")
    .alias("gaps")
    .description(getSpec("kb_find_gaps").description)
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
      await gapsCommand(type, options);
    });

  program
    .command("coverage")
    .description(getSpec("kb_coverage").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--by <group>", "Coverage mode: req|symbol|type", "req")
    .option("--tag <tags>", "Comma-separated tag filter")
    .option("--include-passing", "Include passing rows", false)
    .option("--no-include-transitive", "Disable transitive symbol coverage")
    .option("--limit <n>", "Limit results", "100")
    .option("--offset <n>", "Skip results", "0")
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
      await coverageCommand(options);
    });

  program
    .command("graph")
    .description(getSpec("kb_graph").description)
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
      await graphCommand(options);
    });

  program
    .command("check")
    .description(getSpec("kb_check").description)
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
          return checkCommand(options);
        },
      ),
    );
}
