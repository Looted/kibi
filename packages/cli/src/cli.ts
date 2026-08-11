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

import { once } from "node:events";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { registerJsonOnlyCommands } from "./cli-json-command.js";
import { registerFoundationCommands } from "./cli-register-foundation.js";
import { registerMaintenanceCommands } from "./cli-register-maintenance.js";
import { registerReportingCommands } from "./cli-register-reporting.js";
import { registerSkillsCommands } from "./cli-register-skills.js";

export type { CommandResult } from "./cli-command.js";

const packageJson: unknown = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

function packageVersion(value: unknown): string {
  if (
    value !== null &&
    typeof value === "object" &&
    "version" in value &&
    typeof value.version === "string"
  ) {
    return value.version;
  }
  return "0.1.0";
}

// implements REQ-kibi-operation-interface-parity
export function buildProgram(): Command {
  const program = new Command()
    .name("kibi")
    .description("Prolog-based project knowledge base")
    .version(packageVersion(packageJson))
    .option(
      "--diagnostic-mode",
      "Append diagnostic usage evidence for public JSON operations",
    );

  registerFoundationCommands(program);
  registerReportingCommands(program);
  registerMaintenanceCommands(program);
  registerSkillsCommands(program);
  registerJsonOnlyCommands(program);
  return program;
}

// implements REQ-kibi-operation-interface-parity
export async function main(): Promise<never> {
  let exitCode = process.exitCode ?? 0;
  try {
    await buildProgram().parseAsync(process.argv);
    exitCode = process.exitCode ?? 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    exitCode = 1;
  }
  await Promise.all(
    [process.stdout, process.stderr].map((stream) =>
      stream.writableNeedDrain ? once(stream, "drain") : Promise.resolve(),
    ),
  );
  process.exit(exitCode);
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(resolve(entryPath)).href
) {
  void main();
}
