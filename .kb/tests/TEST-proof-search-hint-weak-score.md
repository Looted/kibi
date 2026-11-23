---
title: The search hints weak top score is 0.44, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-search-hint-weak-score
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-search-hint-weak-score
  proves:
    - CLAIM-0258F9C5F29FFA38
origin:
  kind: agent
  recorded_at: '2026-10-29T21:28:54.537Z'
id: TEST-proof-search-hint-weak-score
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-19504c460a06a4d2615c8b9c
    test_id: TEST-proof-search-hint-weak-score
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 3ebf2cf92fcc774c6ae1de39cdc235def5607e0d6dd8134a19e4501a99337b51
    binding_hash: 299bf54eaede30a0e85f8750f35bda41b435f8fd029d025ae910a0582b823396
    fingerprint: 2fdb35cf1d7cc874f4ab2f701470639e175430143130cc3c01afb068a97ac0e7
    fingerprint_components:
      contract: 3ebf2cf92fcc774c6ae1de39cdc235def5607e0d6dd8134a19e4501a99337b51
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
      - symbol_id: SYM-proof-search-hint-weak-score
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-search-hint-weak-score
      variable: weak_top_score
      value_type: real
      assumptions:
        - operator: eq
          value: 0.44
      claim:
        operator: eq
        value: 0.44
    certificate_digest: 5c861f88f4d626fe58ea9e65fa3302d30de707290682deb1a96efd35f68c697e
    claim_bindings:
      - claim_key: CLAIM-0258F9C5F29FFA38
        requirement_id: REQ-kibi-search-hints-limits
        fact_id: FACT-search-hint-weak-score-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.44
          value_type: real
          variable: weak_top_score
---
Reads SEARCH_HINT_WEAK_SCORE and proves the search hints weak top score is 0.44.