import type { CampaignDependencies } from "../campaign-workflow";
import { claudeCodeCampaignDependencies } from "../claude-code-campaign";
import {
  claudeCodeTargetHost,
  createClaudeRuntimeLease,
} from "./claude-code-host";
import type { CodexCellDependencies, TargetHost } from "./codex-cell-types";
import {
  type CodexRuntimeLease,
  createCodexRuntimeLease,
} from "./codex-runtime";
import { codexTargetHost } from "./codex-target-host";
import type { SkillOptHost } from "./skillopt-host";

/**
 * What one agent harness runs for SkillOpt. Every host feeds the same
 * scorers, evidence replay and leak scans; a host only decides how a target
 * cell is launched, which runtime it stages and which campaign steps it
 * replaces. Adding a harness means one module implementing this shape and
 * one entry in `SKILLOPT_HOST_REGISTRY`.
 */
// implements REQ-skillopt-operator-selected-harness
export type SkillOptHostImplementation = Readonly<{
  id: SkillOptHost;
  label: string;
  /** Launches one target cell. */
  targetHost: (
    dependencies: Pick<CodexCellDependencies, "prepareLogin">,
  ) => TargetHost;
  /** Stages the executables every cell of one run shares. */
  createRuntimeLease: (
    options: Readonly<{ artifactRoot: string }>,
    env: NodeJS.ProcessEnv,
  ) => Promise<CodexRuntimeLease>;
  /** Campaign steps this host replaces; empty keeps the Codex defaults. */
  campaignDependencies: (
    env: NodeJS.ProcessEnv,
  ) => Partial<CampaignDependencies>;
  /**
   * Whether the legacy `cli.ts` workflow (preflight, smoke, optimize and the
   * held-out matrix) can run on this host. Commands it cannot run are refused
   * before paid preparation.
   */
  legacyWorkflow: boolean;
}>;

// implements REQ-skillopt-operator-selected-harness
export const SKILLOPT_HOST_REGISTRY: Readonly<
  Record<SkillOptHost, SkillOptHostImplementation>
> = {
  codex: {
    id: "codex",
    label: "Codex CLI",
    targetHost: (dependencies) => codexTargetHost(dependencies),
    createRuntimeLease: (options) => createCodexRuntimeLease(options),
    campaignDependencies: () => ({}),
    legacyWorkflow: true,
  },
  "claude-code": {
    id: "claude-code",
    label: "Claude Code CLI",
    targetHost: () => claudeCodeTargetHost(),
    createRuntimeLease: (options, env) =>
      createClaudeRuntimeLease(options, env),
    campaignDependencies: (env) => claudeCodeCampaignDependencies(env),
    legacyWorkflow: false,
  },
};

// implements REQ-skillopt-operator-selected-harness
export function skillOptHostImplementation(
  host: SkillOptHost,
): SkillOptHostImplementation {
  return SKILLOPT_HOST_REGISTRY[host];
}
