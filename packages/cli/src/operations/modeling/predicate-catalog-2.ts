import type { PredicateSchemaCandidate } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export const PREDICATE_CATALOG_2: PredicateSchemaCandidate[] = [
  {
    id: "FACT-SCHEMA-CONFLICT-RESOLUTION-RULE",
    predicate_name: "conflict_resolution_rule",
    title: "Conflict resolution rule",
    description:
      "Concurrent or synchronized updates resolve conflicts with a named strategy.",
    argument_names: ["subject", "strategy"],
    argument_types: ["entity", "strategy"],
    keywords: ["conflict", "conflicts", "latest write wins", "merge"],
    examples: ["conflict_resolution_rule(profile_updates, latest_write_wins)"],
    tags: ["sync", "conflict-resolution"],
  },
  {
    id: "FACT-SCHEMA-FALLBACK-RULE",
    predicate_name: "fallback_rule",
    title: "Fallback rule",
    description:
      "A degraded or unavailable dependency causes a subject to fall back to an alternative behavior.",
    argument_names: ["condition", "subject", "fallback"],
    argument_types: ["condition", "entity", "behavior"],
    keywords: ["fall back", "fallback", "unavailable", "degraded"],
    examples: [
      "fallback_rule(payment_provider_is_unavailable, checkout, manual_review)",
    ],
    tags: ["fallback", "resilience"],
  },
  {
    id: "FACT-SCHEMA-BATCH-OPERATION-RULE",
    predicate_name: "batch_operation_rule",
    title: "Batch operation rule",
    description:
      "A bulk operation processes a resource in batches of a bounded size.",
    argument_names: ["subject", "resource", "batch_size"],
    argument_types: ["entity", "resource", "number"],
    keywords: ["batch", "batches", "bulk", "process"],
    examples: ["batch_operation_rule(invoice_exports, records, 500)"],
    tags: ["batching", "bulk"],
  },
  {
    id: "FACT-SCHEMA-CONSISTENCY-RULE",
    predicate_name: "consistency_rule",
    title: "Consistency rule",
    description:
      "An entity reference or value must remain consistent with another existing entity or invariant.",
    argument_names: ["subject", "target"],
    argument_types: ["entity", "entity"],
    keywords: ["reference", "references", "existing", "consistent"],
    examples: ["consistency_rule(order_items, existing_order)"],
    tags: ["consistency", "referential-integrity"],
  },
  {
    id: "FACT-SCHEMA-BUILD-CONSTRAINT",
    predicate_name: "build_constraint",
    title: "Build constraint",
    description:
      "Build-time generation or deployment configuration must satisfy a deterministic property.",
    argument_names: ["subject", "property", "scope"],
    argument_types: ["entity", "property", "scope"],
    keywords: ["build time", "deterministic", "generator", "deployment"],
    examples: [
      "build_constraint(share_manifest_generation, deterministic, build_time)",
    ],
    tags: ["build", "determinism"],
  },
  {
    id: "FACT-SCHEMA-ENVIRONMENT-SAFETY-RULE",
    predicate_name: "environment_safety_rule",
    title: "Environment safety rule",
    description:
      "A named action is allowed or forbidden in a deployment environment.",
    argument_names: ["action", "decision", "environment"],
    argument_types: ["action", "decision", "environment"],
    keywords: ["production", "staging", "forbidden", "destructive"],
    examples: [
      "environment_safety_rule(destructive_operations, forbidden, production)",
    ],
    tags: ["environment", "safety"],
  },
  {
    id: "FACT-SCHEMA-SCHEMA-INVARIANT-RULE",
    predicate_name: "schema_invariant_rule",
    title: "Schema invariant rule",
    description:
      "A schema field has an invariant such as immutability, type, enum, or value range.",
    argument_names: ["field", "invariant", "scope"],
    argument_types: ["field", "invariant", "scope"],
    keywords: ["immutable", "schema", "field", "enum", "range"],
    examples: ["schema_invariant_rule(user_email, immutable, after_creation)"],
    tags: ["schema", "invariant"],
  },
  {
    id: "FACT-SCHEMA-CODING-STANDARD-RULE",
    predicate_name: "coding_standard_rule",
    title: "Coding standard rule",
    description:
      "Developer-facing code must use or avoid a framework API, pattern, or documentation practice.",
    argument_names: ["subject", "action", "target"],
    argument_types: ["entity", "action", "api"],
    keywords: ["computed", "signals", "must use", "must not use"],
    examples: ["coding_standard_rule(derived_state, use, computed_signals)"],
    tags: ["coding-standard", "agent-guidance"],
  },
  {
    id: "FACT-SCHEMA-MIGRATION-BOUNDARY-RULE",
    predicate_name: "migration_boundary_rule",
    title: "Migration boundary rule",
    description:
      "Legacy data or APIs may only be used for migration or compatibility input.",
    argument_names: ["subject", "allowed_action", "scope"],
    argument_types: ["entity", "action", "scope"],
    keywords: ["legacy", "migration input", "only be read"],
    examples: [
      "migration_boundary_rule(legacy_fabricdata, read, migration_input)",
    ],
    tags: ["migration", "compatibility"],
  },
  {
    id: "FACT-SCHEMA-ABSENCE-REQUIREMENT",
    predicate_name: "absence_requirement",
    title: "Absence requirement",
    description:
      "A component, extension, RPC, schema, or feature must be absent, removed, or not exist.",
    argument_names: ["subject", "state"],
    argument_types: ["entity", "state"],
    keywords: ["absent", "removed", "must not exist", "not exist", "no"],
    examples: ["absence_requirement(pg_graphql_extension, absent)"],
    tags: ["absence", "security"],
  },
  {
    id: "FACT-SCHEMA-OFFLINE-BEHAVIOR-RULE",
    predicate_name: "offline_behavior_rule",
    title: "Offline behavior rule",
    description:
      "Synchronization or gameplay behavior remains non-blocking or resilient during offline conditions.",
    argument_names: ["subject", "behavior", "condition"],
    argument_types: ["entity", "behavior", "condition"],
    keywords: ["offline", "non-blocking", "resilient", "synchronization"],
    examples: [
      "offline_behavior_rule(cloud_synchronization, non-blocking, offline_conditions)",
    ],
    tags: ["offline", "sync"],
  },
  {
    id: "FACT-SCHEMA-RELEASE-GATE-RULE",
    predicate_name: "release_gate_rule",
    title: "Release gate rule",
    description:
      "A build or release must pass named gates before distribution, review, or deployment.",
    argument_names: ["subject", "gate", "target"],
    argument_types: ["entity", "gate", "release_target"],
    keywords: ["release", "gates", "before", "testflight", "distribution"],
    examples: [
      "release_gate_rule(ios_builds, configuration_gates, testflight_distribution)",
    ],
    tags: ["release", "gate"],
  },
  {
    id: "FACT-SCHEMA-PLATFORM-CONSISTENCY-RULE",
    predicate_name: "platform_consistency_rule",
    title: "Platform consistency rule",
    description: "A state or entitlement synchronizes across named platforms.",
    argument_names: ["subject", "platforms"],
    argument_types: ["entity", "platform_list"],
    keywords: ["synchronize", "across", "platforms", "ios", "android", "web"],
    examples: ["platform_consistency_rule(premium_status, ios,android,web)"],
    tags: ["platform", "consistency"],
  },
  {
    id: "FACT-SCHEMA-PRESERVATION-RULE",
    predicate_name: "preservation_rule",
    title: "Preservation rule",
    description:
      "Child data or feedback is preserved across deletion or removal of a parent resource.",
    argument_names: ["subject", "preserved", "condition"],
    argument_types: ["action", "entity", "condition"],
    keywords: ["preserve", "preserved", "deletion", "removed"],
    examples: [
      "preservation_rule(soft_deletion, annotations, video_is_removed)",
    ],
    tags: ["preservation", "deletion"],
  },
  {
    id: "FACT-SCHEMA-ABSTRACTION-BOUNDARY-RULE",
    predicate_name: "abstraction_boundary_rule",
    title: "Abstraction boundary rule",
    description:
      "Persisted data, APIs, or contracts must stay neutral to a renderer, vendor, runtime, or implementation detail.",
    argument_names: ["subject", "relation", "contract"],
    argument_types: ["entity", "relation", "contract"],
    keywords: ["renderer-neutral", "contract", "runtime snapshots", "vendor"],
    examples: [
      "abstraction_boundary_rule(annotation_drawing_data, persisted_as, renderer-neutral_scene_contract)",
    ],
    tags: ["architecture", "abstraction"],
  },
  {
    id: "FACT-SCHEMA-SECURITY-CONFIGURATION-RULE",
    predicate_name: "security_configuration_rule",
    title: "Security configuration rule",
    description:
      "A security-sensitive component must have an explicit configuration value.",
    argument_names: ["subject", "setting", "value"],
    argument_types: ["entity", "setting", "value"],
    keywords: ["explicit", "search_path", "security", "configuration"],
    examples: [
      "security_configuration_rule(trigger_functions, search_path, public)",
    ],
    tags: ["security", "configuration"],
  },
];
