import path from "node:path";
import { EngineClient } from "../engine.js";
import {
  classifyStoreLockHolder,
  describeLockHolderPid,
  lockHolderProcess,
  readStoreLockOwner,
} from "../prolog/store-lock.js";
import {
  resolveBranchAttachment,
  resolveReadBranchAttachment,
} from "../utils/branch-resolver.js";

// Engine maintenance never writes the KB, so a detached HEAD addresses the
// daemon serving its read-only snapshot.
function currentBranch(root: string): string {
  const resolved = resolveReadBranchAttachment(root);
  if ("error" in resolved) {
    throw new Error(resolved.error);
  }
  return resolved.kbBranch;
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

/** The pid of a live process holding the active branch store, if any. */
function liveStoreLockHolder(root: string): number | null {
  const attachment = resolveReadBranchAttachment(root);
  if ("error" in attachment) return null;
  const recorded = readStoreLockOwner(attachment.storePath);
  if (recorded === null) return null;
  const state = classifyStoreLockHolder(recorded.owner);
  return state === "alive" && recorded.owner.pid !== undefined
    ? recorded.owner.pid
    : null;
}

export async function engineStopCommand(): Promise<void> {
  const engine = client();
  try {
    // Stopping an absent daemon must remain a no-op. Starting SWI merely to
    // shut it down defeats the maintenance command and can unexpectedly
    // migrate a legacy branch during an operator status check.
    const branch = currentBranch(workspaceRoot());
    if (await engine.stop(false)) {
      console.log("Kibi engine stopped");
      return;
    }
    const { engineSocketPath } = await import("../engine.js");
    console.log(
      `No Kibi engine answered at ${engineSocketPath(workspaceRoot(), branch)}`,
    );
    const holder = liveStoreLockHolder(workspaceRoot());
    if (holder !== null) {
      const owner = lockHolderProcess(holder);
      console.log(
        `The branch store is still held by ${describeLockHolderPid(holder)}. That engine was likely started with a different KIBI_RUNTIME_DIR, XDG_RUNTIME_DIR or TMPDIR; stop it from the same environment, or end pid ${owner.pid}.`,
      );
    }
  } finally {
    await engine.terminate();
  }
}

export async function storageStatusCommand(): Promise<void> {
  await engineStatusCommand();
}

export interface EngineJanitorOptions {
  readonly all?: boolean;
  readonly apply?: boolean;
  readonly format?: string;
}

/**
 * Classify and (optionally) clean stale engine daemons and branch-store
 * locks: crashed engines leave ownership journals behind, worktree removals
 * strand live daemons, dead daemons leave sockets, and stale-lock takeover
 * records outlive the window kb_status reports them for. Report-only by default;
 `--apply` executes the clean actions.
 */
// implements REQ-core-journaled-engine-persistence
export async function engineJanitorCommand(
  options: EngineJanitorOptions,
): Promise<void> {
  const { runtimeDirectory } = await import("../engine.js");
  const { runJanitor } = await import("../prolog/janitor.js");
  const findings = runJanitor({
    workspaceRoot: workspaceRoot(),
    runtimeDirectory: runtimeDirectory(),
    all: options.all === true,
    apply: options.apply === true,
  });
  const cleanable = findings.filter((f) => f.action !== "keep").length;
  const cleaned = options.apply === true ? cleanable : 0;
  if (options.format === "json") {
    console.log(
      JSON.stringify({ findings, cleaned, cleanable, total: findings.length }),
    );
    return;
  }
  if (findings.length === 0) {
    console.log("No engine or lock artifacts found.");
    return;
  }
  for (const finding of findings) {
    if (finding.kind === "takeover-record") {
      console.log(
        `[${finding.action}] takeover record ${finding.recordPath} at=${finding.at} (past the kb_status notice window)`,
      );
      continue;
    }
    const holder =
      "pid" in finding && finding.pid !== undefined
        ? ` pid=${finding.pid}`
        : "";
    const workspace =
      finding.kind === "store-lock" && finding.workspaceRoot !== undefined
        ? ` workspace=${finding.workspaceRoot}`
        : "";
    const scope =
      finding.kind === "store-lock"
        ? `store ${finding.storePath}`
        : `socket ${finding.socketPath}`;
    console.log(
      `[${finding.action}] ${scope}${holder}${workspace} holder=${finding.holderState}`,
    );
  }
  console.log(
    options.apply === true
      ? `${findings.length} finding(s), ${cleaned} cleaned`
      : `${findings.length} finding(s), ${cleanable} cleanable (report only; re-run with --apply)`,
  );
}

export async function storageCompactCommand(): Promise<void> {
  const root = workspaceRoot();
  const attachment = resolveBranchAttachment(root);
  if ("error" in attachment) throw new Error(attachment.error);
  if (attachment.migrationRequired) {
    throw new Error(
      `Storage compaction blocked by legacy attachment (${attachment.gitBranch} -> ${attachment.kbBranch}); migrate the branch KB first.`,
    );
  }
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
