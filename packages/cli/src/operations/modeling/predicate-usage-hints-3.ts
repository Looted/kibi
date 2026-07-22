import type { PredicateUsageHints } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export const PREDICATE_USAGE_HINTS_3: Record<string, PredicateUsageHints> = {
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
