import type { Command } from "commander";
import { withExitCode } from "./cli-command.js";
import { runJsonInvocation } from "./cli-json-command.js";
import {
  skillsListCommand,
  skillsLoadCommand,
  skillsReadCommand,
  skillsValidateCommand,
} from "./commands/skills.js";

// implements REQ-kibi-operation-interface-parity
export function registerSkillsCommands(program: Command): void {
  const skillsProgram = program
    .command("skills")
    .description("Manage bundled markdown skills");

  skillsProgram
    .command("list")
    .description("List bundled markdown skills")
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--format <format>", "Output format: json|table", "table")
    .action(async (options, command: Command) => {
      if (options.input !== undefined) {
        await runJsonInvocation({
          operationName: "kb_skills_list",
          inputPath: options.input,
          command,
        });
        return;
      }
      await skillsListCommand(options);
    });

  skillsProgram
    .command("load")
    .description("Load a bundled markdown skill")
    .argument("[id]", "Bundled skill ID")
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--format <format>", "Output format: json|markdown", "markdown")
    .action(async (id: string | undefined, options, command: Command) => {
      if (options.input !== undefined) {
        await runJsonInvocation({
          operationName: "kb_skills_load",
          inputPath: options.input,
          command,
          positionals: [{ name: "id", value: id }],
        });
        return;
      }
      await skillsLoadCommand(id ?? "", options);
    });

  skillsProgram
    .command("read")
    .description("Read a declared bundled skill resource")
    .argument("[id]", "Bundled skill ID")
    .argument("[resource]", "Declared resource path")
    .option("--input <path>", "JSON input file (use - for stdin)")
    .option("--format <format>", "Output format: text|json", "text")
    .action(
      async (
        id: string | undefined,
        resource: string | undefined,
        options,
        command: Command,
      ) => {
        if (options.input !== undefined) {
          await runJsonInvocation({
            operationName: "kb_skills_read",
            inputPath: options.input,
            command,
            positionals: [
              { name: "id", value: id },
              { name: "resource", value: resource },
            ],
          });
          return;
        }
        await skillsReadCommand(id ?? "", resource ?? "", options);
      },
    );

  skillsProgram
    .command("validate")
    .description("Validate a bundled markdown skill path")
    .argument("<path>", "Skill bundle directory or SKILL.md path")
    .option("--format <format>", "Output format: json|table", "table")
    .action(
      withExitCode(
        async (
          pathLike: Parameters<typeof skillsValidateCommand>[0],
          options: Parameters<typeof skillsValidateCommand>[1],
        ) => skillsValidateCommand(pathLike, options),
      ),
    );
}
