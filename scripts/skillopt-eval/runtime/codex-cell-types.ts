import type { CanonicalSkill } from "../catalog";
import type { EpisodeRequest } from "../contracts/episode";
import type { CellReceipt } from "../scoring/cell";
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

export type CodexCellOptions = Readonly<{
  request: EpisodeRequest;
  fixtureRoot: string;
  sourceWorktree: string;
  artifactRoot: string;
  targetSkill: CanonicalSkill;
  candidate?: SkillCandidateSurface;
  codexExecutable: string;
  bwrapExecutable: string;
  env: NodeJS.ProcessEnv;
  finalStateRequests: FinalStateOptions["requests"];
  score: CellReceipt;
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
