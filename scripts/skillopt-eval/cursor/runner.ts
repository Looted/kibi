import { cp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EpisodeRequestSchema } from "../contracts/episode";
import { hashWorkspace } from "../fixtures/workspace";
import { resolveIsolationArtifactRoot } from "../runtime/artifact-root";
import { probeRequiredMcp } from "../runtime/canary-runtime";
import { readOptionalArtifact } from "../runtime/codex-cell-artifacts";
import { sealDefaultCellEvidence } from "../runtime/codex-cell-defaults";
import type { CodexCellOptions } from "../runtime/codex-cell-types";
import {
  FinalStateReceiptSchema,
  runIndependentFinalState,
} from "../runtime/final-state";
import { createIsolationWorkspace } from "../runtime/isolation-workspace";
import { stageKibiMcpBroker } from "../runtime/mcp-broker-stage";
import { SKILLOPT_EVALUATION_BRANCH } from "../runtime/permissions";
import { ProcessControlError, runBoundedProcess } from "../runtime/process";
import { assembleCanonicalSkills } from "../runtime/skill-assembly";
import { scoreCell } from "../scoring/cell";
import { type CursorCellReceipt, sha256Text } from "./types";

export const CURSOR_EVALUATION_BRANCH = SKILLOPT_EVALUATION_BRANCH;

export type CursorCellOptions = Readonly<{
  request: unknown;
  fixtureRoot: string;
  sourceWorktree: string;
  artifactRoot: string;
  targetSkill: Parameters<typeof assembleCanonicalSkills>[0]["targetSkill"];
  candidate: Readonly<{ body: string }>;
  cursorExecutable: string;
  hostVersion: string;
  env?: NodeJS.ProcessEnv;
  finalStateRequests: CodexCellOptions["finalStateRequests"];
  evaluatorManifest: CodexCellOptions["evaluatorManifest"];
  timeoutMs: number;
}>;

export type CompletedCursorCell = Readonly<{
  receipt: CursorCellReceipt;
  artifactDirectory: string;
}>;

export type CursorCellDependencies = Readonly<{
  run?: typeof runBoundedProcess;
  clock?: () => Date;
}>;

/**
 * Runs one non-sealed compatibility cell through the cursor-agent CLI.
 *
 * The lane reuses the evaluator-owned MCP broker, independent final-state
 * verifier, diagnostic usage log, and sealed evidence scorer from the Codex
 * path. Only the agent launcher differs: cursor-agent runs unsandboxed in its
 * disposable workspace copy, so results are advisory compatibility evidence
 * and never feed optimization gates or adoption decisions.
 */

// implements REQ-skillopt-cursor-compat
export async function runCursorCell(
  options: CursorCellOptions,
  dependencies: CursorCellDependencies = {},
): Promise<CompletedCursorCell> {
  const request = EpisodeRequestSchema.parse(options.request);
  const run = dependencies.run ?? runBoundedProcess;
  const clock = dependencies.clock ?? (() => new Date());
  const artifactDirectory = resolve(
    options.artifactRoot,
    "episodes",
    request.episodeId,
  );
  await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
  const workspace = await createIsolationWorkspace({
    artifactRoot: resolveIsolationArtifactRoot(
      resolve(options.artifactRoot, "ephemeral"),
      options.sourceWorktree,
    ),
    runId: request.episodeId,
    role: "target",
  });
  const startedAt = clock().toISOString();
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  let termination: "exit" | "timeout" | "interrupted" = "exit";
  try {
    await cp(options.fixtureRoot, workspace.target, { recursive: true });
    if (hashWorkspace(workspace.target) !== request.workspaceFixtureHash) {
      throw new Error("workspace_fixture_hash_mismatch");
    }
    await mkdir(join(workspace.target, ".kb"), {
      recursive: true,
      mode: 0o700,
    });
    await assembleCanonicalSkills({
      sourceRepoRoot: options.sourceWorktree,
      workspace: workspace.target,
      targetSkill: options.targetSkill,
      candidate: { body: options.candidate.body },
    });
    const broker = await stageKibiMcpBroker(workspace, options.sourceWorktree);
    const cellEnv: NodeJS.ProcessEnv = {
      ...(options.env ?? process.env),
      KIBI_BRANCH: CURSOR_EVALUATION_BRANCH,
    };
    await mkdir(join(workspace.target, ".cursor"), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(
      join(workspace.target, ".cursor", "mcp.json"),
      `${JSON.stringify({
        mcpServers: {
          kibi: {
            command: broker.command,
            args: [...broker.args],
            env: { KIBI_BRANCH: CURSOR_EVALUATION_BRANCH },
          },
        },
      })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    try {
      await probeRequiredMcp({ ...broker, env: cellEnv });
      const result = await run({
        argv: [
          options.cursorExecutable,
          "--print",
          "--output-format",
          "stream-json",
          "--workspace",
          workspace.target,
          "--approve-mcps",
          "--trust",
          "--force",
          "--sandbox",
          "disabled",
          request.prompt,
        ],
        cwd: workspace.target,
        env: cellEnv,
        timeoutMs: options.timeoutMs,
      });
      stdout = result.stdout;
      stderr = result.stderr;
      exitCode = result.exitCode;
    } catch (error) {
      if (error instanceof ProcessControlError) {
        stdout = error.result.stdout;
        stderr = error.result.stderr;
        exitCode = null;
        termination = error.kind === "timeout" ? "timeout" : "interrupted";
      } else {
        throw error;
      }
    }
    const brokerTrace = (await readOptionalArtifact(broker.tracePath)) ?? "";
    const diagnosticReceipt =
      (await readOptionalArtifact(join(workspace.target, ".kb/usage.log"))) ??
      "";
    const receipt = await runIndependentFinalState({
      launch: {
        ...broker.downstream,
        args: [...broker.downstream.args],
        env: {
          ...stringEnvironment(cellEnv),
          KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH: join(
            workspace.privateEvidence,
            "final-state-usage.log",
          ),
        },
      },
      receiptPath: join(artifactDirectory, "final-state.json"),
      requests: options.finalStateRequests.map((entry) => ({ ...entry })),
      binding: {
        caseId: options.evaluatorManifest.taskId,
        roots: {
          publicManifestHash: options.evaluatorManifest.publicManifestHash,
          workspaceHash: options.evaluatorManifest.workspaceHash,
          fixtureSeedHash: options.evaluatorManifest.fixtureSeedHash,
        },
        sequence: 1,
      },
      timeoutMs: options.timeoutMs,
    });
    const finalState = `${JSON.stringify(receipt)}\n`;
    FinalStateReceiptSchema.parse(JSON.parse(finalState));
    const sealed = sealDefaultCellEvidence(
      {
        evaluatorManifest: options.evaluatorManifest,
        finalStateRequests: options.finalStateRequests,
      },
      { finalState, brokerTrace, diagnosticReceipt },
    );
    const scored = scoreCell(options.evaluatorManifest, {
      ...sealed,
      finalState: { ...sealed.finalState, snapshot: finalState },
    });
    const finishedAt = clock().toISOString();
    const cursorReceipt: CursorCellReceipt = {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-cursor-cell",
      host: "cursor-agent",
      hostVersion: options.hostVersion,
      episodeId: request.episodeId,
      runId: request.runId,
      variant: request.variant,
      skill: request.skill,
      taskId: request.taskId,
      candidateBodyHash: sha256Text(options.candidate.body),
      startedAt,
      finishedAt,
      exitCode,
      termination,
      result: {
        outcome: scored.outcome,
        score: scored.score,
        hard: scored.hard,
        criticalFailures: [...scored.criticalFailures],
        terminalCategory: scored.terminalCategory,
      },
      evidenceHashes: {
        brokerTrace: sha256Text(brokerTrace),
        diagnosticReceipt: sha256Text(diagnosticReceipt),
        finalState: sha256Text(finalState),
        transcript: sha256Text(stdout),
      },
    };
    await persistCursorArtifacts(artifactDirectory, cursorReceipt, {
      stdout,
      stderr,
      brokerTrace,
      diagnosticReceipt,
      finalState,
    });
    return { receipt: cursorReceipt, artifactDirectory };
  } finally {
    await workspace.cleanup();
  }
}

async function persistCursorArtifacts(
  artifactDirectory: string,
  receipt: CursorCellReceipt,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  await writeFile(
    join(artifactDirectory, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(artifactDirectory, name), content, {
      encoding: "utf8",
      mode: 0o600,
    });
  }
}

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}
