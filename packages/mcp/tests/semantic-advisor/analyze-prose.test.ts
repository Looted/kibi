import { describe, expect, test } from "bun:test";
import {
  SEMANTIC_ADVISOR_VERSION,
  analyzeSemanticAdvisorInput,
  semanticClaimKey,
} from "kibi-cli/operations/semantic-advisor/analyze-prose";

describe("semantic advisor prose analysis", () => {
  test("tracks every caller-supplied atomic clause with a stable logic claim key", () => {
    const clauses = [
      "Checkout requires payment authorization before order submission.",
      "Customer data must be retained for 7 years.",
    ];
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-COMPOUND",
        properties: {
          title: "Checkout and retention",
          status: "open",
          source: "docs/requirements/compound.md",
          text_ref: clauses.join(" "),
        },
      },
      clauses,
    });

    expect(result.receipt.clauses).toHaveLength(2);
    expect(result.receipt.clauses.map((clause) => clause.claim_key)).toEqual(
      clauses.map(semanticClaimKey),
    );
    expect(result.receipt.suggestions.map((entry) => entry.kind)).toEqual([
      "predicate",
      "strict_property",
    ]);
    expect(result.receipt.logic_coverage).toMatchObject({
      status: "unverified",
      expected_claim_keys: clauses.map(semanticClaimKey),
      missing_claim_keys: clauses.map(semanticClaimKey),
    });
    for (const suggestion of result.receipt.suggestions) {
      expect(suggestion.applyPlan).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "fact",
            properties: expect.objectContaining({
              claim_key: suggestion.claim_key,
              claim_text: suggestion.claim_text,
            }),
          }),
        ]),
      );
    }
    const predicateSuggestion = result.receipt.suggestions[0];
    expect(
      predicateSuggestion?.kind === "predicate"
        ? predicateSuggestion.relationshipPlan
        : null,
    ).toMatchObject({ logicClaims: clauses.map(semanticClaimKey) });
    expect(result.receipt.suggestions[1]?.applyPlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "req",
          properties: expect.objectContaining({
            logic_claims: clauses.map(semanticClaimKey),
          }),
        }),
      ]),
    );
  });

  test("keeps an unmatched normative clause unresolved without inventing a catch-all predicate", () => {
    const text =
      "Backups must follow the organization's moonshot protocol during recovery.";
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-MOONSHOT-RECOVERY",
        properties: {
          title: "Moonshot recovery protocol",
          status: "open",
          source: "docs/requirements/recovery.md",
          text_ref: text,
        },
      },
      clauses: [text],
    });

    const clause = result.receipt.clauses[0];
    expect(clause).toBeDefined();
    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "ontology_gap",
      claim_key: clause?.claim_key,
      claim_text: clause?.text,
      recommendedPredicateSchema: null,
      applyPlan: [
        expect.objectContaining({
          relationships: [
            expect.objectContaining({
              type: "relates_to",
              to: "review:ontology-gap",
            }),
          ],
        }),
      ],
    });
    expect(result.receipt.logic_coverage).toMatchObject({
      status: "unverified",
      unresolved_claim_keys: [clause?.claim_key],
    });
  });

  test("flags cardinality prose with ambiguity witness and strict-property route", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSIONS",
        properties: {
          title: "Limit active sessions",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref: "Users may have at most two active sessions.",
        },
      },
    });

    expect(result.receipt.version).toBe(SEMANTIC_ADVISOR_VERSION);
    expect(result.receipt.candidate_lane).toBe("strict_property");
    expect(result.receipt.logic_readiness).toBe("needs_modeling");
    expect(result.receipt.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "numeric_cardinality" }),
        expect.objectContaining({ kind: "normative_modal" }),
      ]),
    );
    expect(result.receipt.ambiguity_witnesses[0]).toMatchObject({
      signal_kind: "numeric_cardinality",
      interpretations: expect.arrayContaining([
        "exactly",
        "at_most",
        "at_least",
      ]),
    });
    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "strict_property",
      confidence: expect.any(Number),
      evidence: "at most two",
      claim: {
        subject_key: "user.session",
        property_key: "active_count",
        operator: "lte",
        value_type: "int",
        value_int: 2,
      },
      suggested_next_tool: "kb_model_requirement",
    });
    expect(result.receipt.suggestions[0]?.applyPlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "fact" }),
        expect.objectContaining({ type: "req" }),
      ]),
    );
    expect(result.warnings.join("\n")).toContain("kb_model_requirement");
  });

  test("routes permission and conditional prose toward predicate modeling", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-COACH-ACCESS",
        properties: {
          title: "Only instructors can access coach features",
          status: "open",
          source: "docs/requirements/coach-access.md",
          text_ref:
            "Only instructors can access coach-specific features when assigned to the video.",
        },
      },
    });

    expect(result.receipt.candidate_lane).toBe("predicate");
    expect(result.receipt.suggested_next_tools).toContain(
      "kb_suggest_predicates",
    );
    expect(result.receipt.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "permission" }),
        expect.objectContaining({ kind: "conditional" }),
      ]),
    );
    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "permission_rule",
        predicate_args: [
          "instructor",
          "access",
          "coach_specific_features",
          "assert",
        ],
      },
      suggested_next_tool: "kb_suggest_predicates",
    });
  });

  test("suggests retention strict property claims with duration units", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-RETENTION",
        properties: {
          title: "Retain customer data",
          status: "open",
          source: "docs/requirements/retention.md",
          text_ref: "Customer data must be retained for 7 years.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "strict_property",
      claim: {
        subject_key: "customer.data",
        property_key: "retention_years",
        operator: "eq",
        value_type: "int",
        value_int: 7,
        unit: "years",
      },
    });
  });

  test("suggests cap-at strict property claims", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-REVIEW-CAP",
        properties: {
          title: "Review cap",
          status: "open",
          source: "docs/requirements/review.md",
          text_ref: "Review non-writing rounds cap at level 4.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "strict_property",
      claim: {
        subject_key: "review.non.writing.round",
        property_key: "level_cap",
        operator: "lte",
        value_type: "int",
        value_int: 4,
      },
    });
  });

  test("suggests enum set strict property claims for allowed states", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-AUTH-STATES",
        properties: {
          title: "Auth status states",
          status: "open",
          source: "docs/requirements/auth.md",
          text_ref:
            "Auth status must be one of ready, anonymous, or profile-error.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "strict_property",
      claim: {
        subject_key: "auth.status",
        property_key: "allowed_values",
        operator: "eq",
        value_type: "string",
        value_string: "ready|anonymous|profile-error",
      },
    });
  });

  test("suggests numeric threshold claims with units", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-LATENCY",
        properties: {
          title: "Search latency",
          status: "open",
          source: "docs/requirements/search.md",
          text_ref: "Search results must return within 200 ms.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "strict_property",
      claim: {
        subject_key: "search.results",
        property_key: "latency_ms",
        operator: "lte",
        value_type: "int",
        value_int: 200,
        unit: "ms",
      },
    });
  });

  test("suggests boolean strict property claims", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-FEATURE-FLAG",
        properties: {
          title: "Checkout v2 enabled",
          status: "open",
          source: "docs/requirements/checkout.md",
          text_ref: "Checkout v2 must be enabled.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "strict_property",
      claim: {
        subject_key: "checkout.v2",
        property_key: "enabled",
        operator: "eq",
        value_type: "bool",
        value_bool: true,
      },
    });
  });

  test("suggests default value predicates", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-TOOL-DEFAULT",
        properties: {
          title: "Default annotation tool",
          status: "open",
          source: "docs/requirements/editor.md",
          text_ref: "The annotation tool defaults to move mode.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "default_value",
        predicate_args: ["annotation.tool", "mode", "move"],
      },
    });
  });

  test("suggests uniqueness predicates", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-UNIQUE-ANNOTATION",
        properties: {
          title: "Unique annotation time key",
          status: "open",
          source: "docs/requirements/annotations.md",
          text_ref:
            "There must be at most one annotation per video per timeKey.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "uniqueness_constraint",
        predicate_args: ["annotation", "video,timeKey"],
      },
    });
  });

  test("suggests state membership predicates", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-AUTH-TERMINAL-STATES",
        properties: {
          title: "Auth terminal states",
          status: "open",
          source: "docs/requirements/auth.md",
          text_ref:
            "Auth status terminal states are ready, anonymous, and profile-error.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "state_membership",
        predicate_args: ["auth.status", "ready,anonymous,profile-error"],
      },
    });
  });

  test("returns multiple suggestions for multi-claim prose", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSIONS-MULTI",
        properties: {
          title: "Session limits",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref:
            "Users may have at most two active sessions and sessions expire after 30 days.",
        },
      },
    });

    expect(result.receipt.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "strict_property",
          claim: expect.objectContaining({
            subject_key: "user.session",
            property_key: "active_count",
            operator: "lte",
            value_int: 2,
          }),
        }),
        expect.objectContaining({
          kind: "strict_property",
          claim: expect.objectContaining({
            subject_key: "session",
            property_key: "expiry_days",
            operator: "eq",
            value_int: 30,
            unit: "days",
          }),
        }),
      ]),
    );
  });

  test("suggests temporal ordering predicates", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SAVE-BEFORE-NAVIGATE",
        properties: {
          title: "Save before navigation",
          status: "open",
          source: "docs/requirements/editor.md",
          text_ref: "Draft changes must be saved before navigation completes.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "temporal_order",
        predicate_args: ["draft.changes", "saved", "navigation_completes"],
      },
    });
  });

  test("suggests conditional behavior predicates", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-TAINT-FAILED-CARD",
        properties: {
          title: "Failed card tainting",
          status: "open",
          source: "docs/requirements/cards.md",
          text_ref:
            "If a card fails during a non-practice session, it becomes tainted.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "conditional_behavior",
        predicate_args: [
          "card",
          "fails_during_non-practice_session",
          "becomes_tainted",
        ],
      },
    });
  });

  test("suggests state transition predicates", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-EDITOR-IDLE",
        properties: {
          title: "Editor returns to idle",
          status: "open",
          source: "docs/requirements/editor.md",
          text_ref:
            "When navigation completes, the editor transitions from draft to idle.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "state_transition",
        predicate_args: ["editor", "draft", "idle", "navigation_completes"],
      },
    });
  });

  test("suggests prohibition predicates with deny polarity", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-GUEST-EXPORT",
        properties: {
          title: "Guests cannot export data",
          status: "open",
          source: "docs/requirements/export.md",
          text_ref: "Guests must not export customer data.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "permission_rule",
        predicate_args: ["guest", "export", "customer_data", "deny"],
        polarity: "deny",
      },
    });
  });

  test("suggests comparative numeric constraints", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-REVIEW-CAP",
        properties: {
          title: "Review cap",
          status: "open",
          source: "docs/requirements/review.md",
          text_ref: "Review level must be less than 5.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "strict_property",
      claim: {
        subject_key: "review.level",
        property_key: "value",
        operator: "lt",
        value_type: "int",
        value_int: 5,
      },
    });
  });

  test("suggests ambiguity observation when cardinality lacks an operator", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-AMBIGUOUS-SESSIONS",
        properties: {
          title: "Active sessions",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref: "Users may have two active sessions.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "ambiguity_observation",
      evidence: "two active sessions",
      ambiguity: expect.arrayContaining(["exactly", "at_most", "at_least"]),
      applyPlan: [
        expect.objectContaining({
          relationships: [
            expect.objectContaining({
              type: "relates_to",
              to: "review:ambiguous-claim",
            }),
          ],
        }),
      ],
    });
  });

  test("suggests rate-limit predicates for bounded action windows", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-RATE-LIMIT",
        properties: {
          title: "Rate limit password reset",
          status: "open",
          source: "docs/requirements/auth.md",
          text_ref:
            "Password reset requests must be rate limited to 5 attempts per hour.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "rate_limit",
        predicate_args: ["password_reset.request", "attempts", "hour", "5"],
      },
    });
  });

  test("suggests exception predicates for unless clauses", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-NOTIFICATION-EXCEPTION",
        properties: {
          title: "Notification opt-out exception",
          status: "open",
          source: "docs/requirements/notifications.md",
          text_ref:
            "The notification service must send email unless the user has opted out.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "exception_rule",
        predicate_args: [
          "notification.service",
          "send_email",
          "user_has_opted_out",
        ],
      },
    });
  });

  test("suggests mutual-exclusion predicates for exclusive modes", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-MUTUALLY-EXCLUSIVE-MODES",
        properties: {
          title: "Practice and exam modes cannot overlap",
          status: "open",
          source: "docs/requirements/modes.md",
          text_ref: "Practice mode and exam mode must be mutually exclusive.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "mutual_exclusion",
        predicate_args: ["practice_mode", "exam_mode"],
      },
    });
  });

  test("suggests idempotency predicates for idempotency-key requirements", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-PAYMENT-IDEMPOTENCY",
        properties: {
          title: "Payment capture idempotency",
          status: "open",
          source: "docs/requirements/payments.md",
          text_ref:
            "Payment capture requests must be idempotent by idempotency key.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "idempotency_rule",
        predicate_args: ["payment_capture_requests", "idempotency_key"],
      },
    });
  });

  test("suggests data residency predicates for regional storage requirements", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-EU-DATA-RESIDENCY",
        properties: {
          title: "EU data residency",
          status: "open",
          source: "docs/requirements/privacy.md",
          text_ref: "EU customer data must be stored in the EU region.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "data_residency_rule",
        predicate_args: ["eu_customer_data", "eu_region"],
      },
    });
  });

  test("suggests audit event predicates for audit-log requirements", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-AUDIT-ACCESS-CHANGES",
        properties: {
          title: "Audit admin access changes",
          status: "open",
          source: "docs/requirements/audit.md",
          text_ref: "Admin access changes must be recorded in the audit log.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "audit_event_rule",
        predicate_args: ["admin_access_changes", "audit_log"],
      },
    });
  });

  test("suggests consent predicates for consent-before-processing requirements", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-MARKETING-CONSENT",
        properties: {
          title: "Marketing email consent",
          status: "open",
          source: "docs/requirements/privacy.md",
          text_ref:
            "Marketing emails must require user consent before processing.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "consent_rule",
        predicate_args: ["marketing_emails", "user_consent", "processing"],
      },
    });
  });

  test("suggests lifecycle predicates for archive/delete timing requirements", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSION-ARCHIVE",
        properties: {
          title: "Archive expired sessions",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref: "Expired sessions must be archived after 30 days.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "lifecycle_rule",
        predicate_args: ["expired_sessions", "archived", "30", "days"],
      },
    });
    expect(result.receipt.candidate_lane).toBe("predicate");
    expect(result.receipt.suggested_next_tools).toEqual([
      "kb_suggest_predicates",
    ]);
  });

  test("suggests conflict-resolution predicates for synchronization conflicts", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-PROFILE-CONFLICTS",
        properties: {
          title: "Resolve profile update conflicts",
          status: "open",
          source: "docs/requirements/sync.md",
          text_ref: "When profile updates conflict, the latest write wins.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "conflict_resolution_rule",
        predicate_args: ["profile_updates", "latest_write_wins"],
      },
    });
  });

  test("suggests fallback predicates for degradation requirements", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-CHECKOUT-FALLBACK",
        properties: {
          title: "Checkout fallback",
          status: "open",
          source: "docs/requirements/checkout.md",
          text_ref:
            "If the payment provider is unavailable, checkout must fall back to manual review.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "fallback_rule",
        predicate_args: [
          "payment_provider_is_unavailable",
          "checkout",
          "manual_review",
        ],
      },
    });
  });

  test("suggests batch operation predicates for bounded bulk processing", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-INVOICE-BATCHES",
        properties: {
          title: "Invoice export batches",
          status: "open",
          source: "docs/requirements/invoices.md",
          text_ref: "Invoice exports must process records in batches of 500.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "batch_operation_rule",
        predicate_args: ["invoice_exports", "records", "500"],
      },
    });
    expect(result.receipt.candidate_lane).toBe("predicate");
    expect(result.receipt.suggested_next_tools).toEqual([
      "kb_suggest_predicates",
    ]);
  });

  test("suggests consistency predicates for reference integrity requirements", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-ORDER-ITEM-CONSISTENCY",
        properties: {
          title: "Order item reference integrity",
          status: "open",
          source: "docs/requirements/orders.md",
          text_ref: "Order items must reference an existing order.",
        },
      },
    });

    expect(result.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "consistency_rule",
        predicate_args: ["order_items", "existing_order"],
      },
    });
    expect(result.receipt.candidate_lane).toBe("predicate");
    expect(result.receipt.suggested_next_tools).toEqual([
      "kb_suggest_predicates",
    ]);
  });

  test("suggests audit-driven product predicate families", () => {
    const cases = [
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
      const result = analyzeSemanticAdvisorInput({
        payload: {
          type: "req",
          id: `REQ-${testCase.expectedName.toUpperCase()}`,
          properties: {
            title: testCase.expectedName,
            status: "open",
            source: "docs/requirements/product-audit.md",
            text_ref: testCase.text,
          },
        },
      });

      expect(result.receipt.suggestions[0]).toMatchObject({
        kind: "predicate",
        predicate: {
          predicate_name: testCase.expectedName,
          predicate_args: testCase.expectedArgs,
        },
      });
      expect(result.receipt.candidate_lane).toBe("predicate");
      expect(result.receipt.suggested_next_tools).toEqual([
        "kb_suggest_predicates",
      ]);
    }
  });

  test("does not classify product usage prose as a coding standard", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-PRODUCT-USAGE",
        properties: {
          title: "Admin MFA",
          status: "open",
          source: "docs/requirements/product.md",
          text_ref: "Users must use MFA before accessing admin settings.",
        },
      },
    });

    expect(result.receipt.suggestions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "predicate",
          predicate: expect.objectContaining({
            predicate_name: "coding_standard_rule",
          }),
        }),
      ]),
    );
  });

  test("does not classify product workflow prerequisites as release gates", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-CHECKOUT-FRAUD",
        properties: {
          title: "Checkout fraud review",
          status: "open",
          source: "docs/requirements/checkout.md",
          text_ref: "Checkout must pass fraud review before payment capture.",
        },
      },
    });

    expect(result.receipt.suggestions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "predicate",
          predicate: expect.objectContaining({
            predicate_name: "release_gate_rule",
          }),
        }),
      ]),
    );
  });

  test("does not classify generic explicit fields as security configuration", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-PROFILE-LABELS",
        properties: {
          title: "Profile labels",
          status: "open",
          source: "docs/requirements/profile.md",
          text_ref: "Profile fields must have explicit display labels.",
        },
      },
    });

    expect(result.receipt.suggestions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "predicate",
          predicate: expect.objectContaining({
            predicate_name: "security_configuration_rule",
          }),
        }),
      ]),
    );
  });

  test("suggests product-audit phrase variants with existing predicate families", () => {
    const cases = [
      {
        id: "NO-IDENTITY",
        text: "No user identity on public pages.",
        expectedName: "absence_requirement",
        expectedArgs: ["user_identity_on_public_pages", "absent"],
      },
      {
        id: "DISABLED-UNTIL",
        text: "Analytics and Sentry must stay disabled until users grant consent.",
        expectedName: "guard",
        expectedArgs: ["sentry", "users_grant_consent", "disabled"],
      },
      {
        id: "WHEN-MUST",
        text: "When returned email already exists, the system must prevent silent account duplication.",
        expectedName: "conditional_behavior",
        expectedArgs: [
          "system",
          "returned_email_already_exists",
          "prevent_silent_account_duplication",
        ],
      },
      {
        id: "DEDUPLICATED",
        text: "Profile fetching must be deduplicated to prevent redundant requests during concurrent auth state changes.",
        expectedName: "idempotency_rule",
        expectedArgs: ["profile_fetching", "concurrent_auth_state_changes"],
      },
    ];

    for (const testCase of cases) {
      const result = analyzeSemanticAdvisorInput({
        payload: {
          type: "req",
          id: `REQ-${testCase.id}`,
          properties: {
            title: testCase.id,
            status: "open",
            source: "docs/requirements/product-audit.md",
            text_ref: testCase.text,
          },
        },
      });

      expect(result.receipt.suggestions[0]).toMatchObject({
        kind: "predicate",
        predicate: {
          predicate_name: testCase.expectedName,
          predicate_args: testCase.expectedArgs,
        },
      });
    }
  });

  test("marks already-modeled requirements as checkable", () => {
    const claimKey = semanticClaimKey("Session timeout must equal 30 minutes.");
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-MODELED",
        properties: {
          title: "Session timeout",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref: "Session timeout must equal 30 minutes.",
          logic_claims: [claimKey],
        },
        relationships: [
          { type: "constrains", from: "REQ-MODELED", to: "FACT-SUBJECT" },
          {
            type: "requires_property",
            from: "REQ-MODELED",
            to: "FACT-TIMEOUT",
          },
        ],
      },
    });

    expect(result.receipt.logic_readiness).toBe("modeled");
    expect(result.warnings).toEqual([]);
    expect(result.receipt.suggestions).toEqual([]);
  });

  test("returns not_applicable when payload is non-requirement type", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "fact",
        id: "FACT-EXAMPLE",
        properties: {
          title: "Supporting fact",
          status: "open",
          source: "docs/facts/example.md",
          text_ref: "This captures an observed behavior note.",
        },
      },
    });

    expect(result.receipt.logic_readiness).toBe("not_applicable");
    expect(result.receipt.candidate_lane).toBe("none");
    expect(result.receipt.signals).toEqual([]);
    expect(result.receipt.suggestions).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("returns modeled state for already constrained requirements with no further suggestions", () => {
    const claimKey = semanticClaimKey("Session timeout must equal 30 minutes.");
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-PREMODELED",
        properties: {
          title: "Session timeout",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref: "Session timeout must equal 30 minutes.",
          logic_claims: [claimKey],
        },
        relationships: [
          { type: "constrains", from: "REQ-PREMODELED", to: "FACT-SUBJECT" },
          {
            type: "requires_property",
            from: "REQ-PREMODELED",
            to: "FACT-TIMEOUT",
          },
        ],
      },
    });

    expect(result.receipt.logic_readiness).toBe("modeled");
    expect(result.receipt.candidate_lane).toBe("none");
    expect(result.receipt.suggestions).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("does not warn for non-normative prose", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-BRAND",
        properties: {
          title: "Brand tone",
          status: "open",
          source: "docs/requirements/brand.md",
          text_ref: "The product feels delightful and magical.",
        },
      },
    });

    expect(result.receipt.logic_readiness).toBe("not_applicable");
    expect(result.receipt.candidate_lane).toBe("none");
    expect(result.warnings).toEqual([]);
  });

  test("changes receipt hash when payload changes", () => {
    const first = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSIONS",
        properties: {
          title: "Limit",
          status: "open",
          text_ref: "At most two sessions.",
        },
      },
    });
    const second = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSIONS",
        properties: {
          title: "Limit",
          status: "open",
          text_ref: "At most three sessions.",
        },
      },
    });

    expect(first.receipt.payload_hash).not.toBe(second.receipt.payload_hash);
  });
});
