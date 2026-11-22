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
    receipt_id: PR-93fd09d86eae2d7f086db994
    test_id: TEST-proof-agent-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 9f0036490cd96522821dfa9653a06f41567c4807adb0f58610c27e5d25134bc0
    binding_hash: 2e46c8d76f1e98cb86bea7525c6acb369f066313e1810ff0f5c721fa1f644d24
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