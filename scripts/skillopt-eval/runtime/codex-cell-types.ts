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
import type { SkillCandidateSurface } from "./skill-assembly";

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
}>;

export type CodexCellOptions = Readonly<{
  request: EpisodeRequest;
  fixtureRoot: string;
  sourceWorktree: string;
  artifactRoot: string;
  targetSkill: CanonicalSkill;
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

export type CodexCellDependencies = Readonly<{
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
