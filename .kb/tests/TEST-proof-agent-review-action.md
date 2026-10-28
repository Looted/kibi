---
title: The unapproved agent requirements review action id shall be review-agent-requirements-unapproved, by a regex proof
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
    - symbol_id: SYM-proof-agent-review-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-AGENT_REQUIREMENTS_REVIEW_ACTION_ID
  proves:
    - CLAIM-466F2FF82989BF7A
origin:
  kind: agent
  recorded_at: '2026-10-28T20:25:41.890Z'
id: TEST-proof-agent-review-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-eaa353498cde99b80efd1fbc
    test_id: TEST-proof-agent-review-action
    scope: unit
    outcome: passed
    code_snapshot: 9afa255658d83e8294a2a4477e9a1c2905e91f21f6fd19f74373b92404007bd5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:28:33.477Z'
    finished_at: '2026-10-28T20:28:33.575Z'
    artifact_digest: 18d042271281ed61e010259d147cb82d8e221e645dc96437078b5d2488c2ab39
    contract_hash: 8a53af9e75e4fbca53ac6281245d1be4445d20ba7efd5116bcbf58651126bca3
    binding_hash: 6ac7f18613bbf0ad7beebb116abdfd9c1de8f8d4725ad895a4327401760b34b2
    fingerprint: 6937fe39cf6912821f3e34650e564ee01efbcec14038332c17543f0b867f73c1
    fingerprint_components:
      contract: 8a53af9e75e4fbca53ac6281245d1be4445d20ba7efd5116bcbf58651126bca3
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
      - symbol_id: SYM-proof-agent-review-action
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
      test_id: TEST-proof-agent-review-action
      pattern:
        symbol_id: SYM-schema6-check-actions-AGENT_REQUIREMENTS_REVIEW_ACTION_ID
        type: string
        value: review-agent-requirements-unapproved
    certificate_digest: 63a506b091096b76b7e114954e348a4df93c014b13d065be071c7b7acca93076
    claim_bindings:
      - claim_key: CLAIM-466F2FF82989BF7A
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-agent-review-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review-agent-requirements-unapproved
---
Proves that the unapproved agent requirements review action id shall be review-agent-requirements-unapproved, against the code Kibi reads at ingest.