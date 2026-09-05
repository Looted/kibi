import type { PredicateUsageHints } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export const PREDICATE_USAGE_HINTS_4: Record<string, PredicateUsageHints> = {
  fail_closed_authorization_rule: {
    use_when: [
      "Use when invalid, missing, or failed authorization input must deny access or stay unauthenticated.",
    ],
    do_not_use_when: [
      "Do not use when a degraded dependency legitimately falls back to a named alternative behavior.",
    ],
  },
  deployment_precondition_rule: {
    use_when: [
      "Use when a deployment or rollout must hold or abort until a named precondition holds.",
    ],
    do_not_use_when: [
      "Do not use for feature flags, checkout flows, or ordinary release test gates.",
    ],
  },
  data_migration_rule: {
    use_when: [
      "Use when legacy data converts to a canonical form once, without data loss, before canonical-only operation.",
    ],
    do_not_use_when: [
      "Do not use for a standing boundary that only permits legacy reads as migration input.",
    ],
  },
  diagnostic_visibility_rule: {
    use_when: [
      "Use when internal error or transport detail must stay in logs while users see actionable messages.",
    ],
    do_not_use_when: [
      "Do not use for audit-trail requirements or consent handling.",
    ],
  },
  mutation_authority_rule: {
    use_when: [
      "Use when a client surface is read-only or scoped and a server-side authority owns the other mutations.",
    ],
    do_not_use_when: [
      "Do not use for individual permission denials such as delete or export rights.",
    ],
  },
  request_deduplication_rule: {
    use_when: [
      "Use when concurrent duplicate requests for the same resource must coalesce into one operation.",
    ],
    do_not_use_when: [
      "Do not use for per-window rate limits or batch-size constraints.",
    ],
  },
  async_boundary_rule: {
    use_when: [
      "Use when a callback must return synchronously while work runs deferred or in the background.",
    ],
    do_not_use_when: [
      "Do not use for timeout durations or request rate constraints.",
    ],
  },
  canonical_identifier_rule: {
    use_when: [
      "Use when references to a domain entity must resolve through one canonical identifier or key.",
    ],
    do_not_use_when: [
      "Do not use for renderer neutrality or legacy-format boundaries.",
    ],
  },
  responsive_breakpoint_rule: {
    use_when: [
      "Use when explicit viewport dimensions determine a responsive classification such as mobile.",
    ],
    do_not_use_when: [
      "Do not use for server-side size limits or database constraints.",
    ],
  },
  operational_pause_rule: {
    use_when: [
      "Use when an operational pause blocks new work of a kind while preserving existing or resumable work.",
    ],
    do_not_use_when: [
      "Do not use for soft deletion or data preservation rules without an operational switch.",
    ],
    // implements REQ-mcp-suggest-predicates
  },
};
