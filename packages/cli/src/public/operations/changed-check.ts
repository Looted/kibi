import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { type FindingBlocks, tagBlocks } from "./finding-blocks.js";
import type { OperationResult } from "./types.js";

/** What `kibi check --changed --format json` printed, and how it exited. */
export type ChangedGateRun = Readonly<{ exitCode: number; stdout: string }>;

/** Runs the commit gate over the working tree plus the index. */
export type ChangedGateRunner = (
  workspaceRoot: string,
  sourceFiles: readonly string[] | undefined,
) => Promise<ChangedGateRun>;

type Finding = Readonly<Record<string, unknown>>;

/**
 * kb_check `changed:true`: the commit gate's verdict on what a commit of
 * every current change would hold. Every finding carries `blocks`.
 */
export type ChangedCheckContent = Readonly<{
  changed: true;
  /** True when `git commit` of these changes would pass the gate. */
  commitAllowed: boolean;
  violations: ReadonlyArray<Finding & { blocks: FindingBlocks }>;
  count: number;
  diagnostics: ReadonlyArray<Finding & { blocks: FindingBlocks }>;
  qualityDiagnostics: ReadonlyArray<Finding & { blocks: FindingBlocks }>;
  messages: readonly string[];
  staged?: unknown;
  ownerFindings?: unknown;
  operationalError?: string;
}>;

const CLI_BIN = fileURLToPath(new URL("../../../bin/kibi", import.meta.url));

/**
 * A runner that starts `command` with `prefix` and then the `kibi check`
 * arguments, in the workspace root, with no stdin, and reads the JSON it
 * prints. It rejects when the child cannot start or prints nothing.
 */
export function createChangedGateRunner(
  command: string,
  prefix: readonly string[],
): ChangedGateRunner {
  return (workspaceRoot, sourceFiles) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        command,
        [
          ...prefix,
          "check",
          "--changed",
          ...(sourceFiles ?? []),
          "--format",
          "json",
        ],
        { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (stdout.trim() === "")
          reject(
            new Error(
              `kibi check --changed printed no result (exit ${code}): ${stderr.trim().slice(0, 2000)}`,
            ),
          );
        // A child killed by a signal has no exit code: it did not pass.
        else resolve({ exitCode: code ?? 1, stdout });
      });
    });
}

/**
 * The default runner: this package's own CLI in a child process, so the
 * scratch index (GIT_INDEX_FILE) never touches a long-lived server's
 * environment and the verdict is the gate's own.
 */
export const runChangedGate: ChangedGateRunner = createChangedGateRunner(
  process.execPath,
  [CLI_BIN],
);

function list(value: unknown): Finding[] {
  return Array.isArray(value) ? (value as Finding[]) : [];
}

/** Reads the gate's JSON and tags each finding with what it stops. */
export function changedCheckContent(run: ChangedGateRun): ChangedCheckContent {
  // split always yields at least one line.
  const lastLine = run.stdout.trim().split("\n").pop() as string;
  const parsed = JSON.parse(lastLine) as {
    structuredContent?: Record<string, unknown>;
  };
  const gate = parsed.structuredContent ?? {};
  const violations = tagBlocks(list(gate.violations), "commit", true);
  return {
    changed: true,
    commitAllowed: run.exitCode === 0,
    violations,
    count: violations.length,
    diagnostics: tagBlocks(list(gate.diagnostics), "commit"),
    qualityDiagnostics: tagBlocks(list(gate.qualityDiagnostics), "commit"),
    messages: Array.isArray(gate.messages)
      ? (gate.messages as unknown[]).map(String)
      : [],
    ...(gate.staged !== undefined ? { staged: gate.staged } : {}),
    ...(gate.ownerFindings !== undefined
      ? { ownerFindings: gate.ownerFindings }
      : {}),
    ...(typeof gate.operationalError === "string"
      ? { operationalError: gate.operationalError }
      : {}),
  };
}

/** The one-paragraph text a host shows for the changed check. */
export function changedCheckSummary(content: ChangedCheckContent): string {
  const blocking = [
    ...content.violations,
    ...content.diagnostics,
    ...content.qualityDiagnostics,
  ].filter((finding) => finding.blocks === "commit").length;
  const head = content.commitAllowed
    ? "✓ A commit of these changes passes the commit gate."
    : `✗ A commit of these changes is refused: ${blocking} ${blocking === 1 ? "finding blocks" : "findings block"} the commit.`;
  return [head, ...content.messages, content.operationalError ?? ""]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Runs the commit gate's judgment over the working tree plus the index
 * (only `sourceFiles` and `.kb` when given) and returns its findings,
 * each tagged with what it stops.
 */
export async function executeChangedCheck(
  workspaceRoot: string,
  sourceFiles: readonly string[] | undefined,
  runner: ChangedGateRunner = runChangedGate,
): Promise<OperationResult<ChangedCheckContent>> {
  const content = changedCheckContent(await runner(workspaceRoot, sourceFiles));
  return {
    content: [{ type: "text", text: changedCheckSummary(content) }],
    structuredContent: content,
  };
}
