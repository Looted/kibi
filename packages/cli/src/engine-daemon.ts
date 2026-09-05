#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runEngineDaemon } from "./engine.js";

// Node 22.14 and earlier do not set `import.meta.main`. The journaled engine
// client always hosts this file with `node`, so the entry check must work
// without Bun-only metadata.
// implements REQ-core-journaled-engine-persistence
export function isEngineDaemonEntrypoint(
  argv: readonly string[] = process.argv,
  moduleUrl: string = import.meta.url,
): boolean {
  if ((import.meta as ImportMeta & { main?: boolean }).main === true) {
    return moduleUrl === import.meta.url;
  }
  const entry = argv[1];
  if (typeof entry !== "string" || entry.length === 0) return false;
  try {
    return moduleUrl === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return false;
  }
}

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

if (isEngineDaemonEntrypoint()) {
  await runEngineDaemonCli();
}
