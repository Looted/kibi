import type { Command } from "commander";
import {
  skillsListCommand,
  skillsLoadCommand,
  skillsReadCommand,
  skillsValidateCommand,
} from "./commands/skills.js";
import { withExitCode } from "./cli-command.js";

// implements REQ-kibi-operation-interface-parity
export function registerSkillsCommands(program: Command): void {
  const skillsProgram = program
    .command("skills")
    .description("Manage bundled markdown skills");

  skillsProgram
    .command("list")
    .description("List bundled markdown skills")
    .option("--format <format>", "Output format: json|table", "table")
    .action(
      withExitCode(async (options: Parameters<typeof skillsListCommand>[0]) =>
        skillsListCommand(options),
      ),
    );

  skillsProgram
    .command("load")
    .description("Load a bundled markdown skill")
    .argument("<id>", "Bundled skill ID")
    .option("--format <format>", "Output format: json|markdown", "markdown")
    .action(
      withExitCode(
        async (
          id: Parameters<typeof skillsLoadCommand>[0],
          options: Parameters<typeof skillsLoadCommand>[1],
        ) => skillsLoadCommand(id, options),
      ),
    );

  skillsProgram
    .command("read")
    .description("Read a declared bundled skill resource")
    .argument("<id>", "Bundled skill ID")
    .argument("<resource>", "Declared resource path")
    .option("--format <format>", "Output format: text|json", "text")
    .action(
      withExitCode(
        async (
          id: Parameters<typeof skillsReadCommand>[0],
          resource: Parameters<typeof skillsReadCommand>[1],
          options: Parameters<typeof skillsReadCommand>[2],
        ) => skillsReadCommand(id, resource, options),
      ),
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
