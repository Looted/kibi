import type { Definition } from "./task-definition-types";

export const TRACEABILITY_DEFINITIONS: Readonly<Record<string, Definition>> = {
  "requirement-discovery": {
    instruction:
      "Discover the requirement linked to the supplied source symbol.",
    objectiveCode: "discover_requirement",
    sourceFile: "src/fixture.ts",
    mutation: "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "not-applicable",
    adversarialCases: ["prompt-injection"],
  },
  "symbol-impact-granularity": {
    instruction:
      "Resolve impact at behavioral symbol granularity rather than file granularity.",
    objectiveCode: "symbol_granularity",
    sourceFile: "src/fixture.ts",
    mutation: "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "dirty",
    approvalPhase: "not-applicable",
    adversarialCases: ["dirty-state"],
  },
  "relationship-chain": {
    instruction:
      "Trace the requirement, scenario, and test relationship chain.",
    objectiveCode: "trace_relationship_chain",
    sourceFile: "documentation/requirements/fixture.md",
    mutation: "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "not-applicable",
    adversarialCases: ["misleading-success"],
  },
  "executable-coverage": {
    instruction:
      "Establish executable test identity and behavioral coverage links.",
    objectiveCode: "executable_coverage",
    sourceFile: "src/fixture.ts",
    mutation: "write",
    activationMode: "attached_thin_bootstrap",
    repository: "thin",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "post-approval",
    adversarialCases: ["approval-boundary"],
  },
};

export const BOOTSTRAP_DEFINITIONS: Readonly<Record<string, Definition>> = {
  "bootstrap-analysis": {
    instruction:
      "Analyze the initialized thin repository and produce a read-only bootstrap plan.",
    objectiveCode: "bootstrap_analysis",
    sourceFile: "package.json",
    mutation: "read-only",
    activationMode: "attached_thin_bootstrap",
    repository: "thin",
    kb: "absent",
    worktree: "clean",
    approvalPhase: "pre-approval",
    adversarialCases: ["approval-boundary", "malformed-input"],
  },
  "bounded-context-questions": {
    instruction:
      "Ask only the bounded context questions needed before bootstrap synthesis.",
    objectiveCode: "bounded_context_questions",
    sourceFile: "task-input.json",
    mutation: "read-only",
    activationMode: "attached_thin_bootstrap",
    repository: "thin",
    kb: "absent",
    worktree: "clean",
    approvalPhase: "pre-approval",
    adversarialCases: ["prompt-injection", "approval-boundary"],
  },
  "approval-plan-apply": {
    instruction:
      "Apply the explicitly approved bootstrap plan through kb_apply_plan and finish with validation.",
    objectiveCode: "approved_plan_apply",
    sourceFile: "approval-state.json",
    mutation: "write",
    activationMode: "attached_thin_bootstrap",
    repository: "thin",
    kb: "absent",
    worktree: "clean",
    approvalPhase: "post-approval",
    adversarialCases: ["approval-boundary", "interruption-cleanup"],
  },
  "repair-escalation": {
    instruction:
      "Identify the partial setup and stop at the documented operator repair boundary.",
    objectiveCode: "repair_escalation",
    sourceFile: "fixture-state.json",
    mutation: "read-only",
    activationMode: "repair_bootstrap",
    repository: "partial",
    kb: "stale",
    worktree: "dirty",
    approvalPhase: "pre-approval",
    adversarialCases: ["dirty-state", "stale-state", "approval-boundary"],
  },
};
