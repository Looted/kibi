import { fixtureSymbolId } from "../fixtures/workspace";
import {
  isDecisionSetupMode,
  setupDecisionFixture,
} from "./decision-fixture-setup";
import {
  setupGeneratedCoordinateDivergence,
  setupSeededConsistencyKb,
  setupSeededDirtyKb,
  setupSeededFreshKb,
  setupSeededGovernedAreaKb,
  setupSeededJointContradictionKb,
  setupSeededPartialKb,
  setupSeededPreconditionKb,
  setupSeededSafeMutationKb,
  setupSeededStaleKb,
  setupSeededUncoveredKb,
  setupSeededUnresolvedRuleKb,
  setupThinRootKb,
} from "./fixture-kb-setup";
import {
  isQualitySetupMode,
  setupQualityFixture,
} from "./quality-fixture-setup";

/**
 * Runs the evaluator-owned precondition setup a task's manifest names, with
 * the source worktree's CLI. Shared by paid cells and scripted reference
 * answers so both start from the same seeded workspace. The caller stops the
 * fixture engine afterwards.
 */
export async function setupTaskFixture(
  input: Readonly<{
    setupMode: string | undefined;
    target: string;
    cliRoot: string;
    taskId: string;
  }>,
): Promise<void> {
  const { setupMode, target, cliRoot } = input;
  if (setupMode === "generated_coordinate_divergence") {
    await setupGeneratedCoordinateDivergence(
      target,
      cliRoot,
      fixtureSymbolId(input.taskId),
    );
  } else if (setupMode === "seeded_fresh_kb") {
    await setupSeededFreshKb(target, cliRoot);
  } else if (setupMode === "seeded_uncovered_kb") {
    await setupSeededUncoveredKb(target, cliRoot);
  } else if (setupMode === "seeded_safe_mutation_kb") {
    await setupSeededSafeMutationKb(target, cliRoot, input.taskId);
  } else if (setupMode === "seeded_governed_area_kb") {
    await setupSeededGovernedAreaKb(target, cliRoot);
  } else if (setupMode === "seeded_precondition_kb") {
    await setupSeededPreconditionKb(target, cliRoot);
  } else if (setupMode === "seeded_consistency_kb") {
    await setupSeededConsistencyKb(target, cliRoot);
  } else if (setupMode === "seeded_unresolved_rule_kb") {
    await setupSeededUnresolvedRuleKb(target, cliRoot);
  } else if (setupMode === "seeded_joint_contradiction_kb") {
    await setupSeededJointContradictionKb(target, cliRoot);
  } else if (setupMode === "seeded_dirty_kb") {
    await setupSeededDirtyKb(target, cliRoot);
  } else if (setupMode === "seeded_partial_kb") {
    await setupSeededPartialKb(target, cliRoot);
  } else if (setupMode === "seeded_stale_kb") {
    await setupSeededStaleKb(target, cliRoot);
  } else if (setupMode === "thin_root_kb") {
    await setupThinRootKb(target, cliRoot);
  } else if (setupMode !== undefined && isDecisionSetupMode(setupMode)) {
    await setupDecisionFixture(target, cliRoot, setupMode);
  } else if (setupMode !== undefined && isQualitySetupMode(setupMode)) {
    await setupQualityFixture(target, cliRoot, setupMode);
  }
}
