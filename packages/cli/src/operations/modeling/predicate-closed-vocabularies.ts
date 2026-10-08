/**
 * Closed argument vocabularies shared by built-in predicate schemas. An
 * argument with a natural closed vocabulary declares its constants, so
 * kb_model binds a constant the claim names (or an alias of it) and lists the
 * constants as `allowedValues` when the claim names none, instead of minting
 * a new atom per requirement.
 */

/** UI and workflow events that start a commit, discard or transition. */
// implements REQ-model-predicates-closed-vocabularies
export const TRIGGER_VOCABULARY = {
  constants: ["escape", "cancel", "submit", "navigation", "click", "timeout"],
  aliases: {
    esc: "escape",
    escape_key: "escape",
    cancellation: "cancel",
    submission: "submit",
    navigate: "navigation",
    navigates: "navigation",
    navigating: "navigation",
    navigation_away: "navigation",
    clicks: "click",
    time_out: "timeout",
    timed_out: "timeout",
  },
} as const;

/** An authorization outcome. */
// implements REQ-model-predicates-closed-vocabularies
export const DECISION_VOCABULARY = {
  constants: ["allow", "deny"],
  aliases: {
    // permission_rule inference spells a granted permission as `assert`.
    assert: "allow",
    allowed: "allow",
    permit: "allow",
    permitted: "allow",
    denied: "deny",
    forbid: "deny",
    forbidden: "deny",
  },
} as const;

/** How a target is refreshed. */
// implements REQ-model-predicates-closed-vocabularies
export const REFRESH_POLICY_VOCABULARY = {
  constants: ["automatic", "manual", "on_demand"],
  aliases: {
    auto: "automatic",
    automatically: "automatic",
    manually: "manual",
    "on-demand": "on_demand",
  },
} as const;

/** What an environment safety rule decides for an action. */
// implements REQ-model-predicates-closed-vocabularies
export const ENVIRONMENT_DECISION_VOCABULARY = {
  constants: ["allowed", "forbidden", "read-only"],
  aliases: {
    allow: "allowed",
    deny: "forbidden",
    denied: "forbidden",
    read_only: "read-only",
    readonly: "read-only",
  },
} as const;

/** Comparison operators, as property_value facts spell them. */
// implements REQ-model-predicates-closed-vocabularies
export const OPERATOR_VOCABULARY = {
  constants: ["lt", "lte", "eq", "neq", "gte", "gt"],
  aliases: { le: "lte", ge: "gte", ne: "neq" },
} as const;

/** Calendar units a retention period is stated in. */
// implements REQ-model-predicates-closed-vocabularies
export const RETENTION_UNIT_VOCABULARY = {
  constants: ["days", "months", "years"],
  aliases: { day: "days", month: "months", year: "years" },
} as const;

/** The two directions of a coding standard. */
// implements REQ-model-predicates-closed-vocabularies
export const CODING_STANDARD_ACTION_VOCABULARY = {
  constants: ["use", "avoid"],
  aliases: {},
} as const;

/** What happens to a subject at the end of its lifecycle. */
// implements REQ-model-predicates-closed-vocabularies
export const LIFECYCLE_ACTION_VOCABULARY = {
  constants: ["archived", "deleted", "expired"],
  aliases: { archive: "archived", delete: "deleted", expire: "expired" },
} as const;

type Vocabulary = Readonly<{
  constants: readonly string[];
  aliases: Readonly<Record<string, string>>;
}>;

/**
 * The `argument_constants` and `argument_aliases` fields for a schema whose
 * listed arguments use the given vocabularies.
 */
// implements REQ-model-predicates-closed-vocabularies
export function closedArguments(
  byArgument: Readonly<Record<string, Vocabulary>>,
): {
  argument_constants: Record<string, string[]>;
  argument_aliases?: Record<string, Record<string, string>>;
} {
  const constants: Record<string, string[]> = {};
  const aliases: Record<string, Record<string, string>> = {};
  for (const [name, vocabulary] of Object.entries(byArgument)) {
    constants[name] = [...vocabulary.constants];
    if (Object.keys(vocabulary.aliases).length > 0)
      aliases[name] = { ...vocabulary.aliases };
  }
  return Object.keys(aliases).length > 0
    ? { argument_constants: constants, argument_aliases: aliases }
    : { argument_constants: constants };
}
