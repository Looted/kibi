#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { runEngineDaemon } from "./engine.js";

function requiredArg(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing ${name} argument`);
  }
  return value;
}

// implements REQ-core-journaled-engine-persistence
export async function runEngineDaemonCli(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  try {
    await runEngineDaemon({
      workspaceRoot: requiredArg(args, "--workspace"),
      branch: requiredArg(args, "--branch"),
      socketPath: requiredArg(args, "--socket"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    const socketIndex = args.indexOf("--socket");
    const socketPath = socketIndex >= 0 ? args[socketIndex + 1] : undefined;
    if (socketPath) {
      try {
        writeFileSync(`${socketPath}.error`, `${message}\n`, { mode: 0o600 });
      } catch {
        // Preserve the process exit code even if the diagnostic path is gone.
      }
    }
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await runEngineDaemonCli();
}
