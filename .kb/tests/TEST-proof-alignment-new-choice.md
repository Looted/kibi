---
title: An aligner asking for a new key shall answer new_subject, by a regex proof
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
    - symbol_id: SYM-proof-alignment-new-choice
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-new-subject-choice
  proves:
    - CLAIM-63A2B31CFFA715AD
origin:
  kind: agent
  recorded_at: '2026-10-29T16:55:59.035Z'
id: TEST-proof-alignment-new-choice
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7e95648733e6a7e0c0322e35
    test_id: TEST-proof-alignment-new-choice
    scope: unit
    outcome: passed
    code_snapshot: 4015792e45e163c9ef221115c30a79374921664a5f8d7ef4db0f94d2f35e6043
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:58:43.165Z'
    finished_at: '2026-10-29T16:58:43.327Z'
    artifact_digest: d1aee7f990edff889eef0c91633bfe5a7379ce9c9fb76855345892913f2aa358
    contract_hash: 5e72c094b9ab91efb949f357a794f6d17614d8f397278c9c62822c9a08d4fe5c
    binding_hash: 00ffa890238cf7a7b21384c615581e24990e786328811b2f2154c9c280d9ec08
    fingerprint: 5253c56f72c3bcc8d99a7b25333b42b928abc6ca6466ae0860fdaee201de77b7
    fingerprint_components:
      contract: 5e72c094b9ab91efb949f357a794f6d17614d8f397278c9c62822c9a08d4fe5c
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
      - symbol_id: SYM-proof-alignment-new-choice
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
      test_id: TEST-proof-alignment-new-choice
      pattern:
        symbol_id: SYM-const-new-subject-choice
        type: string
        value: new_subject
    certificate_digest: 8851c1a48c0767ee1b4e31f2b2f408a8950ae17918979e1e83eff410235a4134
    claim_bindings:
      - claim_key: CLAIM-63A2B31CFFA715AD
        requirement_id: REQ-kibi-vocabulary-alignment-limits
        fact_id: FACT-alignment-new-choice
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: new_subject
---
Proves that an aligner asking for a new key shall answer new_subject, against the code Kibi reads at ingest.