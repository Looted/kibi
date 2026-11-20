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
    receipt_id: PR-d586be2f4a68c61b4a582f65
    test_id: TEST-proof-alignment-new-choice
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5e72c094b9ab91efb949f357a794f6d17614d8f397278c9c62822c9a08d4fe5c
    binding_hash: c15159d003eeb5c3fa07c4bcbbafc0600665c65efd518dbcc04264895683d3f3
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