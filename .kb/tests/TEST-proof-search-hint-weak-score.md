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
    receipt_id: PR-3b008e6c01a6631f48bf9c01
    test_id: TEST-proof-search-hint-weak-score
    scope: unit
    outcome: passed
    code_snapshot: a0d30bff4003b1581432022006ec79ddf671dff094f79ab8d577e6b22a3a870c
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-24T11:18:31.879Z'
    finished_at: '2026-11-24T11:18:31.984Z'
    artifact_digest: 8b17f8d2259d7eec49f645fb1e5bb243bba7b1ca2b06371af93fcd2a8c639366
    contract_hash: 3ebf2cf92fcc774c6ae1de39cdc235def5607e0d6dd8134a19e4501a99337b51
    binding_hash: 1cadfe255d45c0c9adabbd3cfd190b935a53918d6fee40f488313eddcd2f9085
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