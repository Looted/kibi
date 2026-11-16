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
    receipt_id: PR-479c336254c7d133dd411b28
    test_id: TEST-proof-search-hint-weak-score
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:24:56.621Z'
    finished_at: '2026-11-16T12:25:00.016Z'
    artifact_digest: 6c8634cac1ce07fa01e37c527df2e2aafcfd220a3eaa232c0bcaf50a6332fd27
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