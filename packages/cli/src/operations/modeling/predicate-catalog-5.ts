import type { PredicateSchemaCandidate } from "./predicate-types.js";

/**
 * Predicate families added from consumer escalation evidence (Align
 * dogfooding, 2026-08/09): fail-closed authorization, deployment
 * preconditions, migration sequencing, diagnostic visibility, mutation
 * authority, request deduplication, async boundaries, canonical
 * identifiers, responsive breakpoints, and operational pauses.
 */
// implements REQ-mcp-suggest-predicates
export const PREDICATE_CATALOG_5: PredicateSchemaCandidate[] = [
  {
    id: "FACT-SCHEMA-FAIL-CLOSED-AUTHORIZATION-RULE",
    predicate_name: "fail_closed_authorization_rule",
    title: "Fail-closed authorization rule",
    description:
      "On invalid, missing, or failed authorization input the subject must deny access or stay unauthenticated instead of falling back to a default identity.",
    argument_names: ["subject", "trigger", "denied_outcome"],
    argument_types: ["entity", "condition", "outcome"],
    argument_descriptions: [
      "Component or route that must fail closed.",
      "Invalid, missing, or failed authorization condition.",
      "Required denied outcome, such as staying unauthenticated or redirecting to login.",
    ],
    keywords: [
      "fail closed",
      "fail-closed",
      "deny",
      "denied",
      "unauthenticated",
      "invalid role",
      "missing role",
      "default identity",
    ],
    aliases: ["fail closed without creating", "must fail closed"],
    examples: [
      "fail_closed_authorization_rule(protected_routes, invalid_or_missing_fallback_role, stay_unauthenticated)",
    ],
    tags: ["authorization", "security", "fail-closed"],
  },
  {
    id: "FACT-SCHEMA-DEPLOYMENT-PRECONDITION-RULE",
    predicate_name: "deployment_precondition_rule",
    title: "Deployment precondition rule",
    description:
      "A deployment or rollout must hold or abort until a named precondition holds, such as no unsupported legacy data remaining.",
    argument_names: ["system", "precondition", "action"],
    argument_types: ["entity", "condition", "outcome"],
    argument_descriptions: [
      "System, service, or release being deployed.",
      "Precondition that must hold before deployment proceeds.",
      "Required action when the precondition fails, such as holding deployment.",
    ],
    keywords: [
      "deployment",
      "deploy",
      "hold",
      "precondition",
      "unsupported data",
      "abort",
      "rollout",
    ],
    aliases: ["deployment must hold", "block deployment"],
    examples: [
      "deployment_precondition_rule(annotation_storage, unsupported_legacy_rows_absent, hold_deployment)",
    ],
    tags: ["deployment", "release", "precondition"],
  },
  {
    id: "FACT-SCHEMA-DATA-MIGRATION-RULE",
    predicate_name: "data_migration_rule",
    title: "Data migration rule",
    description:
      "Legacy data converts to the canonical form in a bounded, verified sequence, typically once and without data loss, before canonical-only operation begins.",
    argument_names: ["legacy_surface", "canonical_surface", "sequencing"],
    argument_types: ["entity", "entity", "action"],
    argument_descriptions: [
      "Legacy payload, table, or format being converted.",
      "Canonical payload, table, or format produced by the conversion.",
      "Sequencing contract, such as one-time conversion or conversion before canonical-only reads.",
    ],
    keywords: [
      "one-time conversion",
      "converted once",
      "no data loss",
      "canonical",
      "migration sequencing",
      "conversion",
    ],
    aliases: [
      "converted once with no data loss",
      "one-time persisted conversion",
    ],
    examples: [
      "data_migration_rule(fabricData, sceneData, one_time_conversion_before_canonical_only_reads)",
    ],
    tags: ["migration", "data", "sequencing"],
  },
  {
    id: "FACT-SCHEMA-DIAGNOSTIC-VISIBILITY-RULE",
    predicate_name: "diagnostic_visibility_rule",
    title: "Diagnostic visibility rule",
    description:
      "Internal error and transport detail stays confined to logs or debugging surfaces while user-facing surfaces show actionable, friendly messages.",
    argument_names: [
      "subject",
      "internal_detail",
      "user_surface",
      "log_surface",
    ],
    argument_types: ["entity", "detail", "surface", "surface"],
    argument_descriptions: [
      "Flow or component whose diagnostics are governed.",
      "Internal detail such as raw payloads, status lines, or backend errors.",
      "User-facing surface and its required message style.",
      "Log or debugging surface where internal detail is confined.",
    ],
    keywords: [
      "logged",
      "log only",
      "not shown",
      "must not be shown",
      "actionable",
      "user-friendly",
      "debugging",
      "raw transport",
    ],
    aliases: ["logged and must not be shown", "actionable error messages"],
    examples: [
      "diagnostic_visibility_rule(video_upload, tus_payload_and_http_status, friendly_terminal_recovery_message, server_logs)",
    ],
    tags: ["errors", "diagnostics", "ux"],
  },
  {
    id: "FACT-SCHEMA-MUTATION-AUTHORITY-RULE",
    predicate_name: "mutation_authority_rule",
    title: "Mutation authority rule",
    description:
      "A client-facing surface exposes only its declared mutation scope; authority for other mutations stays server-side.",
    argument_names: ["surface", "mutation_scope", "authority"],
    argument_types: ["entity", "scope", "entity"],
    argument_descriptions: [
      "Client, view, API, or table surface being constrained.",
      "Declared mutation scope, such as read-only or no direct writes.",
      "Server-side authority, such as database triggers or an RPC, that owns other mutations.",
    ],
    keywords: [
      "read-only",
      "read only",
      "server-side",
      "row-level security",
      "rls",
      "triggers",
      "mutation",
    ],
    aliases: ["read-only for the client", "must happen server-side"],
    examples: [
      "mutation_authority_rule(notifications_table, client_read_only, server_side_database_triggers)",
    ],
    tags: ["security", "architecture", "api"],
  },
  {
    id: "FACT-SCHEMA-REQUEST-DEDUPLICATION-RULE",
    predicate_name: "request_deduplication_rule",
    title: "Request deduplication rule",
    description:
      "Concurrent duplicate requests for the same resource are coalesced into one underlying operation, preventing redundant work.",
    argument_names: ["subject", "request", "scope"],
    argument_types: ["entity", "action", "scope"],
    argument_descriptions: [
      "Component issuing the requests.",
      "Request or query being deduplicated.",
      "Scope of deduplication, such as the same user or key.",
    ],
    keywords: [
      "deduplicated",
      "deduplication",
      "dedupe",
      "in-flight",
      "coalesce",
      "parallel requests",
      "redundant",
    ],
    aliases: ["must be deduplicated", "prevent redundant"],
    examples: [
      "request_deduplication_rule(profile_service, profile_fetch, same_user)",
    ],
    tags: ["performance", "reliability"],
  },
  {
    id: "FACT-SCHEMA-ASYNC-BOUNDARY-RULE",
    predicate_name: "async_boundary_rule",
    title: "Async boundary rule",
    description:
      "A callback or handler must return synchronously, without awaiting, while work runs deferred or in the background.",
    argument_names: ["subject", "operation", "execution_policy"],
    argument_types: ["entity", "action", "policy"],
    argument_descriptions: [
      "Callback, handler, or API boundary.",
      "Operation that must not block the caller.",
      "Required policy, such as return synchronously or defer to background.",
    ],
    keywords: [
      "synchronously",
      "return synchronously",
      "not await",
      "deferred",
      "background",
      "in flight",
      "non-blocking",
    ],
    aliases: ["must return synchronously", "without setting a loading state"],
    examples: [
      "async_boundary_rule(onAuthStateChange, supabase_client_operations, return_synchronously_defer_work)",
    ],
    tags: ["async", "concurrency", "api"],
  },
  {
    id: "FACT-SCHEMA-CANONICAL-IDENTIFIER-RULE",
    predicate_name: "canonical_identifier_rule",
    title: "Canonical identifier rule",
    description:
      "References to a domain entity must resolve through one canonical identifier or key.",
    argument_names: ["domain", "canonical_key", "resolution"],
    argument_types: ["entity", "key", "action"],
    argument_descriptions: [
      "Domain entity or flow being referenced.",
      "The canonical identifier or key.",
      "Required resolution behavior for routes, lookups, or messaging.",
    ],
    keywords: [
      "canonical id",
      "canonical identifier",
      "canonical",
      "resolve against",
      "single source of truth",
      "videoid",
    ],
    aliases: ["resolve against a canonical", "canonical identity"],
    examples: [
      "canonical_identifier_rule(review_routes_and_messaging, canonical_video_id, resolve_routes_against_canonical_id)",
    ],
    tags: ["identity", "architecture"],
  },
  {
    id: "FACT-SCHEMA-RESPONSIVE-BREAKPOINT-RULE",
    predicate_name: "responsive_breakpoint_rule",
    title: "Responsive breakpoint rule",
    description:
      "A viewport is classified by explicit responsive breakpoints, such as landscape phones counting as mobile below a height threshold.",
    argument_names: ["subject", "viewport", "classification"],
    argument_types: ["entity", "condition", "category"],
    argument_descriptions: [
      "UI or layout being classified.",
      "Viewport condition with explicit dimensions.",
      "Resulting classification, such as mobile or desktop.",
    ],
    keywords: [
      "breakpoint",
      "landscape",
      "portrait",
      "viewport",
      "responsive",
      "mobile",
      "width",
      "height",
    ],
    aliases: ["treat as mobile", "counts as mobile"],
    examples: [
      "responsive_breakpoint_rule(app_shell, height_below_768px_in_landscape, mobile)",
    ],
    tags: ["ui", "responsive", "layout"],
  },
  {
    id: "FACT-SCHEMA-OPERATIONAL-PAUSE-RULE",
    predicate_name: "operational_pause_rule",
    title: "Operational pause rule",
    description:
      "An operational pause or kill switch blocks new operations of a kind while preserving already-started or completed work.",
    argument_names: ["subject", "blocked_action", "preserved_action"],
    argument_types: ["entity", "action", "action"],
    argument_descriptions: [
      "Operational control being paused.",
      "New operations the pause must block.",
      "Existing work the pause must preserve, such as resumable sessions.",
    ],
    keywords: [
      "pause",
      "paused",
      "kill switch",
      "block new",
      "preserve",
      "resumable",
      "suspend",
    ],
    aliases: ["upload pause", "operational pause"],
    examples: [
      "operational_pause_rule(uploads, new_upload_sessions, existing_and_resumable_sessions)",
    ],
    tags: ["operations", "safety"],
    // implements REQ-mcp-suggest-predicates
  },
];
