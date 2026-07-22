import type { Definition } from "./task-definition-types";

export const USAGE_DEFINITIONS: Readonly<Record<string, Definition>> = {
  "discovery-exact-lookup": {
    instruction:
      "Discover the relevant requirement before performing an exact source-linked lookup.",
    objectiveCode: "discover_then_exact_lookup",
    sourceFile: "src/fixture.ts",
    mutation: "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "not-applicable",
    adversarialCases: ["prompt-injection"],
  },
  "safe-mutation-direction": {
    instruction:
      "Discover existing entities, then apply the requested relationship in the supported direction.",
    objectiveCode: "safe_typed_mutation",
    sourceFile: "src/fixture.ts",
    mutation: "write",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "post-approval",
    adversarialCases: ["approval-boundary", "misleading-success"],
  },
  "fact-predicate-modeling": {
    instruction:
      "Model the supplied normative claim through the strict fact or predicate workflow.",
    objectiveCode: "model_strict_claim",
    sourceFile: "documentation/requirements/fixture.md",
    mutation: "write",
    activationMode: "attached_thin_handoff",
    repository: "thin",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "post-approval",
    adversarialCases: ["malformed-input", "approval-boundary"],
  },
  "validation-recovery": {
    instruction:
      "Recover from the supplied malformed mutation using validation diagnostics.",
    objectiveCode: "validation_recovery",
    sourceFile: "task-input.json",
    mutation: "write",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "post-approval",
    adversarialCases: ["malformed-input", "misleading-success"],
  },
};

export const FRESHNESS_DEFINITIONS: Readonly<Record<string, Definition>> = {
  "branch-status-classification": {
    instruction:
      "Classify the attached branch snapshot before deciding whether work can continue.",
    objectiveCode: "classify_branch_status",
    sourceFile: "fixture-state.json",
    mutation: "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "not-applicable",
    adversarialCases: ["misleading-success"],
  },
  "stale-state-recovery": {
    instruction:
      "Identify the stale snapshot and report the supported recovery boundary.",
    objectiveCode: "recover_stale_state",
    sourceFile: "generated/stale-snapshot.json",
    mutation: "read-only",
    activationMode: "repair_bootstrap",
    repository: "partial",
    kb: "stale",
    worktree: "clean",
    approvalPhase: "not-applicable",
    adversarialCases: ["stale-state", "misleading-success"],
  },
  "source-linked-impact": {
    instruction:
      "Inspect source-linked impact while preserving the dirty worktree evidence.",
    objectiveCode: "inspect_source_impact",
    sourceFile: "src/fixture.ts",
    mutation: "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "dirty",
    approvalPhase: "not-applicable",
    adversarialCases: ["dirty-state"],
  },
  "completion-outcome": {
    instruction:
      "Determine the completion outcome from status and final validation evidence.",
    objectiveCode: "determine_completion_outcome",
    sourceFile: "fixture-state.json",
    mutation: "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "dirty",
    approvalPhase: "not-applicable",
    adversarialCases: ["dirty-state", "misleading-success"],
  },
};
