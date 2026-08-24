import { cp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EpisodeRequestSchema } from "../contracts/episode";
import { fixtureSymbolId, hashWorkspace } from "../fixtures/workspace";
import { scoreCell } from "../scoring/cell";
import { resolveIsolationArtifactRoot } from "./artifact-root";
import { RequiredMcpStartupError } from "./canary-runtime";
import {
  persistCodexEpisode,
  readOptionalArtifact,
} from "./codex-cell-artifacts";
import { defaultCodexCellDependencies } from "./codex-cell-defaults";
import {
  CallerScoreInjectionError,
  type CodexCellDependencies,
  type CodexCellOptions,
  type CompletedCodexCell,
  FixtureIntegrityError,
} from "./codex-cell-types";
import { replayCodexEpisode } from "./codex-episode";
import {
  FixtureSetupError,
  setupGeneratedCoordinateDivergence,
} from "./fixture-kb-setup";
import { createIsolationWorkspace } from "./isolation-workspace";
import {
  SKILLOPT_EVALUATION_BRANCH,
  buildCodexConfig,
  buildCodexExecArgv,
} from "./permissions";
import { ProcessControlError } from "./process";
import { assembleCanonicalSkills } from "./skill-assembly";

export { FixtureIntegrityError } from "./codex-cell-types";
export type {
  CodexCellDependencies,
  CodexCellOptions,
  CompletedCodexCell,
} from "./codex-cell-types";

/** Codex rejects open object schemas; keep this strict like canary/optimizer. */
export const EPISODE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["completed"],
  properties: {
    completed: { type: "boolean" },
  },
} as const;

function assertNoCallerScoreInjection(options: CodexCellOptions): void {
  if (Object.hasOwn(options, "score") || Object.hasOwn(options, "receipt")) {
    throw new CallerScoreInjectionError();
  }
}

// implements REQ-skillopt-codex-optimization
export async function runCodexCell(
  options: CodexCellOptions,
  dependencies: CodexCellDependencies = defaultCodexCellDependencies(options),
): Promise<CompletedCodexCell> {
  assertNoCallerScoreInjection(options);
  const request = EpisodeRequestSchema.parse(options.request);
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
  const startedAt = dependencies.clock().toISOString();
  let transcript = "";
  let stderr = "";
  let exitCode: number | null = null;
  let termination: "exit" | "timeout" | "interrupted" = "exit";
  let brokerTrace = "";
  let diagnosticReceipt = "";
  let finalState = "";
  let infrastructureFailure: string | undefined;
  try {
    await cp(options.fixtureRoot, workspace.target, { recursive: true });
    if (hashWorkspace(workspace.target) !== request.workspaceFixtureHash) {
      throw new FixtureIntegrityError();
    }
    // Real materialized fixtures intentionally omit .kb. Create its directory
    // before Codex applies the direct-access deny rule so the brokered Kibi MCP
    // runtime can initialize diagnostic usage logging beneath it.
    await mkdir(join(workspace.target, ".kb"), {
      recursive: true,
      mode: 0o700,
    });
    await assembleCanonicalSkills({
      sourceRepoRoot: options.sourceWorktree,
      workspace: workspace.target,
      targetSkill: options.targetSkill,
      ...(options.candidate === undefined
        ? {}
        : { candidate: options.candidate }),
    });
    const login = await dependencies.prepareLogin({
      privateCodexHome: workspace.codexHome,
      sandboxHome: workspace.sandboxHome,
      env: options.env,
    });
    const cellEnv = {
      ...login.env,
      KIBI_BRANCH: SKILLOPT_EVALUATION_BRANCH,
    };
    const broker = await dependencies.stageBroker(
      workspace,
      options.sourceWorktree,
    );
    // Evaluator-owned precondition setup runs AFTER staging the broker and
    // BEFORE the MCP probe/model launch, using the staged production CLI.
    // The model never gains direct `.kb` access; the sandbox deny rule and
    // the broker allowlist stay intact.
    if (
      options.evaluatorManifest.fixtureSetup ===
      "generated_coordinate_divergence"
    ) {
      const cliRoot = broker.downstream.cliRoot;
      if (cliRoot === undefined) {
        throw new FixtureSetupError("staged runtime exposes no kibi-cli root");
      }
      await setupGeneratedCoordinateDivergence(
        workspace.target,
        cliRoot,
        fixtureSymbolId(request.taskId),
      );
    }
    const runtimeRoot = join(workspace.target, ".runtime");
    await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
    const outputSchema = join(runtimeRoot, "episode-output.schema.json");
    await writeFile(outputSchema, JSON.stringify(EPISODE_OUTPUT_SCHEMA), {
      mode: 0o600,
    });
    await writeFile(
      join(workspace.codexHome, "config.toml"),
      buildCodexConfig({
        role: "target",
        authMode: login.mode,
        paths: {
          workspace: workspace.target,
          runPrivateHome: workspace.codexHome,
          realCodexHome: login.realCodexHome,
          sourceWorktree: options.sourceWorktree,
          fixtureKb: join(workspace.target, ".kb"),
          privateScorer: workspace.privateScorer,
          privateEvidence: workspace.privateEvidence,
          siblingRuns: workspace.siblingRun,
        },
        bwrapExecutable: options.bwrapExecutable,
        codexExecutable: options.codexExecutable,
        mcpServer: broker,
      }),
      { mode: 0o600 },
    );
    let launched = false;
    try {
      await dependencies.probeMcp({ ...broker, env: cellEnv });
      launched = true;
      const result = await dependencies.run(
        buildCodexExecArgv({
          codexCommand: options.codexExecutable,
          workspace: workspace.target,
          outputSchema,
          role: "target",
        }),
        workspace.target,
        cellEnv,
        options.timeoutMs,
        request.prompt,
      );
      transcript = result.stdout;
      stderr = result.stderr;
      exitCode = result.exitCode;
    } catch (error) {
      if (error instanceof ProcessControlError) {
        transcript = error.result.stdout;
        stderr = error.result.stderr;
        exitCode = null;
        termination = error.kind === "timeout" ? "timeout" : "interrupted";
      } else if (error instanceof RequiredMcpStartupError) {
        infrastructureFailure = "required_mcp_startup";
      } else {
        throw error;
      }
    }
    brokerTrace = await readOptionalArtifact(broker.tracePath);
    diagnosticReceipt = await dependencies.diagnosticReceipt(workspace);
    if (launched) {
      finalState = await dependencies.finalState({
        workspace,
        broker,
        requests: options.finalStateRequests,
        timeoutMs: options.timeoutMs,
        env: cellEnv,
        receiptPath: join(artifactDirectory, "final-state.json"),
      });
    }
    const sealedEvidence = await dependencies.evaluateSealedEvidence({
      finalState,
      brokerTrace,
      diagnosticReceipt,
    });
    const score = scoreCell(options.evaluatorManifest, {
      ...sealedEvidence,
      finalState: { ...sealedEvidence.finalState, snapshot: finalState },
    });
    const receipt = replayCodexEpisode({
      request,
      transcript,
      stderr,
      exitCode,
      termination,
      startedAt,
      finishedAt: dependencies.clock().toISOString(),
      evidence: { brokerTrace, diagnosticReceipt, finalState },
      score,
      hiddenMarkers: options.hiddenMarkers,
      forbiddenRoots: [
        options.sourceWorktree,
        workspace.privateScorer,
        workspace.privateEvidence,
        workspace.siblingRun,
        login.realCodexHome,
      ],
      pricingHash: options.pricingHash,
      priceAmount: options.priceAmount,
      diagnosticReceiptRequired: !sealedEvidence.diagnostic.complete,
      ...(infrastructureFailure === undefined ? {} : { infrastructureFailure }),
    });
    const receiptPath = await persistCodexEpisode(artifactDirectory, receipt, {
      transcript,
      stderr,
      brokerTrace,
      diagnosticReceipt,
      finalState,
    });
    return { receipt, artifactDirectory, receiptPath };
  } finally {
    await workspace.cleanup();
  }
}
