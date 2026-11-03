import { describe, expect, test } from "bun:test";
import {
  BUILTIN_PREDICATE_RULE_SETS,
  BuiltinOntologyPack,
  CORE_PREDICATE_RULES,
  LAUNCHER_PREDICATE_RULES,
  POLICY_PREDICATE_RULES,
  PRODUCT_PREDICATE_RULES,
  PRODUCT_TAIL_PREDICATE_RULES,
  type PredicateRule,
  commaList,
  createBuiltinOntologyPack,
  detectPredicateRules,
  exactLauncherPredicateArgs,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  schemaIdFor,
  singularize,
} from "../src/index";

const RULE_SETS = {
  LAUNCHER: LAUNCHER_PREDICATE_RULES,
  CORE: CORE_PREDICATE_RULES,
  POLICY: POLICY_PREDICATE_RULES,
  PRODUCT: PRODUCT_PREDICATE_RULES,
  PRODUCT_TAIL: PRODUCT_TAIL_PREDICATE_RULES,
} as const;

/** One representative statement per rule, in table order, with its exact arguments. */
const RULE_EXAMPLES: readonly (readonly [
  keyof typeof RULE_SETS,
  number,
  string,
  string,
  readonly string[],
])[] = [
  [
    "LAUNCHER",
    0,
    "dependency_resolution_policy",
    "The launcher must resolve and execute the project-local kibi-mcp without downloading packages or using a global or plugin-local runtime.",
    ["the_launcher", "project-local_kibi-mcp", "consumer_local", "no_download"],
  ],
  [
    "LAUNCHER",
    1,
    "ordered_resolution_strategy",
    "It must resolve the consumer workspace in deterministic order: KIBI_WORKSPACE, the git root then cwd only when it contains a kibi config.",
    ["launcher", "KIBI_WORKSPACE__git_root", "it_contains_kibi_config"],
  ],
  [
    "LAUNCHER",
    2,
    "resolution_failure_policy",
    "Unresolved placeholders are invalid.",
    ["launcher", "Unresolved_placeholders", "reject_input"],
  ],
  [
    "LAUNCHER",
    3,
    "resolution_failure_policy",
    "Ambiguous multiple usable roots fail clearly.",
    ["launcher", "Ambiguous_multiple_usable_roots", "clear_error"],
  ],
  [
    "LAUNCHER",
    4,
    "exception_rule",
    "The launcher must resolve kibi-mcp through consumer-scoped node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it.",
    [
      "launcher",
      "consumer_scoped_node_package_semantics",
      "active_package_manager_semantics",
    ],
  ],
  [
    "LAUNCHER",
    5,
    "process_delegation_contract",
    "It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals.",
    [
      "launcher",
      "resolved_executable",
      "consumer_cwd",
      "consumer_workspace_environment",
      "inherited_stdio",
      "propagate_exit_and_termination",
    ],
  ],
  [
    "LAUNCHER",
    6,
    "failure_behavior",
    "Missing project-local kibi-mcp must produce a concise actionable error.",
    ["launcher", "missing_dependency", "actionable_error"],
  ],
  [
    "CORE",
    0,
    "guard",
    "Export button must stay disabled until the form is valid.",
    ["export_button", "form_is_valid", "disabled"],
  ],
  [
    "CORE",
    1,
    "temporal_order",
    "Cache entries must be warmed before the first request.",
    ["cache.entries", "warmed", "first_request"],
  ],
  [
    "CORE",
    2,
    "conditional_behavior",
    "If the upload fails, it retries twice.",
    ["upload", "fails", "retries_twice"],
  ],
  [
    "CORE",
    3,
    "conditional_behavior",
    "When the session expires, the client must redirect to login.",
    ["client", "session_expires", "redirect_to_login"],
  ],
  [
    "CORE",
    4,
    "exception_rule",
    "The importers must skip rows unless the override is set.",
    ["importer", "skip_rows", "override_is_set"],
  ],
  [
    "CORE",
    5,
    "mutual_exclusion",
    "Draft mode and publish mode must be mutually exclusive.",
    ["draft_mode", "publish_mode"],
  ],
  [
    "CORE",
    6,
    "dependency_rule",
    "Checkout requires a payment token before order submission.",
    ["checkout", "payment_token", "order_submission"],
  ],
  [
    "CORE",
    7,
    "ownership_rule",
    "Billing records are owned by the finance team.",
    ["billing_records", "finance_team"],
  ],
  [
    "CORE",
    8,
    "merge_policy",
    "Notes saved in the same slot must merge into one record instead of creating duplicates.",
    ["Notes", "slot", "one_record"],
  ],
  [
    "CORE",
    9,
    "retry_policy",
    "Webhook delivery must retry up to 5 attempts.",
    ["webhook_delivery", "5", "attempts"],
  ],
  [
    "CORE",
    10,
    "escalation_rule",
    "Incidents must escalate to on-call after 15 minutes.",
    ["incidents", "on_call", "15", "minutes"],
  ],
  [
    "CORE",
    11,
    "availability_sla",
    "API availability must be at least 99.9 percent monthly.",
    ["api", "99.9", "percent", "monthly"],
  ],
  [
    "CORE",
    12,
    "notification_route",
    "Deploys must notify the release team by email.",
    ["deploys", "the_release_team", "email"],
  ],
  [
    "CORE",
    13,
    "idempotency_rule",
    "Payments must be idempotent by request id.",
    ["payments", "request_id"],
  ],
  [
    "CORE",
    14,
    "idempotency_rule",
    "Search requests should be deduplicated to prevent redundant requests during rapid typing.",
    ["search_requests", "rapid_typing"],
  ],
  [
    "POLICY",
    0,
    "data_residency_rule",
    "Customer data must be stored in the EU region.",
    ["customer_data", "eu_region"],
  ],
  [
    "POLICY",
    1,
    "audit_event_rule",
    "Session replays must be recorded in the audit log.",
    ["session_replays", "audit_log"],
  ],
  [
    "POLICY",
    2,
    "consent_rule",
    "Analytics must require explicit user consent before tracking visitors.",
    ["analytics", "explicit_user_consent", "tracking_visitors"],
  ],
  [
    "POLICY",
    3,
    "lifecycle_rule",
    "Draft posts must be archived after 30 days.",
    ["draft_posts", "archived", "30", "days"],
  ],
  [
    "POLICY",
    4,
    "conflict_resolution_rule",
    "When edits conflict, the last writer wins.",
    ["edits", "last_writer_wins"],
  ],
  [
    "POLICY",
    5,
    "fallback_rule",
    "If the network is down, uploads must fall back to the local queue.",
    ["network_is_down", "uploads", "local_queue"],
  ],
  [
    "POLICY",
    6,
    "batch_operation_rule",
    "The importer must process invoices in batches of 100.",
    ["the_importer", "invoices", "100"],
  ],
  [
    "POLICY",
    7,
    "consistency_rule",
    "Comments must reference an existing post.",
    ["comments", "existing_post"],
  ],
  [
    "POLICY",
    8,
    "build_constraint",
    "Bundles must be deterministic at build time.",
    ["bundles", "deterministic", "build_time"],
  ],
  [
    "POLICY",
    9,
    "environment_safety_rule",
    "Schema migrations must be forbidden in production.",
    ["schema_migrations", "forbidden", "production"],
  ],
  [
    "POLICY",
    10,
    "schema_invariant_rule",
    "Account ids must be immutable after creation.",
    ["account_ids", "immutable", "after_creation"],
  ],
  [
    "POLICY",
    11,
    "coding_standard_rule",
    "Components must use signal inputs.",
    ["components", "use", "signal_inputs"],
  ],
  [
    "POLICY",
    12,
    "migration_boundary_rule",
    "Legacy config files may only be read as migration input by the importer.",
    ["legacy_config_files", "read", "migration_input"],
  ],
  [
    "POLICY",
    13,
    "absence_requirement",
    "Debug endpoints must be removed.",
    ["Debug_endpoints", "removed"],
  ],
  [
    "POLICY",
    14,
    "absence_requirement",
    "No hidden network calls.",
    ["hidden_network_calls", "absent"],
  ],
  [
    "POLICY",
    15,
    "offline_behavior_rule",
    "Autosave must be non-blocking during offline conditions.",
    ["autosave", "non-blocking", "offline_conditions"],
  ],
  [
    "PRODUCT",
    0,
    "release_gate_rule",
    "Mobile builds must pass smoke tests before TestFlight distribution.",
    ["mobile_builds", "smoke_tests", "testflight_distribution"],
  ],
  [
    "PRODUCT",
    1,
    "platform_consistency_rule",
    "Bookmarks must synchronize across iOS, Android and web.",
    ["bookmarks", "ios,android,web"],
  ],
  [
    "PRODUCT",
    2,
    "preservation_rule",
    "Exports must preserve annotations when the source is deleted.",
    ["exports", "annotations", "source_is_deleted"],
  ],
  [
    "PRODUCT",
    3,
    "abstraction_boundary_rule",
    "Diagrams must be persisted as a renderer-neutral contract.",
    ["diagrams", "persisted_as", "renderer-neutral_contract"],
  ],
  [
    "PRODUCT",
    4,
    "security_configuration_rule",
    "Database functions must have explicit search_path empty.",
    ["database_functions", "search_path", "empty"],
  ],
  [
    "PRODUCT",
    5,
    "ordered_strategy_rule",
    "The resolver must use sources in priority order env, config > defaults.",
    ["the_resolver", "sources", "env,config,defaults"],
  ],
  [
    "PRODUCT",
    6,
    "refresh_policy_rule",
    "Dashboards must automatically refresh metrics without requiring manual page reload.",
    ["dashboards", "metrics", "automatic"],
  ],
  [
    "PRODUCT",
    7,
    "scoped_authorization_rule",
    "Unassigned members must be denied ticket edits.",
    ["unassigned_members", "ticket_edits", "deny"],
  ],
  [
    "PRODUCT",
    8,
    "documentation_standard_rule",
    "Public APIs must be documented in the reference guide.",
    ["public_apis", "documented_in", "the_reference_guide"],
  ],
  [
    "PRODUCT",
    9,
    "warmup_policy_rule",
    "The search index must warm up on application start.",
    ["search_index", "application_start"],
  ],
  [
    "PRODUCT",
    10,
    "visual_layout_rule",
    "Toolbar icons must remain visually aligned with the header grid.",
    ["toolbar_icons", "aligned_with", "the_header_grid"],
  ],
  [
    "PRODUCT",
    11,
    "enforcement_location_rule",
    "Rate limits must be enforced at the API gateway.",
    ["rate_limits", "the_api_gateway"],
  ],
  [
    "PRODUCT",
    12,
    "reconciliation_rule",
    "On login, the client must reconcile cached sessions and clear stale tokens.",
    ["the_client", "login", "cached_sessions", "clear_stale_tokens"],
  ],
  [
    "PRODUCT_TAIL",
    0,
    "throttle_policy_rule",
    "Scroll handlers must be throttled for high-frequency input.",
    ["scroll_handlers", "high-frequency_input"],
  ],
  [
    "PRODUCT_TAIL",
    1,
    "temporal_order",
    "The editor initializes after the workspace is ready.",
    ["editor", "workspace_ready", "initializes"],
  ],
  [
    "PRODUCT_TAIL",
    2,
    "state_transition",
    "When payment succeeds, the orders transition from pending to paid.",
    ["order", "pending", "paid", "payment_succeeds"],
  ],
  [
    "PRODUCT_TAIL",
    3,
    "permission_rule",
    "Guest users must not delete shared folders.",
    ["guest_user", "delete", "shared_folders", "deny"],
  ],
  [
    "PRODUCT_TAIL",
    4,
    "uniqueness_constraint",
    "There must be at most one active session per user per device.",
    ["active_session", "user,device"],
  ],
  [
    "PRODUCT_TAIL",
    5,
    "default_value",
    "The theme defaults to dark mode.",
    ["theme", "mode", "dark"],
  ],
  [
    "PRODUCT_TAIL",
    6,
    "state_membership",
    "Order terminal states are shipped, cancelled or refunded.",
    ["order", "shipped,cancelled,refunded"],
  ],
  [
    "PRODUCT_TAIL",
    7,
    "rate_limit",
    "Login requests must be rate limited to 5 attempts per minute.",
    ["login.request", "attempts", "minute", "5"],
  ],
  [
    "PRODUCT_TAIL",
    8,
    "permission_rule",
    "Only admins can delete projects when unlocked.",
    ["admin", "delete", "projects", "assert"],
  ],
];

describe("builtin ontology rule tables", () => {
  test("every rule has exactly one example, in table order", () => {
    for (const [setName, rules] of Object.entries(RULE_SETS)) {
      const indexes = RULE_EXAMPLES.filter(([name]) => name === setName).map(
        ([, index]) => index,
      );
      expect(indexes).toStrictEqual(rules.map((_, index) => index));
    }
  });

  test.each(RULE_EXAMPLES)(
    "%s rule %i (%s) reads its example",
    (setName, index, name, statement, args) => {
      const rule = RULE_SETS[setName][index] as PredicateRule;
      expect(rule.name).toBe(name);
      expect(rule.arity).toBe(args.length);
      const [hit] = detectPredicateRules(statement, [rule]);
      expect(hit?.arguments).toStrictEqual(args);
      expect(hit?.evidence).toBe(statement);
    },
  );

  test("rule sets are evaluated launcher, core, policy, product, product tail", () => {
    expect(BUILTIN_PREDICATE_RULE_SETS).toStrictEqual([
      LAUNCHER_PREDICATE_RULES,
      CORE_PREDICATE_RULES,
      POLICY_PREDICATE_RULES,
      PRODUCT_PREDICATE_RULES,
      PRODUCT_TAIL_PREDICATE_RULES,
    ]);
  });
});

describe("detectPredicateRules", () => {
  const groupRule = (
    overrides: Partial<PredicateRule> = {},
  ): PredicateRule => ({
    pattern: /^(?<subject>\w+) works$/,
    name: "works",
    arity: 1,
    args: (g) => [g.subject ?? ""],
    rationale: "Works prose.",
    ...overrides,
  });

  test("builds the full candidate with default schema id and polarity", () => {
    expect(detectPredicateRules("Sync works", [groupRule()])).toStrictEqual([
      {
        schemaId: "builtin.works.1",
        predicateName: "works",
        arguments: ["Sync"],
        polarity: "assert",
        confidence: 0.84,
        evidence: "Sync works",
        rationale: "Works prose.",
      },
    ]);
  });

  test("keeps a declared catalog schema id and polarity", () => {
    const [hit] = detectPredicateRules("Sync works", [
      groupRule({ catalogSchemaId: "FACT-SCHEMA-WORKS", polarity: "deny" }),
    ]);
    expect(hit?.schemaId).toBe("FACT-SCHEMA-WORKS");
    expect(hit?.polarity).toBe("deny");
  });

  test("returns only the first matching rule", () => {
    const hits = detectPredicateRules("Sync works", [
      groupRule({ name: "first" }),
      groupRule({ name: "second" }),
    ]);
    expect(hits.map((hit) => hit.predicateName)).toStrictEqual(["first"]);
  });

  test("skips rules that reject the statement, do not match, or lack named groups", () => {
    const rules = [
      groupRule({ name: "rejected", accepts: () => false }),
      groupRule({ name: "unmatched", pattern: /^nothing$/ }),
      groupRule({ name: "groupless", pattern: /works/ }),
      groupRule({ name: "accepted", accepts: (s) => s.startsWith("Sync") }),
    ];
    expect(
      detectPredicateRules("Sync works", rules).map((hit) => hit.predicateName),
    ).toStrictEqual(["accepted"]);
    expect(detectPredicateRules("Nothing here", rules)).toStrictEqual([]);
  });

  test("an args() result that disagrees with the declared arity is an error", () => {
    expect(() =>
      detectPredicateRules("Sync works", [
        groupRule({ name: "bad", arity: 2 }),
      ]),
    ).toThrow(
      new Error(
        "Predicate rule 'bad' arity mismatch: declared 2, args() returned 1",
      ),
    );
  });

  test("schema ids name the predicate and arity", () => {
    expect(schemaIdFor("guard", 3)).toBe("builtin.guard.3");
  });
});

describe("BuiltinOntologyPack", () => {
  const pack = createBuiltinOntologyPack();

  test("is the builtin pack class with its id", () => {
    expect(pack).toBeInstanceOf(BuiltinOntologyPack);
    expect(pack.id).toBe("kibi-plugin-builtin.ontology");
  });

  test("derives one schema per predicate name and arity, first rule wins", () => {
    const schemas = pack.schemas();
    expect(schemas.map((schema) => schema.schemaId)).toStrictEqual([
      "builtin.dependency_resolution_policy.4",
      "builtin.ordered_resolution_strategy.3",
      "builtin.resolution_failure_policy.3",
      "builtin.exception_rule.3",
      "builtin.process_delegation_contract.6",
      "builtin.failure_behavior.3",
      "builtin.guard.3",
      "builtin.temporal_order.3",
      "builtin.conditional_behavior.3",
      "builtin.mutual_exclusion.2",
      "builtin.dependency_rule.3",
      "builtin.ownership_rule.2",
      "builtin.merge_policy.3",
      "builtin.retry_policy.3",
      "builtin.escalation_rule.4",
      "builtin.availability_sla.4",
      "builtin.notification_route.3",
      "builtin.idempotency_rule.2",
      "builtin.data_residency_rule.2",
      "builtin.audit_event_rule.2",
      "builtin.consent_rule.3",
      "builtin.lifecycle_rule.4",
      "builtin.conflict_resolution_rule.2",
      "builtin.fallback_rule.3",
      "builtin.batch_operation_rule.3",
      "builtin.consistency_rule.2",
      "builtin.build_constraint.3",
      "builtin.environment_safety_rule.3",
      "builtin.schema_invariant_rule.3",
      "builtin.coding_standard_rule.3",
      "builtin.migration_boundary_rule.3",
      "builtin.absence_requirement.2",
      "builtin.offline_behavior_rule.3",
      "builtin.release_gate_rule.3",
      "builtin.platform_consistency_rule.2",
      "builtin.preservation_rule.3",
      "builtin.abstraction_boundary_rule.3",
      "builtin.security_configuration_rule.3",
      "builtin.ordered_strategy_rule.3",
      "builtin.refresh_policy_rule.3",
      "builtin.scoped_authorization_rule.3",
      "builtin.documentation_standard_rule.3",
      "builtin.warmup_policy_rule.2",
      "builtin.visual_layout_rule.3",
      "builtin.enforcement_location_rule.2",
      "builtin.reconciliation_rule.4",
      "builtin.throttle_policy_rule.2",
      "builtin.state_transition.4",
      "builtin.permission_rule.4",
      "builtin.uniqueness_constraint.2",
      "builtin.default_value.3",
      "builtin.state_membership.2",
      "builtin.rate_limit.4",
    ]);
    expect(schemas[0]).toStrictEqual({
      schemaId: "builtin.dependency_resolution_policy.4",
      predicateName: "dependency_resolution_policy",
      argumentNames: ["arg0", "arg1", "arg2", "arg3"],
      argumentTypes: ["string", "string", "string", "string"],
      title: "dependency_resolution_policy",
      description:
        "Consumer-local dependency resolution and acquisition restrictions are a reusable launcher policy predicate.",
    });
    expect(
      schemas.find(
        (schema) => schema.schemaId === "builtin.conditional_behavior.3",
      )?.description,
    ).toBe(
      "If/then requirement prose is conditional behavior and should be queryable as a predicate.",
    );
    expect(pack.schemas()).toBe(schemas);
  });

  test("matches trimmed statements against the first rule set with a hit", () => {
    expect(
      pack.match({ statement: "  Unresolved placeholders are invalid.  " }),
    ).toStrictEqual([
      {
        schemaId: "builtin.resolution_failure_policy.3",
        predicateName: "resolution_failure_policy",
        arguments: ["launcher", "Unresolved_placeholders", "reject_input"],
        polarity: "assert",
        confidence: 0.84,
        evidence: "Unresolved placeholders are invalid.",
        rationale:
          "Invalid unresolved placeholders are an explicit resolution failure condition.",
      },
    ]);
    const [deny] = pack.match({
      statement: "Guest users must not delete shared folders.",
    });
    expect(deny?.predicateName).toBe("permission_rule");
    expect(deny?.polarity).toBe("deny");
    expect(
      pack.match({ statement: "Components must use signal inputs." })[0]
        ?.predicateName,
    ).toBe("coding_standard_rule");
  });

  test("returns nothing for blank or unmatched statements", () => {
    expect(pack.match({ statement: "   " })).toStrictEqual([]);
    expect(pack.match({ statement: "Teams must use tabs." })).toStrictEqual([]);
  });
});

describe("exactLauncherPredicateArgs", () => {
  test("returns the reviewed tuple for an exact launcher proposition", () => {
    expect(
      exactLauncherPredicateArgs(
        "dependency_resolution_policy",
        "The launcher must resolve and execute the project-local kibi-mcp without downloading packages or using a global or plugin-local runtime.",
      ),
    ).toStrictEqual([
      "the_launcher",
      "project-local_kibi-mcp",
      "consumer_local",
      "no_download",
    ]);
  });

  test("tries every rule with the requested name", () => {
    expect(
      exactLauncherPredicateArgs(
        "resolution_failure_policy",
        "Ambiguous usable roots fail clearly.",
      ),
    ).toStrictEqual(["launcher", "Ambiguous_usable_roots", "clear_error"]);
  });

  test("returns null for another predicate name or non-exact prose", () => {
    expect(
      exactLauncherPredicateArgs(
        "failure_behavior",
        "Unresolved placeholders are invalid.",
      ),
    ).toBeNull();
    expect(
      exactLauncherPredicateArgs(
        "resolution_failure_policy",
        "Placeholders are sometimes invalid.",
      ),
    ).toBeNull();
  });
});

describe("normalization helpers", () => {
  test("normalizeKey lowercases, drops apostrophes, and joins words with one underscore", () => {
    expect(normalizeKey("  User's  Café’s DATA--Store!  ")).toBe(
      "users_caf_s_data_store",
    );
    expect(normalizeKey("a  b")).toBe("a_b");
    expect(normalizeKey("_x_")).toBe("x");
    expect(normalizeKey("!!!")).toBe("");
  });

  test("normalizePredicateToken drops articles and keeps case, dashes, and underscores", () => {
    expect(normalizePredicateToken("  The user's  Opt-In  ")).toBe(
      "users_Opt-In",
    );
    expect(normalizePredicateToken("an Apple’s pie")).toBe("Apples_pie");
    expect(normalizePredicateToken("go to the")).toBe("go_to");
    expect(normalizePredicateToken("the-x item")).toBe("-x_item");
    expect(normalizePredicateToken("x  y!!z")).toBe("x_y_z");
    expect(normalizePredicateToken("__x__")).toBe("x");
  });

  test("singularize folds plural words longer than three letters", () => {
    expect(singularize("cats")).toBe("cat");
    expect(singularize("bus")).toBe("bus");
    expect(singularize("cat")).toBe("cat");
    expect(singularize("status")).toBe("status");
    expect(singularize("results")).toBe("results");
    expect(singularize("")).toBe("");
  });

  test("normalizeSubjectKey dots singular words", () => {
    expect(normalizeSubjectKey("User Accounts")).toBe("user.account");
  });

  test("commaList normalizes each part and drops empty ones", () => {
    expect(commaList("iOS, Android and  web,,")).toBe("ios,android,web");
    expect(commaList("Red AND blue")).toBe("red,blue");
    expect(commaList("a;b", /;/)).toBe("a,b");
  });
});
