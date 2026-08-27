import type { Command } from "commander";
import { withExitCode } from "./cli-command.js";

// implements REQ-kibi-verification-evidence-contract
export function registerVerificationCommand(program: Command): void {
  program
    .command("verify [command...]")
    .description(
      "Run an explicit contracted verification command and ingest its Playwright reporter artifact",
    )
    .requiredOption(
      "--test-id <id>",
      "Existing test entity with a verification contract",
    )
    .option("--output <path>", "Reporter artifact path")
    .allowUnknownOption(true)
    .action(
      withExitCode(
        async (
          commandArgv: string[],
          options: { testId: string; output?: string },
        ) =>
          (await import("./commands/verify.js")).verifyCommand(
            {
              testId: options.testId,
              ...(options.output === undefined
                ? {}
                : { outputPath: options.output }),
            },
            commandArgv,
          ),
      ),
    );
}
