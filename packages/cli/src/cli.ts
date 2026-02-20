import { Command } from "commander";
import packageJson from "../package.json";
import { branchEnsureCommand } from "./commands/branch";
import { checkCommand } from "./commands/check";
import { doctorCommand } from "./commands/doctor";
import { gcCommand } from "./commands/gc.js";
import { initCommand } from "./commands/init";
import { queryCommand } from "./commands/query";
import { syncCommand } from "./commands/sync";

const program = new Command();

program
  .name("kibi")
  .description("Prolog-based project knowledge base")
  .version(packageJson.version);

program
  .command("init")
  .description("Initialize .kb/ directory")
  .option("--hooks", "Install git hooks (post-checkout, post-merge)")
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command("sync")
  .description("Sync entities from documents")
  .action(async () => {
    await syncCommand();
  });

program
  .command("query [type]")
  .description("Query knowledge base")
  .option("--id <id>", "Query specific entity by ID")
  .option("--tag <tag>", "Filter by tag")
  .option("--source <path>", "Filter by source file path (substring match)")
  .option("--relationships <id>", "Get relationships from entity")
  .option("--format <format>", "Output format: json|table", "json")
  .option("--limit <n>", "Limit results", "100")
  .option("--offset <n>", "Skip results", "0")
  .action(async (type, options) => {
    await queryCommand(type, options);
  });

program
  .command("check")
  .description("Check KB consistency and integrity")
  .option("--fix", "Suggest fixes for violations")
  .action(async (options) => {
    await checkCommand(options);
  });

program
  .command("gc")
  .description("Garbage collect stale branch KBs")
  .option("--dry-run", "Preview without deleting (default)", true)
  .option("--force", "Actually delete stale branches")
  .action(async (options) => {
    const dryRun = !options.force;
    await gcCommand({ dryRun, force: options.force });
  });

program
  .command("doctor")
  .description("Diagnose KB setup and configuration")
  .action(async () => {
    await doctorCommand();
  });

program
  .command("branch")
  .description("Manage branch KBs")
  .argument("<action>", "Action: ensure")
  .action(async (action) => {
    if (action === "ensure") {
      await branchEnsureCommand();
    }
  });

program.parse(process.argv);
