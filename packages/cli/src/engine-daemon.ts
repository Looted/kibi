#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { runEngineDaemon } from "./engine.js";

function requiredArg(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing ${name} argument`);
  }
  return value;
}

const args = process.argv.slice(2);
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
