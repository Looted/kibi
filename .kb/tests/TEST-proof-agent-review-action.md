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
    receipt_id: PR-1ce96c86ffa3d66051f0c089
    test_id: TEST-proof-agent-review-action
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 8a53af9e75e4fbca53ac6281245d1be4445d20ba7efd5116bcbf58651126bca3
    binding_hash: 16ea6640df8e8f6ac31055d216c7a2189890c85ec63585ef8b61473e66cffb0b
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