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
    .command("check-generated")
    .description(
      "Compare generated symbol manifests with the staged Git snapshot",
    )
    .requiredOption("--staged", "Use the exact Git index bytes")
    .option(
      "--changed-only",
      "Skip regeneration when staged paths cannot affect symbols",
    )
    .action(
      withExitCode(async (options: { changedOnly?: boolean }) =>
        (await import("./commands/check-generated.js")).checkGeneratedManifests(
          options,
        ),
      ),
    );

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
    .command("report")
    .description(
      "Generate a self-contained HTML requirement-health report for local viewing or CI publishing",
    )
    .option(
      "--output <path>",
      "HTML file or directory (directories receive index.html)",
      "kibi-report",
    )
    .option("--open", "Open the generated report in the default browser", false)
    .option("--tag <tags>", "Comma-separated tag filter")
    .option(
      "--limit <n>",
      "Maximum complete requirement rows (1-100000)",
      "10000",
    )
    .action(async (options) => {
      await (await import("./commands/report.js")).reportCommand(options);
    });

  program
    .command("signoff")
    .description(
      "Show the requirements a change adds, rewrites or affects (or, with --questions, the decisions waiting for the person) as chat Markdown, a fenced block for host renderers, an HTML page or JSON for signoff",
    )
    .option(
      "--staged",
      "Summarize staged changes instead of the working tree",
      false,
    )
    .option(
      "--questions <path>",
      'Render decision questions from a JSON file (use - for stdin): {"questions":[{"statement":"...","quote":"...","firmness":"firm"}]}',
    )
    .option(
      "--format <format>",
      "Output format: chat (plain Markdown for a reply) | md (fenced block for host renderers) | html | json; default chat, or KIBI_SIGNOFF_FORMAT",
    )
    .option(
      "--output <path>",
      "HTML file to write (default .kb/briefs/signoff/latest.html)",
    )
    .option("--open", "Open the HTML page in the default browser", false)
    .option("--no-proof", "Skip the proof-state lookup (faster; no Prolog)")
    .action(async (options) => {
      await (await import("./commands/signoff.js")).signoffCommand(options);
    });

  program
    .command("coverage")
    .description(getCliOperationMetadata("kb_coverage").description)
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--by <group>", "Coverage mode: req|symbol|type", "req")
    .option("--tag <tags>", "Comma-separated tag filter")
    .option("--include-passing", "Include passing rows", false)
    .option(
      "--status <statuses>",
      "Comma-separated requirement proof-status filter (tested, missing, unresolved, not_applicable); implies include-passing",
    )
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
    .option(
      "--write-certificates <file>",
      "Also save the kibi.certificates.v1 bundle the kb-consistency rule re-checked",
    )
    .option(
      "--certificates <file>",
      "Only re-check a saved kibi.certificates.v1 bundle against the current KB with the independent checker",
    )
    .action(
      withExitCode(
        async (
          options: Parameters<typeof checkCommand>[0] & {
            input?: string;
            writeCertificates?: string;
            certificates?: string;
          },
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
          // implements REQ-kibi-kb-certificates
          if (options.certificates !== undefined) {
            if (
              options.writeCertificates !== undefined ||
              options.staged ||
              options.rules !== undefined
            )
              throw new Error(
                "check: --certificates only re-checks a saved bundle; it cannot be combined with --write-certificates, --staged or --rules",
              );
            return (
              await import("./commands/check-certificates.js")
            ).checkCertificatesCommand({
              certificates: options.certificates,
              json: options.format === "json",
            });
          }
          if (options.writeCertificates !== undefined && options.staged)
            throw new Error(
              "check: --write-certificates saves the full KB's bundle; it cannot be combined with --staged",
            );
          const { writeCertificates, ...checkOptions } = options;
          const result = await (
            await import("./commands/check.js")
          ).checkCommand(checkOptions);
          if (writeCertificates !== undefined) {
            const saved = await (
              await import("./commands/check-certificates.js")
            ).writeCertificates(writeCertificates);
            process.stderr.write(
              `Saved ${saved.certificates} certificate(s) to ${saved.path}\n`,
            );
          }
          return result;
        },
      ),
    );

  program
    .command("check-diff")
    .description(
      "Run the full protected pull-request impact gate from its trusted GitHub event",
    )
    .action(
      withExitCode(async () =>
        (await import("./commands/check-diff.js")).checkDiffCommand(),
      ),
    );
}
