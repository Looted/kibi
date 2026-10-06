import type { CanonicalSkill } from "../catalog";
import type { EpisodeRequest } from "../contracts/episode";
import type { parsePrivateEvaluatorManifest } from "../fixtures/private";
import type { CellEvidence } from "../scoring/cell";
import type { probeRequiredMcp } from "./canary-runtime";
import type { CodexEpisodeReceipt } from "./codex-episode";
import type { FinalStateOptions } from "./final-state";
import type { IsolationWorkspace } from "./isolation-workspace";
import type { StagedBrokerLaunch } from "./mcp-broker-stage";
import type { CanaryRunner } from "./permissions";
import type { SkillCandidateSurface, SkillSurface } from "./skill-assembly";

export type PreparedLogin = Readonly<{
  mode: "file" | "keyring";
  env: NodeJS.ProcessEnv;
  realCodexHome: string;
}>;

export type FinalStateContext = Readonly<{
  workspace: IsolationWorkspace;
  broker: StagedBrokerLaunch;
  requests: FinalStateOptions["requests"];
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
  receiptPath: string;
}>;

export type SealedCellEvidence = Readonly<
  Omit<CellEvidence, "finalState"> & {
    readonly finalState: Omit<CellEvidence["finalState"], "snapshot">;
  }
>;

export type SealedCellEvidenceContext = Readonly<{
  finalState: string;
  brokerTrace: string;
  diagnosticReceipt: string;
  /** Raw Codex JSONL; feeds the final-answer and edit-ordering lanes. */
  transcript?: string;
  /** Final `src/` contents; feeds the workspace-assertion lane. */
  workspaceFiles?: Readonly<Record<string, string>>;
}>;

export type CodexCellOptions = Readonly<{
  request: EpisodeRequest;
  fixtureRoot: string;
  sourceWorktree: string;
  artifactRoot: string;
  targetSkill: CanonicalSkill;
  /** Bundle assembly: the source snapshot that both arms must use. */
  baselineSurfaces?: Readonly<Record<CanonicalSkill, SkillSurface>>;
  candidate?: SkillCandidateSurface;
  /** Bundle assembly: swap several skills at once (each surface-validated). */
  bundleCandidates?: Partial<Record<CanonicalSkill, SkillCandidateSurface>>;
  codexExecutable: string;
  bwrapExecutable: string;
  env: NodeJS.ProcessEnv;
  finalStateRequests: FinalStateOptions["requests"];
  evaluatorManifest: ReturnType<typeof parsePrivateEvaluatorManifest>;
  hiddenMarkers: readonly string[];
  pricingHash: string;
  priceAmount: number;
  timeoutMs: number;
}>;

/** Host process state for one target cell (login, private roots). */
// implements REQ-skillopt-claude-code-host
export type TargetHostSession = Readonly<{
  env: NodeJS.ProcessEnv;
  /** Real host credential roots the target must never reference. */
  privateRoots: readonly string[];
  finalize: () => Promise<void>;
}>;

// implements REQ-skillopt-claude-code-host
export type TargetHostLaunch = Readonly<{
  argv: readonly [string, ...string[]];
  /**
   * Converts raw host stdout into Codex-shaped JSONL so evidence replay and
   * scoring stay host-independent. Absent for Codex itself.
   */
  normalizeTranscript?: (stdout: string) => string;
}>;

/** The agent host that executes target cells (Codex by default). */
// implements REQ-skillopt-claude-code-host
export type TargetHost = Readonly<{
  id: "codex" | "claude-code";
  withLease: <T>(
    env: NodeJS.ProcessEnv,
    operation: () => Promise<T>,
  ) => Promise<T>;
  openSession: (input: {
    readonly workspace: IsolationWorkspace;
    readonly env: NodeJS.ProcessEnv;
  }) => Promise<TargetHostSession>;
  prepareLaunch: (input: {
    readonly options: CodexCellOptions;
    readonly workspace: IsolationWorkspace;
    readonly broker: StagedBrokerLaunch;
    readonly outputSchemaPath: string;
    readonly session: TargetHostSession;
  }) => Promise<TargetHostLaunch>;
}>;

export type CodexCellDependencies = Readonly<{
  /** Overrides the target host; defaults to Codex. */
  targetHost?: TargetHost;
  prepareLogin: (input: {
    readonly privateCodexHome: string;
    readonly sandboxHome: string;
    readonly env: NodeJS.ProcessEnv;
  }) => Promise<PreparedLogin>;
  stageBroker: (
    workspace: IsolationWorkspace,
    sourceWorktree: string,
  ) => Promise<StagedBrokerLaunch>;
  probeMcp: typeof probeRequiredMcp;
  run: CanaryRunner;
  finalState: (context: FinalStateContext) => Promise<string>;
  diagnosticReceipt: (workspace: IsolationWorkspace) => Promise<string>;
  evaluateSealedEvidence: (
    context: SealedCellEvidenceContext,
  ) => Promise<SealedCellEvidence>;
  clock: () => Date;
}>;

export type CompletedCodexCell = Readonly<{
  receipt: CodexEpisodeReceipt;
  artifactDirectory: string;
  receiptPath: string;
}>;

export class FixtureIntegrityError extends Error {
  readonly name = "FixtureIntegrityError";

  constructor() {
    super("workspace_fixture_hash_mismatch");
  }
}

export class CallerScoreInjectionError extends Error {
  readonly name = "CallerScoreInjectionError";

  constructor() {
    super("caller_score_injection");
  }
}
