import { Command } from "commander";
import packageJson from "../package.json";
import { checkCommand } from "./commands/check";
import { doctorCommand } from "./commands/doctor";
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
  .description("Query the knowledge base")
  .option("--id <id>", "Query specific entity by ID")
  .option("--tag <tag>", "Filter by tag")
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
  .description("Garbage collect orphaned entities")
  .action(() => {
    console.log("TODO: gc command not yet implemented");
  });

program
  .command("doctor")
  .description("Diagnose KB setup and configuration")
  .action(async () => {
    await doctorCommand();
  });

program.parse(process.argv);
