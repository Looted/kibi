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
import { errorWasReported } from "./cli-command.js";
import { registerFoundationCommands } from "./cli-register-foundation.js";
import { registerJsonOnlyCommands } from "./cli-register-json.js";
import { registerMaintenanceCommands } from "./cli-register-maintenance.js";
import { registerProofCommand } from "./cli-register-proof.js";
import { registerReportingCommands } from "./cli-register-reporting.js";
import { registerSkillsCommands } from "./cli-register-skills.js";
import { bootstrapKibiEnvironment } from "./env/bootstrap.js";
import { formatVersionLine, readKibiRelease } from "./kibi-release.js";
import { finishCliTelemetry, trackCommandPath } from "./usage-telemetry.js";
import { resolveWorkspaceCwd } from "./workspace-cwd.js";
export type { CommandResult } from "./cli-command.js";

const packageJson: unknown = JSON.parse(
  String(readFileSync(new URL("../package.json", import.meta.url))),
);

export function packageVersion(value: unknown): string {
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

export function isCliEntrypoint(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  return (
    argv1 !== undefined && moduleUrl === pathToFileURL(resolve(argv1)).href
  );
}

export function exitCodeFromCliFailure(error: unknown): number {
  if (!errorWasReported(error)) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }
  return 1;
}

// implements REQ-kibi-operation-interface-parity
export function buildProgram(): Command {
  const program = new Command()
    .name("kibi")
    .description("Prolog-based project knowledge base")
    .version(formatVersionLine(packageVersion(packageJson), readKibiRelease()))
    .option(
      "--diagnostic-mode",
      "Append diagnostic usage evidence for public JSON operations",
    );

  registerFoundationCommands(program);
  registerReportingCommands(program);
  registerMaintenanceCommands(program);
  registerSkillsCommands(program);
  registerProofCommand(program);
  registerJsonOnlyCommands(program);
  return program;
}

// implements REQ-kibi-operation-interface-parity
/**
 * Whether an error only says the reader of stdout went away (`kibi … | head`).
 * The command already did its work, so this is not a command failure.
 */
export function isClosedOutputError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === "EPIPE" || code === "ERR_STREAM_DESTROYED";
}

// implements REQ-kibi-operation-interface-parity
export async function main(): Promise<never> {
  const workspace = resolveWorkspaceCwd(
    process.argv,
    process.cwd(),
    process.env,
  );
  // Unchanged when no enclosing workspace applies; changing to it is a no-op.
  process.chdir(workspace.cwd);
  bootstrapKibiEnvironment();
  const startedAt = new Date();
  const program = buildProgram();
  const commandPath = trackCommandPath(program);
  let stdoutClosed = false;
  let finishing: Promise<never> | undefined;
  const finish = (exitCode: number, failure?: unknown): Promise<never> => {
    finishing ??= (async () => {
      try {
        await finishCliTelemetry({
          commandPath: commandPath(),
          packageVersion: packageVersion(packageJson),
          startedAt,
          exitCode,
          error: failure,
        });
      } catch {
        // Telemetry is best effort and never changes the exit code.
      }
      const streams = stdoutClosed
        ? [process.stderr]
        : [process.stdout, process.stderr];
      await Promise.all(
        streams.map((stream) =>
          // once() rejects when the stream errors instead of draining; a
          // closed reader is not a reason to skip the exit code.
          stream.writableNeedDrain
            ? once(stream, "drain").then(
                () => undefined,
                () => undefined,
              )
            : Promise.resolve(),
        ),
      );
      process.exit(exitCode);
    })();
    return finishing;
  };
  // A reader that closes stdout early (`kibi query req | head`) makes the
  // next write fail with EPIPE, asynchronously and outside any command's
  // try/catch. Finish with the command's own exit code instead of crashing.
  process.stdout.on("error", (error) => {
    if (!isClosedOutputError(error)) throw error;
    stdoutClosed = true;
    void finish(Number(process.exitCode ?? 0));
  });
  let exitCode: number | string;
  let failure: unknown;
  try {
    await program.parseAsync(workspace.argv);
    exitCode = process.exitCode ?? 0;
  } catch (error) {
    if (isClosedOutputError(error)) {
      stdoutClosed = true;
      exitCode = process.exitCode ?? 0;
    } else {
      failure = error;
      exitCode = exitCodeFromCliFailure(error);
    }
  }
  return await finish(Number(exitCode), failure);
}

export async function runCliIfEntrypoint(
  isEntrypoint = isCliEntrypoint(process.argv[1], import.meta.url),
  start = main,
): Promise<void> {
  if (!isEntrypoint) return;
  await start();
}

void runCliIfEntrypoint();
