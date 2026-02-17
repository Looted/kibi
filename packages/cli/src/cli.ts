import { Command } from "commander";
import packageJson from "../package.json";
import { doctorCommand } from "./commands/doctor";
import { initCommand } from "./commands/init";

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
  .action(() => {
    console.log("TODO: sync command not yet implemented");
  });

program
  .command("query")
  .description("Query the knowledge base")
  .action(() => {
    console.log("TODO: query command not yet implemented");
  });

program
  .command("check")
  .description("Check KB consistency and integrity")
  .action(() => {
    console.log("TODO: check command not yet implemented");
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
