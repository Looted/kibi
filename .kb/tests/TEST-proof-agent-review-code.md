---
title: The unapproved agent requirements review code shall be review_agent_requirements_unapproved, by a regex proof
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
    - symbol_id: SYM-proof-agent-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-AGENT_REQUIREMENTS_REVIEW_CODE
  proves:
    - CLAIM-B4CE9027C7636ABC
origin:
  kind: agent
  recorded_at: '2026-10-28T20:26:02.413Z'
id: TEST-proof-agent-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7c2a76c3f7b0b925f0cc9e5c
    test_id: TEST-proof-agent-review-code
    scope: unit
    outcome: passed
    code_snapshot: 9afa255658d83e8294a2a4477e9a1c2905e91f21f6fd19f74373b92404007bd5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:28:39.376Z'
    finished_at: '2026-10-28T20:28:39.481Z'
    artifact_digest: 85492a00e0548035c115cfd0a446725b3dcdd28ac3a1d3476b0040a4b8ca5c29
    contract_hash: 9f0036490cd96522821dfa9653a06f41567c4807adb0f58610c27e5d25134bc0
    binding_hash: f71492c107d149f89b898b3879ac76094d596f6e6c964b8d2193a96777f45726
    fingerprint: f62ddf1036393255e1228222d053c534e2d5d6e3171ab1fc50caee862a6363e4
    fingerprint_components:
      contract: 9f0036490cd96522821dfa9653a06f41567c4807adb0f58610c27e5d25134bc0
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
      - symbol_id: SYM-proof-agent-review-code
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
      test_id: TEST-proof-agent-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-AGENT_REQUIREMENTS_REVIEW_CODE
        type: string
        value: review_agent_requirements_unapproved
    certificate_digest: b206bf7fbf7be6e10ad092a6857f46857ac6d131c15a6103d0827fbf0365e956
    claim_bindings:
      - claim_key: CLAIM-B4CE9027C7636ABC
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-agent-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_agent_requirements_unapproved
---
Proves that the unapproved agent requirements review code shall be review_agent_requirements_unapproved, against the code Kibi reads at ingest.