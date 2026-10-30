---
title: Every built-in predicate schema declares valid closed vocabularies
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-closed-vocabularies-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-built-in-predicate-schemas
  proves:
    - CLAIM-17EA6E80A17D81E7
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:47.509Z'
id: TEST-model-predicates-closed-vocabularies-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-95519ece5041fc3377652e77
    test_id: TEST-model-predicates-closed-vocabularies-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: f28722f7660a882a57ee32674c16399e57f709d942764918804ea85d33167119
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-30T12:52:07.210Z'
    finished_at: '2026-10-30T12:52:07.413Z'
    artifact_digest: 056fbdc730d4e9e717f22818f054d6eba8d62e26f254c19590110ee65ef64dda
    contract_hash: b9ebbd0638f2be4b478ed9c2e0c85bf7ace6ee7f8ae3bd4f4c95d6fd48891f44
    binding_hash: 2c03fadcb2095e22af0f9bbd6bb0ac0c84a15eecfea2eb6ba1731053055fbf70
    fingerprint: d9f1c46a1fa13c0ee21e47e7493ed8340df1cebfb86dea5e3f1a00d6ca6c0138
    fingerprint_components:
      contract: b9ebbd0638f2be4b478ed9c2e0c85bf7ace6ee7f8ae3bd4f4c95d6fd48891f44
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-closed-vocabularies-exhaustive
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-model-predicates-closed-vocabularies-exhaustive
      domain:
        symbol_id: SYM-built-in-predicate-schemas
        members:
          - FACT-SCHEMA-STATE
          - FACT-SCHEMA-TRANSITION
          - FACT-SCHEMA-GUARD
          - FACT-SCHEMA-EXCEPTION-RULE
          - FACT-SCHEMA-MUTUAL-EXCLUSION
          - FACT-SCHEMA-DEPENDENCY-RULE
          - FACT-SCHEMA-OWNERSHIP-RULE
          - FACT-SCHEMA-RETRY-POLICY
          - FACT-SCHEMA-ESCALATION-RULE
          - FACT-SCHEMA-AVAILABILITY-SLA
          - FACT-SCHEMA-NOTIFICATION-ROUTE
          - FACT-SCHEMA-IDEMPOTENCY-RULE
          - FACT-SCHEMA-DATA-RESIDENCY-RULE
          - FACT-SCHEMA-AUDIT-EVENT-RULE
          - FACT-SCHEMA-CONSENT-RULE
          - FACT-SCHEMA-LIFECYCLE-RULE
          - FACT-SCHEMA-CONFLICT-RESOLUTION-RULE
          - FACT-SCHEMA-FALLBACK-RULE
          - FACT-SCHEMA-BATCH-OPERATION-RULE
          - FACT-SCHEMA-CONSISTENCY-RULE
          - FACT-SCHEMA-BUILD-CONSTRAINT
          - FACT-SCHEMA-ENVIRONMENT-SAFETY-RULE
          - FACT-SCHEMA-SCHEMA-INVARIANT-RULE
          - FACT-SCHEMA-CODING-STANDARD-RULE
          - FACT-SCHEMA-MIGRATION-BOUNDARY-RULE
          - FACT-SCHEMA-ABSENCE-REQUIREMENT
          - FACT-SCHEMA-OFFLINE-BEHAVIOR-RULE
          - FACT-SCHEMA-RELEASE-GATE-RULE
          - FACT-SCHEMA-PLATFORM-CONSISTENCY-RULE
          - FACT-SCHEMA-PRESERVATION-RULE
          - FACT-SCHEMA-ABSTRACTION-BOUNDARY-RULE
          - FACT-SCHEMA-SECURITY-CONFIGURATION-RULE
          - FACT-SCHEMA-ORDERED-STRATEGY-RULE
          - FACT-SCHEMA-REFRESH-POLICY-RULE
          - FACT-SCHEMA-SCOPED-AUTHORIZATION-RULE
          - FACT-SCHEMA-DOCUMENTATION-STANDARD-RULE
          - FACT-SCHEMA-WARMUP-POLICY-RULE
          - FACT-SCHEMA-VISUAL-LAYOUT-RULE
          - FACT-SCHEMA-ENFORCEMENT-LOCATION-RULE
          - FACT-SCHEMA-RECONCILIATION-RULE
          - FACT-SCHEMA-THROTTLE-POLICY-RULE
          - FACT-SCHEMA-HAS-UNSAVED-CHANGES
          - FACT-SCHEMA-COMMIT-ACTION
          - FACT-SCHEMA-DISCARD-ACTION
          - FACT-SCHEMA-ACCESSIBILITY
          - FACT-SCHEMA-RETENTION-POLICY
          - FACT-SCHEMA-RESOURCE-CONSTRAINT
          - FACT-SCHEMA-DEPENDENCY-RESOLUTION-POLICY
          - FACT-SCHEMA-ORDERED-RESOLUTION-STRATEGY
          - FACT-SCHEMA-RESOLUTION-FAILURE-POLICY
          - FACT-SCHEMA-PROCESS-DELEGATION-CONTRACT
          - FACT-SCHEMA-FAILURE-BEHAVIOR
          - FACT-SCHEMA-FEATURE-GATE
          - FACT-SCHEMA-EVENT-PUBLISH
          - FACT-SCHEMA-ACCEPTANCE-RULE
          - FACT-SCHEMA-PERMISSION-RULE
          - FACT-SCHEMA-DEFAULT-VALUE
          - FACT-SCHEMA-UNIQUENESS-CONSTRAINT
          - FACT-SCHEMA-STATE-MEMBERSHIP
          - FACT-SCHEMA-TEMPORAL-ORDER
          - FACT-SCHEMA-CONDITIONAL-BEHAVIOR
          - FACT-SCHEMA-STATE-TRANSITION
          - FACT-SCHEMA-RATE-LIMIT
          - FACT-SCHEMA-FAIL-CLOSED-AUTHORIZATION-RULE
          - FACT-SCHEMA-DEPLOYMENT-PRECONDITION-RULE
          - FACT-SCHEMA-DATA-MIGRATION-RULE
          - FACT-SCHEMA-DIAGNOSTIC-VISIBILITY-RULE
          - FACT-SCHEMA-MUTATION-AUTHORITY-RULE
          - FACT-SCHEMA-REQUEST-DEDUPLICATION-RULE
          - FACT-SCHEMA-ASYNC-BOUNDARY-RULE
          - FACT-SCHEMA-CANONICAL-IDENTIFIER-RULE
          - FACT-SCHEMA-RESPONSIVE-BREAKPOINT-RULE
          - FACT-SCHEMA-OPERATIONAL-PAUSE-RULE
          - FACT-SCHEMA-UI-PATTERN
          - FACT-SCHEMA-SAME-PATTERN
          - FACT-SCHEMA-PATTERN-MARKER
          - FACT-SCHEMA-UI-CONTAINER
      results:
        - member: FACT-SCHEMA-STATE
          outcome: passed
        - member: FACT-SCHEMA-TRANSITION
          outcome: passed
        - member: FACT-SCHEMA-GUARD
          outcome: passed
        - member: FACT-SCHEMA-EXCEPTION-RULE
          outcome: passed
        - member: FACT-SCHEMA-MUTUAL-EXCLUSION
          outcome: passed
        - member: FACT-SCHEMA-DEPENDENCY-RULE
          outcome: passed
        - member: FACT-SCHEMA-OWNERSHIP-RULE
          outcome: passed
        - member: FACT-SCHEMA-RETRY-POLICY
          outcome: passed
        - member: FACT-SCHEMA-ESCALATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-AVAILABILITY-SLA
          outcome: passed
        - member: FACT-SCHEMA-NOTIFICATION-ROUTE
          outcome: passed
        - member: FACT-SCHEMA-IDEMPOTENCY-RULE
          outcome: passed
        - member: FACT-SCHEMA-DATA-RESIDENCY-RULE
          outcome: passed
        - member: FACT-SCHEMA-AUDIT-EVENT-RULE
          outcome: passed
        - member: FACT-SCHEMA-CONSENT-RULE
          outcome: passed
        - member: FACT-SCHEMA-LIFECYCLE-RULE
          outcome: passed
        - member: FACT-SCHEMA-CONFLICT-RESOLUTION-RULE
          outcome: passed
        - member: FACT-SCHEMA-FALLBACK-RULE
          outcome: passed
        - member: FACT-SCHEMA-BATCH-OPERATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-CONSISTENCY-RULE
          outcome: passed
        - member: FACT-SCHEMA-BUILD-CONSTRAINT
          outcome: passed
        - member: FACT-SCHEMA-ENVIRONMENT-SAFETY-RULE
          outcome: passed
        - member: FACT-SCHEMA-SCHEMA-INVARIANT-RULE
          outcome: passed
        - member: FACT-SCHEMA-CODING-STANDARD-RULE
          outcome: passed
        - member: FACT-SCHEMA-MIGRATION-BOUNDARY-RULE
          outcome: passed
        - member: FACT-SCHEMA-ABSENCE-REQUIREMENT
          outcome: passed
        - member: FACT-SCHEMA-OFFLINE-BEHAVIOR-RULE
          outcome: passed
        - member: FACT-SCHEMA-RELEASE-GATE-RULE
          outcome: passed
        - member: FACT-SCHEMA-PLATFORM-CONSISTENCY-RULE
          outcome: passed
        - member: FACT-SCHEMA-PRESERVATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-ABSTRACTION-BOUNDARY-RULE
          outcome: passed
        - member: FACT-SCHEMA-SECURITY-CONFIGURATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-ORDERED-STRATEGY-RULE
          outcome: passed
        - member: FACT-SCHEMA-REFRESH-POLICY-RULE
          outcome: passed
        - member: FACT-SCHEMA-SCOPED-AUTHORIZATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-DOCUMENTATION-STANDARD-RULE
          outcome: passed
        - member: FACT-SCHEMA-WARMUP-POLICY-RULE
          outcome: passed
        - member: FACT-SCHEMA-VISUAL-LAYOUT-RULE
          outcome: passed
        - member: FACT-SCHEMA-ENFORCEMENT-LOCATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-RECONCILIATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-THROTTLE-POLICY-RULE
          outcome: passed
        - member: FACT-SCHEMA-HAS-UNSAVED-CHANGES
          outcome: passed
        - member: FACT-SCHEMA-COMMIT-ACTION
          outcome: passed
        - member: FACT-SCHEMA-DISCARD-ACTION
          outcome: passed
        - member: FACT-SCHEMA-ACCESSIBILITY
          outcome: passed
        - member: FACT-SCHEMA-RETENTION-POLICY
          outcome: passed
        - member: FACT-SCHEMA-RESOURCE-CONSTRAINT
          outcome: passed
        - member: FACT-SCHEMA-DEPENDENCY-RESOLUTION-POLICY
          outcome: passed
        - member: FACT-SCHEMA-ORDERED-RESOLUTION-STRATEGY
          outcome: passed
        - member: FACT-SCHEMA-RESOLUTION-FAILURE-POLICY
          outcome: passed
        - member: FACT-SCHEMA-PROCESS-DELEGATION-CONTRACT
          outcome: passed
        - member: FACT-SCHEMA-FAILURE-BEHAVIOR
          outcome: passed
        - member: FACT-SCHEMA-FEATURE-GATE
          outcome: passed
        - member: FACT-SCHEMA-EVENT-PUBLISH
          outcome: passed
        - member: FACT-SCHEMA-ACCEPTANCE-RULE
          outcome: passed
        - member: FACT-SCHEMA-PERMISSION-RULE
          outcome: passed
        - member: FACT-SCHEMA-DEFAULT-VALUE
          outcome: passed
        - member: FACT-SCHEMA-UNIQUENESS-CONSTRAINT
          outcome: passed
        - member: FACT-SCHEMA-STATE-MEMBERSHIP
          outcome: passed
        - member: FACT-SCHEMA-TEMPORAL-ORDER
          outcome: passed
        - member: FACT-SCHEMA-CONDITIONAL-BEHAVIOR
          outcome: passed
        - member: FACT-SCHEMA-STATE-TRANSITION
          outcome: passed
        - member: FACT-SCHEMA-RATE-LIMIT
          outcome: passed
        - member: FACT-SCHEMA-FAIL-CLOSED-AUTHORIZATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-DEPLOYMENT-PRECONDITION-RULE
          outcome: passed
        - member: FACT-SCHEMA-DATA-MIGRATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-DIAGNOSTIC-VISIBILITY-RULE
          outcome: passed
        - member: FACT-SCHEMA-MUTATION-AUTHORITY-RULE
          outcome: passed
        - member: FACT-SCHEMA-REQUEST-DEDUPLICATION-RULE
          outcome: passed
        - member: FACT-SCHEMA-ASYNC-BOUNDARY-RULE
          outcome: passed
        - member: FACT-SCHEMA-CANONICAL-IDENTIFIER-RULE
          outcome: passed
        - member: FACT-SCHEMA-RESPONSIVE-BREAKPOINT-RULE
          outcome: passed
        - member: FACT-SCHEMA-OPERATIONAL-PAUSE-RULE
          outcome: passed
        - member: FACT-SCHEMA-UI-PATTERN
          outcome: passed
        - member: FACT-SCHEMA-SAME-PATTERN
          outcome: passed
        - member: FACT-SCHEMA-PATTERN-MARKER
          outcome: passed
        - member: FACT-SCHEMA-UI-CONTAINER
          outcome: passed
    certificate_digest: 9a6110d6c671b1bdc7fa2109adc2ed76a91383d6e02f03f76cf1f0592bb5120c
    claim_bindings:
      - claim_key: CLAIM-17EA6E80A17D81E7
        requirement_id: REQ-model-predicates-closed-vocabularies
        fact_id: FACT-model-predicates-closed-vocabularies-declared
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - FACT-SCHEMA-ABSENCE-REQUIREMENT
            - FACT-SCHEMA-ABSTRACTION-BOUNDARY-RULE
            - FACT-SCHEMA-ACCEPTANCE-RULE
            - FACT-SCHEMA-ACCESSIBILITY
            - FACT-SCHEMA-ASYNC-BOUNDARY-RULE
            - FACT-SCHEMA-AUDIT-EVENT-RULE
            - FACT-SCHEMA-AVAILABILITY-SLA
            - FACT-SCHEMA-BATCH-OPERATION-RULE
            - FACT-SCHEMA-BUILD-CONSTRAINT
            - FACT-SCHEMA-CANONICAL-IDENTIFIER-RULE
            - FACT-SCHEMA-CODING-STANDARD-RULE
            - FACT-SCHEMA-COMMIT-ACTION
            - FACT-SCHEMA-CONDITIONAL-BEHAVIOR
            - FACT-SCHEMA-CONFLICT-RESOLUTION-RULE
            - FACT-SCHEMA-CONSENT-RULE
            - FACT-SCHEMA-CONSISTENCY-RULE
            - FACT-SCHEMA-DATA-MIGRATION-RULE
            - FACT-SCHEMA-DATA-RESIDENCY-RULE
            - FACT-SCHEMA-DEFAULT-VALUE
            - FACT-SCHEMA-DEPENDENCY-RESOLUTION-POLICY
            - FACT-SCHEMA-DEPENDENCY-RULE
            - FACT-SCHEMA-DEPLOYMENT-PRECONDITION-RULE
            - FACT-SCHEMA-DIAGNOSTIC-VISIBILITY-RULE
            - FACT-SCHEMA-DISCARD-ACTION
            - FACT-SCHEMA-DOCUMENTATION-STANDARD-RULE
            - FACT-SCHEMA-ENFORCEMENT-LOCATION-RULE
            - FACT-SCHEMA-ENVIRONMENT-SAFETY-RULE
            - FACT-SCHEMA-ESCALATION-RULE
            - FACT-SCHEMA-EVENT-PUBLISH
            - FACT-SCHEMA-EXCEPTION-RULE
            - FACT-SCHEMA-FAIL-CLOSED-AUTHORIZATION-RULE
            - FACT-SCHEMA-FAILURE-BEHAVIOR
            - FACT-SCHEMA-FALLBACK-RULE
            - FACT-SCHEMA-FEATURE-GATE
            - FACT-SCHEMA-GUARD
            - FACT-SCHEMA-HAS-UNSAVED-CHANGES
            - FACT-SCHEMA-IDEMPOTENCY-RULE
            - FACT-SCHEMA-LIFECYCLE-RULE
            - FACT-SCHEMA-MIGRATION-BOUNDARY-RULE
            - FACT-SCHEMA-MUTATION-AUTHORITY-RULE
            - FACT-SCHEMA-MUTUAL-EXCLUSION
            - FACT-SCHEMA-NOTIFICATION-ROUTE
            - FACT-SCHEMA-OFFLINE-BEHAVIOR-RULE
            - FACT-SCHEMA-OPERATIONAL-PAUSE-RULE
            - FACT-SCHEMA-ORDERED-RESOLUTION-STRATEGY
            - FACT-SCHEMA-ORDERED-STRATEGY-RULE
            - FACT-SCHEMA-OWNERSHIP-RULE
            - FACT-SCHEMA-PATTERN-MARKER
            - FACT-SCHEMA-PERMISSION-RULE
            - FACT-SCHEMA-PLATFORM-CONSISTENCY-RULE
            - FACT-SCHEMA-PRESERVATION-RULE
            - FACT-SCHEMA-PROCESS-DELEGATION-CONTRACT
            - FACT-SCHEMA-RATE-LIMIT
            - FACT-SCHEMA-RECONCILIATION-RULE
            - FACT-SCHEMA-REFRESH-POLICY-RULE
            - FACT-SCHEMA-RELEASE-GATE-RULE
            - FACT-SCHEMA-REQUEST-DEDUPLICATION-RULE
            - FACT-SCHEMA-RESOLUTION-FAILURE-POLICY
            - FACT-SCHEMA-RESOURCE-CONSTRAINT
            - FACT-SCHEMA-RESPONSIVE-BREAKPOINT-RULE
            - FACT-SCHEMA-RETENTION-POLICY
            - FACT-SCHEMA-RETRY-POLICY
            - FACT-SCHEMA-SAME-PATTERN
            - FACT-SCHEMA-SCHEMA-INVARIANT-RULE
            - FACT-SCHEMA-SCOPED-AUTHORIZATION-RULE
            - FACT-SCHEMA-SECURITY-CONFIGURATION-RULE
            - FACT-SCHEMA-STATE
            - FACT-SCHEMA-STATE-MEMBERSHIP
            - FACT-SCHEMA-STATE-TRANSITION
            - FACT-SCHEMA-TEMPORAL-ORDER
            - FACT-SCHEMA-THROTTLE-POLICY-RULE
            - FACT-SCHEMA-TRANSITION
            - FACT-SCHEMA-UI-CONTAINER
            - FACT-SCHEMA-UI-PATTERN
            - FACT-SCHEMA-UNIQUENESS-CONSTRAINT
            - FACT-SCHEMA-VISUAL-LAYOUT-RULE
            - FACT-SCHEMA-WARMUP-POLICY-RULE
---
Checks every member of BUILT_IN_PREDICATE_SCHEMAS: its vocabulary has no errors, each closed argument lists distinct constants that the schema examples use, the binding hint of each unbound closed argument lists exactly those constants as allowedValues, and no open argument lists any; the run leaves an exhaustive certificate over BUILT_IN_PREDICATE_SCHEMAS.