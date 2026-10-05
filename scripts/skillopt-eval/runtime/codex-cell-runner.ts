import type { Dirent } from "node:fs";
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EpisodeRequestSchema } from "../contracts/episode";
import {
  bootstrapUserMode,
  bootstrapUserProfile,
} from "../fixtures/bootstrap-user";
import { fixtureSymbolId, hashWorkspace } from "../fixtures/workspace";
import { withHeldOutExecutionLease } from "../held-out-execution-lease";
import { scoreCell } from "../scoring/cell";
import { reserveTargetEpisode } from "../target-episode-budget";
import { RequiredMcpStartupError } from "./canary-runtime";
import { persistRefreshedLogin, withCodexAuthLease } from "./codex-auth";
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
  setupSeededConsistencyKb,
  setupSeededFreshKb,
  setupSeededGovernedAreaKb,
  setupSeededPreconditionKb,
  setupSeededStaleKb,
  setupSeededPartialKb,
  setupThinRootKb,
  stopFixtureEngine,
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

/**
 * Codex rejects open object schemas; keep this strict like canary/optimizer.
 * `answer` carries the user-facing final answer that the evaluator's
 * final-answer lane scores.
 */
// implements REQ-skillopt-codex-optimization
export const EPISODE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["completed", "answer"],
  properties: {
    completed: { type: "boolean" },
    answer: { type: "string" },
  },
} as const;

const WORKSPACE_SOURCE_ROOT = "src";
const MAX_WORKSPACE_SOURCE_FILES = 64;
const MAX_WORKSPACE_SOURCE_BYTES = 256 * 1024;

/**
 * Final contents of the target's `src/` tree for the workspace-assertion lane.
 * Bounded and regular-file only; unreadable entries are skipped.
 */
// implements REQ-skillopt-codex-optimization
export async function readWorkspaceSources(
  workspaceRoot: string,
): Promise<Readonly<Record<string, string>>> {
  const files: Record<string, string> = {};
  let bytes = 0;
  const visit = async (relative: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(join(workspaceRoot, relative), {
        withFileTypes: true,
      });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        await visit(child);
      } else if (
        entry.isFile() &&
        Object.keys(files).length < MAX_WORKSPACE_SOURCE_FILES
      ) {
        try {
          const content = await readFile(join(workspaceRoot, child), "utf8");
          if (bytes + content.length > MAX_WORKSPACE_SOURCE_BYTES) continue;
          bytes += content.length;
          files[child] = content;
        } catch {
          // Unreadable files simply do not contribute.
        }
      }
    }
  };
  await visit(WORKSPACE_SOURCE_ROOT);
  return files;
}

// SWI can encode the workspace URI into a journal filename. Keep that path
// independent of the potentially deep persistent artifact cache, including
// when TMPDIR itself points at a deep checkout.
const MAX_SHORT_TEMP_ROOT_LENGTH = 32;

async function createCellTempParent(): Promise<string> {
  const candidates = [tmpdir(), process.env.XDG_RUNTIME_DIR, "/tmp"];
  let lastError: unknown;
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate === undefined) continue;
    const root = resolve(candidate);
    if (root.length > MAX_SHORT_TEMP_ROOT_LENGTH || seen.has(root)) {
      continue;
    }
    seen.add(root);
    let parent: string | undefined;
    try {
      parent = await mkdtemp(join(root, "kibi-cell-"));
      await chmod(parent, 0o700);
      return parent;
    } catch (error) {
      if (parent !== undefined) {
        await rm(parent, { recursive: true, force: true });
      }
      lastError = error;
    }
  }
  throw lastError ?? new Error("no_short_private_temp_root");
}

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
  await reserveTargetEpisode(options.env, options.sourceWorktree);
  const artifactDirectory = resolve(
    options.artifactRoot,
    "episodes",
    request.episodeId,
  );
  await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
  const cellTempParent = await createCellTempParent();
  let workspaceForCleanup:
    | Awaited<ReturnType<typeof createIsolationWorkspace>>
    | undefined;
  try {
    const workspace = await createIsolationWorkspace({
      artifactRoot: cellTempParent,
      runId: request.episodeId,
      role: "target",
    });
    workspaceForCleanup = workspace;
    const startedAt = dependencies.clock().toISOString();
    let transcript = "";
    let stderr = "";
    let exitCode: number | null = null;
    let termination: "exit" | "timeout" | "interrupted" = "exit";
    let brokerTrace = "";
    let diagnosticReceipt = "";
    let finalState = "";
    let infrastructureFailure: string | undefined;
    const cellExecutionLockRoot = join(
      options.artifactRoot,
      ".fixture-setup-lock",
    );
    await mkdir(cellExecutionLockRoot, { recursive: true, mode: 0o700 });
    await cp(options.fixtureRoot, workspace.target, { recursive: true });
    if (hashWorkspace(workspace.target) !== request.workspaceFixtureHash) {
      throw new FixtureIntegrityError();
    }
    // CLI-owned setup creates and validates its own infrastructure. Keep the
    // fixture's initial absent-root condition until that setup runs.
    // Only fixtures without CLI setup need a directory for broker diagnostics.
    if (
      options.evaluatorManifest.fixtureSetup === undefined ||
      options.evaluatorManifest.fixtureSetup === "none"
    ) {
      await mkdir(join(workspace.target, ".kb"), {
        recursive: true,
        mode: 0o700,
      });
    }
    await assembleCanonicalSkills({
      sourceRepoRoot: options.sourceWorktree,
      workspace: workspace.target,
      targetSkill: options.targetSkill,
      ...(options.baselineSurfaces === undefined
        ? {}
        : { baselineSurfaces: options.baselineSurfaces }),
      ...(options.candidate === undefined
        ? {}
        : { candidate: options.candidate }),
      ...(options.bundleCandidates === undefined
        ? {}
        : { candidates: options.bundleCandidates }),
    });
    return await withCodexAuthLease(options.env, async () => {
      const login = await dependencies.prepareLogin({
        privateCodexHome: workspace.codexHome,
        sandboxHome: workspace.sandboxHome,
        env: options.env,
      });
      try {
        const cellEnv = {
          ...login.env,
          KIBI_BRANCH: SKILLOPT_EVALUATION_BRANCH,
        };
        // Evaluator-owned precondition setup runs BEFORE staging the broker,
        // using the production CLI build of the source worktree. The packed
        // kibi-cli shadow inside the staged MCP runtime deliberately carries no
        // dependency tree, so resolving its dist/cli.js would fail on the very
        // first external require; the source build is byte-identical and
        // dependency-complete. Staging must also complete (and shut down its
        // engine daemon) before the brokered MCP server attaches the same
        // branch store, or the two Prolog clients corrupt each other's foreign
        // term handles. The model never gains direct `.kb` access; the sandbox
        // deny rule and the broker allowlist stay intact.
        const stagingCliRoot = resolve(options.sourceWorktree, "packages/cli");
        await withHeldOutExecutionLease(cellExecutionLockRoot, async () => {
          try {
            if (
              options.evaluatorManifest.fixtureSetup ===
              "generated_coordinate_divergence"
            ) {
              await setupGeneratedCoordinateDivergence(
                workspace.target,
                stagingCliRoot,
                fixtureSymbolId(request.taskId),
              );
            } else {
              const setupMode = options.evaluatorManifest.fixtureSetup;
              if (setupMode === "seeded_fresh_kb") {
                await setupSeededFreshKb(workspace.target, stagingCliRoot);
              } else if (setupMode === "seeded_governed_area_kb") {
                await setupSeededGovernedAreaKb(
                  workspace.target,
                  stagingCliRoot,
                );
              } else if (setupMode === "seeded_precondition_kb") {
                await setupSeededPreconditionKb(
                  workspace.target,
                  stagingCliRoot,
                );
              } else if (setupMode === "seeded_consistency_kb") {
                await setupSeededConsistencyKb(
                  workspace.target,
                  stagingCliRoot,
                );
              } else if (setupMode === "seeded_partial_kb") {
                await setupSeededPartialKb(workspace.target, stagingCliRoot);
              } else if (setupMode === "seeded_stale_kb") {
                await setupSeededStaleKb(workspace.target, stagingCliRoot);
              } else if (setupMode === "thin_root_kb") {
                await setupThinRootKb(workspace.target, stagingCliRoot);
              }
            }
          } finally {
            await stopFixtureEngine(workspace.target);
          }
        });
        // Fixture setup may log semantic-advisor calls before the broker exists.
        // Preserve those records separately so the episode journal contains only
        // model-originated calls, which must reconcile with the broker trace.
        const setupDiagnosticPath = join(workspace.target, ".kb/usage.log");
        const setupDiagnostic = await readOptionalArtifact(setupDiagnosticPath);
        if (setupDiagnostic !== "") {
          const setupDiagnosticRoot = join(
            options.artifactRoot,
            "fixture-setup-diagnostics",
          );
          await mkdir(setupDiagnosticRoot, { recursive: true, mode: 0o700 });
          await writeFile(
            join(setupDiagnosticRoot, `${request.episodeId}.jsonl`),
            setupDiagnostic,
            { mode: 0o600, flag: "wx" },
          );
          await rm(setupDiagnosticPath);
        }
        const userMode = bootstrapUserMode(request.taskId);
        if (userMode !== undefined) {
          await writeFile(
            join(workspace.privateEvidence, "scripted-user.json"),
            JSON.stringify(bootstrapUserProfile(userMode)),
            { mode: 0o600, flag: "wx" },
          );
        }
        const broker = await dependencies.stageBroker(
          workspace,
          options.sourceWorktree,
        );
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
        const workspaceFiles = await readWorkspaceSources(workspace.target);
        await writeFile(
          join(artifactDirectory, "final-workspace-src.json"),
          `${JSON.stringify(workspaceFiles)}\n`,
          { mode: 0o600 },
        );
        const sealedEvidence = await dependencies.evaluateSealedEvidence({
          finalState,
          brokerTrace,
          diagnosticReceipt,
          transcript,
          workspaceFiles,
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
          ...(infrastructureFailure === undefined
            ? {}
            : { infrastructureFailure }),
        });
        const receiptPath = await persistCodexEpisode(
          artifactDirectory,
          receipt,
          {
            transcript,
            stderr,
            brokerTrace,
            diagnosticReceipt,
            finalState,
          },
        );
        return { receipt, artifactDirectory, receiptPath };
      } finally {
        await persistRefreshedLogin({
          mode: login.mode,
          realCodexHome: login.realCodexHome,
          privateCodexHome: workspace.codexHome,
        });
      }
    });
  } finally {
    try {
      if (workspaceForCleanup !== undefined) {
        await workspaceForCleanup.cleanup();
      }
    } finally {
      await rm(cellTempParent, { recursive: true, force: true });
    }
  }
}
