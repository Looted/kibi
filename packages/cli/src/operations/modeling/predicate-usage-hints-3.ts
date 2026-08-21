import type { PredicateUsageHints } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export const PREDICATE_USAGE_HINTS_3: Record<string, PredicateUsageHints> = {
  dependency_resolution_policy: {
    use_when: [
      "Use when a component's permitted dependency scope and acquisition/download policy are normative.",
    ],
    do_not_use_when: [
      "Do not use for ordering among multiple candidates, invalid-input outcomes, or child-process execution details.",
    ],
  },
  ordered_resolution_strategy: {
    use_when: [
      "Use when resolution must try named sources in a defined order with a conditional fallback.",
    ],
    do_not_use_when: [
      "Do not use for a general dependency scope policy, invalid resolution errors, or process launch behavior.",
    ],
  },
  resolution_failure_policy: {
    use_when: [
      "Use when invalid placeholders, ambiguous roots, or other resolution inputs require a specific rejection outcome.",
    ],
    do_not_use_when: [
      "Do not use for ordinary missing-dependency reporting or successful lookup ordering.",
    ],
  },
  process_delegation_contract: {
    use_when: [
      "Use when a launcher delegates to a child process and specifies executable, cwd, environment, stdio, or termination behavior.",
    ],
    do_not_use_when: [
      "Do not use for dependency lookup, package-manager exceptions, or generic failure reporting.",
    ],
  },
  failure_behavior: {
    use_when: [
      "Use when a component must define the observable outcome of a named failure such as a missing dependency.",
    ],
    do_not_use_when: [
      "Do not use for resolution ordering, invalid-input policy details, or exception clauses that exempt a normal rule.",
    ],
  },
  uniqueness_constraint: {
    use_when: ["Use for at-most-one or unique-per-scope constraints."],
    do_not_use_when: [
      "Do not use for numeric caps where more than one instance may be valid.",
    ],
  },
  state_membership: {
    use_when: ["Use for terminal, allowed, or enumerated state sets."],
    do_not_use_when: [
      "Do not use for one current state or a transition between states.",
    ],
  },
  temporal_order: {
    use_when: [
      "Use for before/after ordering requirements between events, states, or actions.",
    ],
    do_not_use_when: [
      "Do not use when source state, target state, and trigger are all explicit; use state_transition instead.",
    ],
  },
  conditional_behavior: {
    use_when: [
      "Use for if/when conditional prose where a condition leads to a behavior.",
    ],
    do_not_use_when: [
      "Do not use for simple boolean guards or actor permission rules.",
    ],
  },
  state_transition: {
    use_when: [
      "Use for explicit transitions from one named state to another with a trigger.",
    ],
    do_not_use_when: [
      "Do not use for a single state assertion or an allowed terminal-state set.",
    ],
  },
  rate_limit: {
    use_when: ["Use for per-window request, attempt, or action limits."],
    do_not_use_when: [
      "Do not use for resource thresholds that lack a repeated action and time window.",
    ],
  },
};
