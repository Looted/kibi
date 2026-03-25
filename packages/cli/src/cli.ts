/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { readFileSync } from "node:fs";
import { Command } from "commander";
import { branchEnsureCommand } from "./commands/branch.js";
import { checkCommand } from "./commands/check.js";
import { coverageCommand } from "./commands/coverage.js";
import { doctorCommand } from "./commands/doctor.js";
import { gapsCommand } from "./commands/gaps.js";
import { gcCommand } from "./commands/gc.js";
import { graphCommand } from "./commands/graph.js";
import { initCommand } from "./commands/init.js";
import { queryCommand } from "./commands/query.js";
import { searchCommand } from "./commands/search.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version?: string };
const VERSION = packageJson.version ?? "0.1.0";

const program = new Command();

program
  .name("kibi")
  .description("Prolog-based project knowledge base")
  .version(VERSION);

program
  .command("init")
  .description("Initialize .kb/ directory")
  .option("--no-hooks", "Do not install git hooks (hooks installed by default)")
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command("sync")
  .description("Sync entities from documents")
  .option("--validate-only", "Perform validation without mutations")
  .option(
    "--rebuild",
    "Rebuild branch snapshot from scratch (discards current KB)",
  )
  .action(async (options) => {
    await syncCommand(options);
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
  .command("search [query]")
  .description("Search knowledge base metadata and markdown content")
  .option("--type <type>", "Filter by entity type")
  .option("--format <format>", "Output format: json|table", "table")
  .option("--limit <n>", "Limit results", "20")
  .option("--offset <n>", "Skip results", "0")
  .action(async (query, options) => {
    await searchCommand(query, options);
  });

program
  .command("status")
  .description("Show KB snapshot and freshness metadata")
  .option("--format <format>", "Output format: json|table", "table")
  .action(async (options) => {
    await statusCommand(options);
  });

program
  .command("gaps [type]")
  .description("Find entities missing or present on selected relationships")
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
  .action(async (type, options) => {
    await gapsCommand(type, options);
  });

program
  .command("coverage")
  .description("Generate curated coverage reports")
  .option("--by <group>", "Coverage mode: req|symbol|type", "req")
  .option("--tag <tags>", "Comma-separated tag filter")
  .option("--include-passing", "Include passing rows", false)
  .option("--no-include-transitive", "Disable transitive symbol coverage")
  .option("--limit <n>", "Limit results", "100")
  .option("--offset <n>", "Skip results", "0")
  .option("--format <format>", "Output format: json|table", "table")
  .action(async (options) => {
    await coverageCommand(options);
  });

program
  .command("graph")
  .description("Traverse the KB graph from one or more seed IDs")
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
  .action(async (options) => {
    await graphCommand(options);
  });

program
  .command("check")
  .description("Check KB consistency and integrity")
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
  .option("--from <branch>", "Source branch to copy KB from")
  .action(async (action, options) => {
    if (action === "ensure") {
      await branchEnsureCommand(options);
    }
  });

program.parse(process.argv);
