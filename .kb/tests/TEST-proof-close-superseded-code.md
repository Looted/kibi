---
title: The close superseded requirements code shall be close_superseded_requirements, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-close-superseded-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-CLOSE_SUPERSEDED_REQUIREMENTS_CODE
  proves:
    - CLAIM-EB01F6CC06727E39
origin:
  kind: agent
  recorded_at: '2026-10-28T20:26:44.751Z'
id: TEST-proof-close-superseded-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-de0a61ba508eb1fc1a7cecc1
    test_id: TEST-proof-close-superseded-code
    scope: unit
    outcome: passed
    code_snapshot: 9afa255658d83e8294a2a4477e9a1c2905e91f21f6fd19f74373b92404007bd5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:28:50.798Z'
    finished_at: '2026-10-28T20:28:50.919Z'
    artifact_digest: 030e56e5c77ab565d8ab3cb99426b30721c1f5512698b685205e6cde40e42174
    contract_hash: 6ed03999098f1a3fc861c1bb75a06bcdbfe69faca855274afc8554b63bcba7e0
    binding_hash: 25c79ae0df8af401f515775cb8f6fc54110636717570a4ddfa8ac6fca1684c88
    fingerprint: 8be4627a62fff1bd78dedf82d71dd5c8dc85ce5a5996b85b2fc28ba80ea76294
    fingerprint_components:
      contract: 6ed03999098f1a3fc861c1bb75a06bcdbfe69faca855274afc8554b63bcba7e0
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
      - symbol_id: SYM-proof-close-superseded-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-close-superseded-code
      pattern:
        symbol_id: SYM-schema6-check-actions-CLOSE_SUPERSEDED_REQUIREMENTS_CODE
        type: string
        value: close_superseded_requirements
    certificate_digest: 3ede726fcda72452dada459e89069eb3fd934620efe0bcfb886ada9f17008374
    claim_bindings:
      - claim_key: CLAIM-EB01F6CC06727E39
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-close-superseded-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: close_superseded_requirements
---
Proves that the close superseded requirements code shall be close_superseded_requirements, against the code Kibi reads at ingest.