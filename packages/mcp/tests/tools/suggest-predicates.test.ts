import { describe, expect, test } from "bun:test";

interface SuggestPredicatesModule {
  handleKbSuggestPredicates: (
    prolog: unknown,
    args: Record<string, unknown>,
  ) => Promise<{
    content: Array<{ type: string; text: string }>;
    structuredContent: Record<string, unknown>;
    applyPlan: Array<Record<string, unknown>>;
  }>;
}

describe("kb_suggest_predicates", () => {
  async function loadModule(): Promise<SuggestPredicatesModule> {
    return import(
      "../../src/tools/suggest-predicates.js"
    ) as unknown as Promise<SuggestPredicatesModule>;
  }

  async function suggest(args: Record<string, unknown>) {
    const { handleKbSuggestPredicates } = await loadModule();
    return handleKbSuggestPredicates(null, args);
  }

  test("ranks built-in state and persistence predicates for editor navigation prose", async () => {
    const { handleKbSuggestPredicates } = await loadModule();

    const result = await handleKbSuggestPredicates(null, {
      text: "When the user navigates away with unsaved annotation edits, the editor must auto-save the draft and return to idle mode.",
      requirementId: "REQ-EDITOR-004",
      source: "requirements/editor.md#L12",
      subjectHint: "editor.annotation",
      maxCandidates: 4,
      existingLogicClaims: ["CLAIM-BBBBBBBBBBBBBBBB"],
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;

    expect(candidates).toHaveLength(4);
    expect(candidates[0]).toMatchObject({
      predicate_name: "commit_action",
      predicate_args: ["editor.annotation", "navigation", "draft"],
      polarity: "assert",
      schema: expect.objectContaining({
        predicate_name: "commit_action",
        argument_names: ["subject", "trigger", "scope"],
      }),
    });
    expect(candidates.map((candidate) => candidate.predicate_name)).toEqual(
      expect.arrayContaining(["transition", "has_unsaved_changes"]),
    );
    const relationshipPlan = structured.relationshipPlan as Record<
      string,
      unknown
    > | null;

    expect(applyPlan).toHaveLength(1);
    expect(applyPlan[0]).toMatchObject({
      type: "fact",
      relationships: [],
      properties: {
        fact_kind: "predicate",
        predicate_name: "commit_action",
        predicate_args: ["editor.annotation", "navigation", "draft"],
        tags: expect.arrayContaining(["lane:ontology", "predicate-suggestion"]),
      },
    });
    expect(relationshipPlan).toMatchObject({
      applyAfter: applyPlan[0]?.id,
      requiresExistingReq: "REQ-EDITOR-004",
      relationship: {
        type: "requires_predicate",
        from: "REQ-EDITOR-004",
        to: applyPlan[0]?.id,
      },
      logicClaims: [
        "CLAIM-BBBBBBBBBBBBBBBB",
        expect.stringMatching(/^CLAIM-[A-F0-9]{16}$/),
      ],
    });
    expect(structured.logicClaims).toEqual(relationshipPlan?.logicClaims);
    expect(result.applyPlan).toEqual(applyPlan);
    expect(result.content[0]?.text).toContain("commit_action");
  });

  test("routes generic return prose to ontology gap instead of weak transition match", async () => {
    const { handleKbSuggestPredicates } = await loadModule();

    const result = await handleKbSuggestPredicates(null, {
      text: "The API must return a specific JSON error body.",
      requirementId: "REQ-API-ERROR-001",
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;

    expect(candidates).toHaveLength(0);
    expect(structured.recommendedAction).toBe("record_ontology_gap");
    expect(structured.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("predicate_schema")]),
    );
    expect(applyPlan[0]).toMatchObject({
      type: "fact",
      properties: {
        fact_kind: "observation",
        tags: expect.arrayContaining(["review:ontology-gap"]),
      },
      relationships: [],
    });
  });

  test("does not classify generic storage destinations as data residency", async () => {
    const result = await suggest({
      text: "Cache entries must be stored in Redis.",
      maxCandidates: 1,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;

    expect(candidates[0]?.predicate_name).not.toBe("data_residency_rule");
  });

  test("does not classify product usage prose as coding standards", async () => {
    const result = await suggest({
      text: "Users must use MFA before accessing admin settings.",
      maxCandidates: 1,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;

    expect(candidates[0]?.predicate_name).not.toBe("coding_standard_rule");
  });

  test("does not classify product workflow prerequisites as release gates", async () => {
    const result = await suggest({
      text: "Checkout must pass fraud review before payment capture.",
      maxCandidates: 1,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;

    expect(candidates[0]?.predicate_name).not.toBe("release_gate_rule");
  });

  test("does not classify generic explicit fields as security configuration", async () => {
    const result = await suggest({
      text: "Profile fields must have explicit display labels.",
      maxCandidates: 1,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;

    expect(candidates[0]?.predicate_name).not.toBe(
      "security_configuration_rule",
    );
  });

  test("covers product-audit phrase variants with existing predicate families", async () => {
    const cases = [
      {
        text: "No user identity on public pages.",
        expectedName: "absence_requirement",
        expectedArgs: ["user_identity_on_public_pages", "absent"],
      },
      {
        text: "Analytics and Sentry must stay disabled until users grant consent.",
        expectedName: "guard",
        expectedArgs: [
          "analytics_and_sentry",
          "users_grant_consent",
          "disabled",
        ],
      },
      {
        text: "When returned email already exists, the system must prevent silent account duplication.",
        expectedName: "conditional_behavior",
        expectedArgs: [
          "system",
          "returned_email_already_exists",
          "prevent_silent_account_duplication",
        ],
      },
      {
        text: "Profile fetching must be deduplicated to prevent redundant requests during concurrent auth state changes.",
        expectedName: "idempotency_rule",
        expectedArgs: ["profile_fetching", "concurrent_auth_state_changes"],
      },
    ];

    for (const testCase of cases) {
      const result = await suggest({ text: testCase.text, maxCandidates: 1 });
      const structured = result.structuredContent;
      const candidates = structured.candidates as Array<
        Record<string, unknown>
      >;

      expect(candidates[0]).toMatchObject({
        predicate_name: testCase.expectedName,
        predicate_args: testCase.expectedArgs,
      });
    }
  });

  test("emits an ontology-gap observation when no built-in predicate is confident enough", async () => {
    const result = await suggest({
      text: "The product should feel delightful and magical.",
      requirementId: "REQ-BRAND-001",
      source: "requirements/brand.md#L3",
      minScore: 0.8,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;

    expect(candidates).toHaveLength(0);
    expect(structured.recommendedAction).toBe("record_ontology_gap");
    expect(applyPlan).toHaveLength(1);
    expect(applyPlan[0]).toMatchObject({
      type: "fact",
      relationships: [],
      properties: {
        fact_kind: "observation",
        tags: expect.arrayContaining([
          "review:ontology-gap",
          "needs_schema_extension",
        ]),
      },
    });
    expect(result.content[0]?.text).toContain("ontology gap");
  });

  test("rejects blank prose before scoring predicates", async () => {
    const { handleKbSuggestPredicates } = await loadModule();

    await expect(
      handleKbSuggestPredicates(null, { text: "   " }),
    ).rejects.toThrow("text must be a non-empty string");
  });

  test("does not attach a relationship plan when no requirement ID is provided", async () => {
    const result = await suggest({
      text: "The editor mode must enter idle state.",
      subjectHint: "editor",
      maxCandidates: 1,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;

    expect(candidates[0]).toMatchObject({
      predicate_name: "state",
      predicate_args: ["editor", "idle"],
    });
    expect(structured.relationshipPlan).toBeNull();
  });

  test("returns use-when and do-not-use-when guidance for predicate candidates", async () => {
    const result = await suggest({
      text: "Users must not export customer data.",
      maxCandidates: 1,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;
    const schema = candidates[0]?.schema as Record<string, unknown> | undefined;
    const usageHints = schema?.usage_hints as
      | Record<string, unknown>
      | undefined;

    expect(candidates[0]).toMatchObject({
      predicate_name: "permission_rule",
      polarity: "deny",
    });
    expect(usageHints?.use_when).toEqual([
      "Use for allow/deny permission statements with an actor, action, and resource.",
    ]);
    expect(usageHints?.do_not_use_when).toEqual([
      "Do not use for scalar quotas, feature flags, or state transitions; choose a more specific predicate or strict property instead.",
    ]);
  });

  test("covers semantic advisor predicate names as production predicate families", async () => {
    const cases = [
      {
        text: "The annotation tool defaults to move mode.",
        expectedName: "default_value",
        expectedArgs: ["annotation.tool", "mode", "move"],
      },
      {
        text: "There must be at most one annotation per video per timeKey.",
        expectedName: "uniqueness_constraint",
        expectedArgs: ["annotation", "video,timeKey"],
      },
      {
        text: "Auth status terminal states are ready, anonymous, and profile-error.",
        expectedName: "state_membership",
        expectedArgs: ["auth.status", "ready,anonymous,profile-error"],
      },
      {
        text: "Draft changes must be saved before navigation completes.",
        expectedName: "temporal_order",
        expectedArgs: ["draft.changes", "saved", "navigation_completes"],
      },
      {
        text: "If a card fails during a non-practice session, it becomes tainted.",
        expectedName: "conditional_behavior",
        expectedArgs: [
          "card",
          "fails_during_non-practice_session",
          "becomes_tainted",
        ],
      },
      {
        text: "When navigation completes, the editor transitions from draft to idle.",
        expectedName: "state_transition",
        expectedArgs: ["editor", "draft", "idle", "navigation_completes"],
      },
      {
        text: "Password reset requests must be rate limited to 5 attempts per hour.",
        expectedName: "rate_limit",
        expectedArgs: ["password_reset.request", "attempts", "hour", "5"],
      },
      {
        text: "The notification service must send email unless the user has opted out.",
        expectedName: "exception_rule",
        expectedArgs: [
          "notification.service",
          "send_email",
          "user_has_opted_out",
        ],
      },
      {
        text: "Practice mode and exam mode must be mutually exclusive.",
        expectedName: "mutual_exclusion",
        expectedArgs: ["practice_mode", "exam_mode"],
      },
      {
        text: "Checkout requires payment authorization before order submission.",
        expectedName: "dependency_rule",
        expectedArgs: ["checkout", "payment_authorization", "order_submission"],
      },
      {
        text: "Account settings are owned by the profile service.",
        expectedName: "ownership_rule",
        expectedArgs: ["account_settings", "profile_service"],
      },
      {
        text: "Failed webhook delivery must retry up to 3 times.",
        expectedName: "retry_policy",
        expectedArgs: ["failed_webhook_delivery", "3", "times"],
      },
      {
        text: "Failed payment disputes must escalate to support after 48 hours.",
        expectedName: "escalation_rule",
        expectedArgs: ["failed_payment_disputes", "support", "48", "hours"],
      },
      {
        text: "Checkout API availability must be at least 99.9 percent monthly.",
        expectedName: "availability_sla",
        expectedArgs: ["checkout_api", "99.9", "percent", "monthly"],
      },
      {
        text: "Fraud alerts must notify risk operations by email.",
        expectedName: "notification_route",
        expectedArgs: ["fraud_alerts", "risk_operations", "email"],
      },
      {
        text: "Payment capture requests must be idempotent by idempotency key.",
        expectedName: "idempotency_rule",
        expectedArgs: ["payment_capture_requests", "idempotency_key"],
      },
      {
        text: "EU customer data must be stored in the EU region.",
        expectedName: "data_residency_rule",
        expectedArgs: ["eu_customer_data", "eu_region"],
      },
      {
        text: "Admin access changes must be recorded in the audit log.",
        expectedName: "audit_event_rule",
        expectedArgs: ["admin_access_changes", "audit_log"],
      },
      {
        text: "Marketing emails must require user consent before processing.",
        expectedName: "consent_rule",
        expectedArgs: ["marketing_emails", "user_consent", "processing"],
      },
      {
        text: "Expired sessions must be archived after 30 days.",
        expectedName: "lifecycle_rule",
        expectedArgs: ["expired_sessions", "archived", "30", "days"],
      },
      {
        text: "When profile updates conflict, the latest write wins.",
        expectedName: "conflict_resolution_rule",
        expectedArgs: ["profile_updates", "latest_write_wins"],
      },
      {
        text: "If the payment provider is unavailable, checkout must fall back to manual review.",
        expectedName: "fallback_rule",
        expectedArgs: [
          "payment_provider_is_unavailable",
          "checkout",
          "manual_review",
        ],
      },
      {
        text: "Invoice exports must process records in batches of 500.",
        expectedName: "batch_operation_rule",
        expectedArgs: ["invoice_exports", "records", "500"],
      },
      {
        text: "Order items must reference an existing order.",
        expectedName: "consistency_rule",
        expectedArgs: ["order_items", "existing_order"],
      },
      {
        text: "Share manifest generation must be deterministic at build time.",
        expectedName: "build_constraint",
        expectedArgs: [
          "share_manifest_generation",
          "deterministic",
          "build_time",
        ],
      },
      {
        text: "Destructive operations must be forbidden in production.",
        expectedName: "environment_safety_rule",
        expectedArgs: ["destructive_operations", "forbidden", "production"],
      },
      {
        text: "User email must be immutable after creation.",
        expectedName: "schema_invariant_rule",
        expectedArgs: ["user_email", "immutable", "after_creation"],
      },
      {
        text: "Derived state must use computed signals.",
        expectedName: "coding_standard_rule",
        expectedArgs: ["derived_state", "use", "computed_signals"],
      },
      {
        text: "Legacy fabricData may only be read as migration input.",
        expectedName: "migration_boundary_rule",
        expectedArgs: ["legacy_fabricdata", "read", "migration_input"],
      },
      {
        text: "The pg_graphql extension must be absent.",
        expectedName: "absence_requirement",
        expectedArgs: ["pg_graphql_extension", "absent"],
      },
      {
        text: "Cloud synchronization must be non-blocking during offline conditions.",
        expectedName: "offline_behavior_rule",
        expectedArgs: [
          "cloud_synchronization",
          "non-blocking",
          "offline_conditions",
        ],
      },
      {
        text: "iOS builds must pass configuration gates before TestFlight distribution.",
        expectedName: "release_gate_rule",
        expectedArgs: [
          "ios_builds",
          "configuration_gates",
          "testflight_distribution",
        ],
      },
      {
        text: "Premium status must synchronize across iOS, Android, and Web.",
        expectedName: "platform_consistency_rule",
        expectedArgs: ["premium_status", "ios,android,web"],
      },
      {
        text: "Soft deletion must preserve annotations when the video is removed.",
        expectedName: "preservation_rule",
        expectedArgs: ["soft_deletion", "annotations", "video_is_removed"],
      },
      {
        text: "Annotation drawing data must be persisted as a renderer-neutral scene contract.",
        expectedName: "abstraction_boundary_rule",
        expectedArgs: [
          "annotation_drawing_data",
          "persisted_as",
          "renderer-neutral_scene_contract",
        ],
      },
      {
        text: "Trigger functions must have explicit search_path public.",
        expectedName: "security_configuration_rule",
        expectedArgs: ["trigger_functions", "search_path", "public"],
      },
      {
        text: "POMs must use selector strategies in priority order data-testid, visible, text.",
        expectedName: "ordered_strategy_rule",
        expectedArgs: [
          "poms",
          "selector_strategies",
          "data-testid,visible,text",
        ],
      },
      {
        text: "Dashboard must automatically refresh processing videos without requiring manual page reload.",
        expectedName: "refresh_policy_rule",
        expectedArgs: ["dashboard", "processing_videos", "automatic"],
      },
      {
        text: "Unassigned instructors must be denied signed URL generation.",
        expectedName: "scoped_authorization_rule",
        expectedArgs: [
          "unassigned_instructors",
          "signed_url_generation",
          "deny",
        ],
      },
      {
        text: "Legacy fabricData may only be read as migration input by the annotation scene mapper.",
        expectedName: "migration_boundary_rule",
        expectedArgs: ["legacy_fabricdata", "read", "migration_input"],
      },
      {
        text: "Reactivity must avoid manual change detection APIs.",
        expectedName: "coding_standard_rule",
        expectedArgs: ["reactivity", "avoid", "manual_change_detection_APIs"],
      },
      {
        text: "Code symbols must be documented in docs/symbols.yaml.",
        expectedName: "documentation_standard_rule",
        expectedArgs: ["code_symbols", "documented_in", "docs_symbols_yaml"],
      },
      {
        text: "The editor video must warm up on entry.",
        expectedName: "warmup_policy_rule",
        expectedArgs: ["editor_video", "entry"],
      },
      {
        text: "Processing video cards must remain visually aligned with ready cards.",
        expectedName: "visual_layout_rule",
        expectedArgs: ["processing_video_cards", "aligned_with", "ready_cards"],
      },
      {
        text: "Foreign key constraints must be enforced at database level.",
        expectedName: "enforcement_location_rule",
        expectedArgs: ["foreign_key_constraints", "database_level"],
      },
      {
        text: "On login, system must reconcile analysis notifications and clear stale notifications.",
        expectedName: "reconciliation_rule",
        expectedArgs: [
          "system",
          "login",
          "analysis_notifications",
          "clear_stale_notifications",
        ],
      },
      {
        text: "The configured canvas provider initializes after the video layout is ready.",
        expectedName: "temporal_order",
        expectedArgs: [
          "configured_canvas_provider",
          "video_layout_ready",
          "initializes",
        ],
      },
      {
        text: "Event handlers must be throttled for high-frequency operations.",
        expectedName: "throttle_policy_rule",
        expectedArgs: ["event_handlers", "high-frequency_operations"],
      },
    ];

    for (const testCase of cases) {
      const result = await suggest({
        text: testCase.text,
        maxCandidates: 1,
      });
      const structured = result.structuredContent;
      const candidates = structured.candidates as Array<
        Record<string, unknown>
      >;

      expect(candidates[0]).toMatchObject({
        predicate_name: testCase.expectedName,
        predicate_args: testCase.expectedArgs,
      });
      const schema = candidates[0]?.schema as Record<string, unknown>;
      const usageHints = schema.usage_hints as Record<string, unknown>;
      expect(Array.isArray(usageHints.use_when)).toBe(true);
      expect(Array.isArray(usageHints.do_not_use_when)).toBe(true);
      expect(usageHints.use_when).not.toHaveLength(0);
      expect(usageHints.do_not_use_when).not.toHaveLength(0);
    }
  });

  test("all built-in predicate families expose predicate-specific usage hints", async () => {
    const cases = [
      { text: "The editor mode must enter idle state.", expectedName: "state" },
      {
        text: "The workflow must transition when escape is pressed.",
        expectedName: "transition",
      },
      {
        text: "Readonly scrubbing must guard editor annotation behavior.",
        expectedName: "guard",
      },
      {
        text: "The editor must have no unsaved dirty changes.",
        expectedName: "has_unsaved_changes",
      },
      {
        text: "The form must save on submit for the session.",
        expectedName: "commit_action",
      },
      {
        text: "Pressing escape must discard active annotation changes without save.",
        expectedName: "discard_action",
      },
      {
        text: "Keyboard navigation must satisfy WCAG accessibility requirements.",
        expectedName: "accessibility_requirement",
      },
      {
        text: "Customer data must be retained for 7 years.",
        expectedName: "retention_policy",
      },
      {
        text: "Search latency must be maximum 200 ms.",
        expectedName: "resource_constraint",
      },
      {
        text: "The checkout feature flag `checkoutV2` must be disabled.",
        expectedName: "feature_gate",
      },
      {
        text: "Checkout must emit OrderSubmittedEvent when payment succeeds.",
        expectedName: "publishes_event",
      },
      {
        text: "Search results must display an empty state acceptance outcome.",
        expectedName: "acceptance_rule",
      },
      {
        text: "Users must not export customer data.",
        expectedName: "permission_rule",
      },
      {
        text: "The annotation tool defaults to move mode.",
        expectedName: "default_value",
      },
      {
        text: "There must be at most one annotation per video per timeKey.",
        expectedName: "uniqueness_constraint",
      },
      {
        text: "Auth status terminal states are ready, anonymous, and profile-error.",
        expectedName: "state_membership",
      },
      {
        text: "Draft changes must be saved before navigation completes.",
        expectedName: "temporal_order",
      },
      {
        text: "If a card fails during a non-practice session, it becomes tainted.",
        expectedName: "conditional_behavior",
      },
      {
        text: "When navigation completes, the editor transitions from draft to idle.",
        expectedName: "state_transition",
      },
      {
        text: "Password reset requests must be rate limited to 5 attempts per hour.",
        expectedName: "rate_limit",
      },
      {
        text: "The notification service must send email unless the user has opted out.",
        expectedName: "exception_rule",
      },
      {
        text: "Practice mode and exam mode must be mutually exclusive.",
        expectedName: "mutual_exclusion",
      },
      {
        text: "Checkout requires payment authorization before order submission.",
        expectedName: "dependency_rule",
      },
      {
        text: "Account settings are owned by the profile service.",
        expectedName: "ownership_rule",
      },
      {
        text: "Failed webhook delivery must retry up to 3 times.",
        expectedName: "retry_policy",
      },
      {
        text: "Failed payment disputes must escalate to support after 48 hours.",
        expectedName: "escalation_rule",
      },
      {
        text: "Checkout API availability must be at least 99.9 percent monthly.",
        expectedName: "availability_sla",
      },
      {
        text: "Fraud alerts must notify risk operations by email.",
        expectedName: "notification_route",
      },
      {
        text: "Payment capture requests must be idempotent by idempotency key.",
        expectedName: "idempotency_rule",
      },
      {
        text: "EU customer data must be stored in the EU region.",
        expectedName: "data_residency_rule",
      },
      {
        text: "Admin access changes must be recorded in the audit log.",
        expectedName: "audit_event_rule",
      },
      {
        text: "Marketing emails must require user consent before processing.",
        expectedName: "consent_rule",
      },
      {
        text: "Expired sessions must be archived after 30 days.",
        expectedName: "lifecycle_rule",
      },
      {
        text: "When profile updates conflict, the latest write wins.",
        expectedName: "conflict_resolution_rule",
      },
      {
        text: "If the payment provider is unavailable, checkout must fall back to manual review.",
        expectedName: "fallback_rule",
      },
      {
        text: "Invoice exports must process records in batches of 500.",
        expectedName: "batch_operation_rule",
      },
      {
        text: "Order items must reference an existing order.",
        expectedName: "consistency_rule",
      },
      {
        text: "Share manifest generation must be deterministic at build time.",
        expectedName: "build_constraint",
      },
      {
        text: "Destructive operations must be forbidden in production.",
        expectedName: "environment_safety_rule",
      },
      {
        text: "User email must be immutable after creation.",
        expectedName: "schema_invariant_rule",
      },
      {
        text: "Derived state must use computed signals.",
        expectedName: "coding_standard_rule",
      },
      {
        text: "Legacy fabricData may only be read as migration input.",
        expectedName: "migration_boundary_rule",
      },
      {
        text: "The pg_graphql extension must be absent.",
        expectedName: "absence_requirement",
      },
      {
        text: "Cloud synchronization must be non-blocking during offline conditions.",
        expectedName: "offline_behavior_rule",
      },
      {
        text: "iOS builds must pass configuration gates before TestFlight distribution.",
        expectedName: "release_gate_rule",
      },
      {
        text: "Premium status must synchronize across iOS, Android, and Web.",
        expectedName: "platform_consistency_rule",
      },
      {
        text: "Soft deletion must preserve annotations when the video is removed.",
        expectedName: "preservation_rule",
      },
    ];

    for (const testCase of cases) {
      const result = await suggest({ text: testCase.text, maxCandidates: 1 });
      const structured = result.structuredContent;
      const candidates = structured.candidates as Array<
        Record<string, unknown>
      >;
      const schema = candidates[0]?.schema as Record<string, unknown>;
      const usageHints = schema.usage_hints as Record<string, string[]>;

      expect(candidates[0]).toMatchObject({
        predicate_name: testCase.expectedName,
      });
      expect(usageHints.use_when[0]).not.toContain(
        "matches this predicate signature",
      );
      expect(usageHints.do_not_use_when[0]).not.toContain(
        "stricter scalar property",
      );
    }
  });

  test("covers broad built-in predicate families from prose cues", async () => {
    const cases = [
      {
        text: "Readonly scrubbing must guard editor annotation behavior.",
        expectedName: "guard",
        expectedArgs: ["editor.annotation", "isReadOnly", "true"],
      },
      {
        text: "Pressing escape must discard active annotation changes without save.",
        expectedName: "discard_action",
        expectedArgs: ["editor.annotation", "escape", "active_annotation"],
      },
      {
        text: "Keyboard navigation must satisfy WCAG accessibility requirements.",
        expectedName: "accessibility_requirement",
        expectedArgs: ["requirement.subject", "WCAG", "required"],
      },
      {
        text: "Customer data must be retained for 7 years.",
        expectedName: "retention_policy",
        expectedArgs: ["customer.data", "7", "years"],
      },
      {
        text: "Search latency must be maximum 200 ms.",
        expectedName: "resource_constraint",
        expectedArgs: ["requirement.subject", "latency", "lte", "200", "ms"],
      },
      {
        text: "The checkout feature flag `checkoutV2` must be disabled.",
        expectedName: "feature_gate",
        expectedArgs: ["requirement.subject", "checkoutV2", "false"],
      },
      {
        text: "Checkout must emit OrderSubmittedEvent when payment succeeds.",
        expectedName: "publishes_event",
        expectedArgs: ["requirement.subject", "OrderSubmittedEvent"],
      },
      {
        text: "Search results must display an empty state acceptance outcome.",
        expectedName: "acceptance_rule",
        expectedArgs: [
          "requirement.subject",
          "search_results_must_display_an_empty_state_acceptance_outcome",
        ],
      },
    ];

    for (const testCase of cases) {
      const result = await suggest({
        text: testCase.text,
        maxCandidates: 1,
      });
      const candidates = result.structuredContent.candidates as Array<
        Record<string, unknown>
      >;

      expect(candidates[0]).toMatchObject({
        predicate_name: testCase.expectedName,
        predicate_args: testCase.expectedArgs,
      });
    }
  });

  test("covers fallback argument inference for built-in predicates", async () => {
    const cases = [
      {
        text: "Users must save profile.",
        expectedName: "commit_action",
        expectedArgs: ["user", "unspecified_trigger", "subject"],
      },
      {
        text: "The form must save on submit for the session.",
        expectedName: "commit_action",
        expectedArgs: ["session", "submit", "session"],
      },
      {
        text: "The workflow must cancel and save the draft.",
        expectedName: "commit_action",
        expectedArgs: ["requirement.subject", "cancel", "draft"],
      },
      {
        text: "Scrubbing must guard editing behavior.",
        expectedName: "guard",
        expectedArgs: ["requirement.subject", "condition", "true"],
      },
      {
        text: "The editor must have no unsaved dirty changes.",
        expectedName: "has_unsaved_changes",
        expectedArgs: ["editor", "false"],
      },
      {
        text: "Screen reader accessibility is required.",
        expectedName: "accessibility_requirement",
        expectedArgs: ["requirement.subject", "accessibility", "required"],
      },
      {
        text: "Records must follow a retention policy for 3 months.",
        expectedName: "retention_policy",
        expectedArgs: ["requirement.subject", "3", "months"],
      },
      {
        text: "Audit logs must be retained for 14 days.",
        expectedName: "retention_policy",
        expectedArgs: ["requirement.subject", "14", "days"],
      },
      {
        text: "Retention policy must exist.",
        expectedName: "retention_policy",
        expectedArgs: ["requirement.subject", "1", "unit"],
      },
      {
        text: "Payload size must be minimum 5 mb.",
        expectedName: "resource_constraint",
        expectedArgs: ["requirement.subject", "size", "gte", "5", "mb"],
      },
      {
        text: "Request timeout must not exceed 30 seconds.",
        expectedName: "resource_constraint",
        expectedArgs: [
          "requirement.subject",
          "timeout",
          "lte",
          "30",
          "seconds",
        ],
      },
      {
        text: "The upload limit must be enforced.",
        expectedName: "resource_constraint",
        expectedArgs: ["requirement.subject", "resource", "lte", "0", "unit"],
      },
      {
        text: "The feature gate must be enabled.",
        expectedName: "feature_gate",
        expectedArgs: ["requirement.subject", "feature_gate", "true"],
      },
      {
        text: "The checkout flow must publish an event.",
        expectedName: "publishes_event",
        expectedArgs: ["requirement.subject", "domain_event"],
      },
    ];

    for (const testCase of cases) {
      const result = await suggest({
        text: testCase.text,
        maxCandidates: 1,
      });
      const candidates = result.structuredContent.candidates as Array<
        Record<string, unknown>
      >;

      expect(candidates[0]).toMatchObject({
        predicate_name: testCase.expectedName,
        predicate_args: testCase.expectedArgs,
      });
    }
  });

  test("uses project-local predicate schemas when Prolog returns predicate_schema facts", async () => {
    const { handleKbSuggestPredicates } = await loadModule();
    let capturedGoal = "";
    const prolog = {
      query: async (goal: string) => {
        capturedGoal = goal;
        return {
          success: true,
          bindings: {
            Results:
              '[[FACT-SCHEMA-CUSTOM,fact,[fact_kind=predicate_schema,predicate_name=custom_policy,title="Custom policy",description="Project-local custom policy.",argument_names=[subject,mode],argument_types=[entity,mode],aliases=[custom],examples=[custom_policy(subject,mode)],tags=[custom,policy],use_when=["Use for project-local custom policy mode claims."],do_not_use_when=["Do not use for built-in retention, state, or rate-limit claims."]]]]',
          },
        };
      },
    };

    const result = await handleKbSuggestPredicates(prolog, {
      text: "The custom policy mode must be enforced.",
      subjectHint: "policy.engine",
      maxCandidates: 1,
    });
    const candidates = result.structuredContent.candidates as Array<
      Record<string, unknown>
    >;

    expect(candidates[0]).toMatchObject({
      predicate_name: "custom_policy",
      predicate_args: ["policy.engine", "mode"],
      schema: expect.objectContaining({
        id: "FACT-SCHEMA-CUSTOM",
        title: "Custom policy",
        argument_names: ["subject", "mode"],
        tags: ["custom", "policy"],
        usage_hints: {
          use_when: ["Use for project-local custom policy mode claims."],
          do_not_use_when: [
            "Do not use for built-in retention, state, or rate-limit claims.",
          ],
        },
      }),
    });
    expect(capturedGoal).toContain("fact_kind=predicate_schema");
  });

  test("reports warnings when existing predicate schemas cannot be loaded", async () => {
    const { handleKbSuggestPredicates } = await loadModule();
    const prolog = {
      query: async () => ({ success: false, error: "boom" }),
    };

    const result = await handleKbSuggestPredicates(prolog, {
      text: "Session timeout must be maximum 30 seconds.",
      maxCandidates: 1,
    });

    expect(result.structuredContent.warnings).toEqual([
      "Existing predicate_schema facts could not be loaded: boom",
    ]);
  });

  test("skips existing schema loading when disabled", async () => {
    const { handleKbSuggestPredicates } = await loadModule();
    let queryCount = 0;
    const prolog = {
      query: async () => {
        queryCount += 1;
        return { success: false, error: "should not be called" };
      },
    };

    const result = await handleKbSuggestPredicates(prolog, {
      text: "Session timeout must be maximum 30 seconds.",
      includeExistingSchemas: false,
      maxCandidates: 1,
    });

    expect(queryCount).toBe(0);
    expect(result.structuredContent.warnings).toEqual([]);
  });
});
