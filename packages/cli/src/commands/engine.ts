import path from "node:path";
import { EngineClient } from "../engine.js";
import { resolveActiveBranch } from "../utils/branch-resolver.js";

function currentBranch(root: string): string {
  const resolved = resolveActiveBranch(root);
  if ("error" in resolved) {
    if (
      resolved.code === "NOT_A_GIT_REPO" ||
      resolved.code === "GIT_NOT_AVAILABLE"
    ) {
      return "main";
    }
    throw new Error(resolved.error);
  }
  return resolved.branch;
}

function client(): EngineClient {
  const workspaceRoot = path.resolve(
    process.env.KIBI_WORKSPACE ??
      process.env.KIBI_PROJECT_ROOT ??
      process.env.KIBI_ROOT ??
      process.cwd(),
  );
  return new EngineClient({
    workspaceRoot,
    branch: currentBranch(workspaceRoot),
  });
}

function workspaceRoot(): string {
  return path.resolve(
    process.env.KIBI_WORKSPACE ??
      process.env.KIBI_PROJECT_ROOT ??
      process.env.KIBI_ROOT ??
      process.cwd(),
  );
}

export async function engineStatusCommand(): Promise<void> {
  const engine = client();
  try {
    const result = await engine.storageStatus();
    if (!result.success)
      throw new Error(result.error ?? "Engine status failed");
    let status: unknown = result.bindings.Status ?? null;
    const encoded = result.bindings.Json;
    if (encoded !== undefined) {
      try {
        const decoded = JSON.parse(encoded);
        status = typeof decoded === "string" ? JSON.parse(decoded) : decoded;
      } catch {
        // Preserve the raw Prolog dict text for diagnostics when a mismatched
        // engine version cannot provide the negotiated JSON binding.
      }
    }
    console.log(
      JSON.stringify({
        pid: engine.getPid(),
        running: engine.isRunning(),
        branch: currentBranch(workspaceRoot()),
        status,
      }),
    );
  } finally {
    await engine.terminate();
  }
}

export async function engineStopCommand(): Promise<void> {
  const engine = client();
  try {
    // Stopping an absent daemon must remain a no-op. Starting SWI merely to
    // shut it down defeats the maintenance command and can unexpectedly
    // migrate a legacy branch during an operator status check.
    await engine.stop(false);
    console.log("Kibi engine stopped");
  } finally {
    await engine.terminate();
  }
}

export async function storageStatusCommand(): Promise<void> {
  await engineStatusCommand();
}

export async function storageCompactCommand(): Promise<void> {
  const engine = client();
  try {
    const result = await engine.compact();
    if (!result.success)
      throw new Error(result.error ?? "Storage compaction failed");
    console.log("Kibi storage compacted");
  } finally {
    await engine.terminate();
  }
}

export async function storageExportCommand(options: {
  output: string;
}): Promise<void> {
  const output = path.resolve(options.output);
  const engine = client();
  try {
    const result = await engine.exportStorage(output);
    if (!result.success)
      throw new Error(result.error ?? "Storage export failed");
    console.log(`Exported Kibi storage to ${output}`);
  } finally {
    await engine.terminate();
  }
}
