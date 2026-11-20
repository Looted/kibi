---
title: The delivered status migration action id shall be req-status-delivered-map, by a regex proof
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
    - symbol_id: SYM-proof-delivered-map-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-REQ_STATUS_DELIVERED_MAP_ACTION_ID
  proves:
    - CLAIM-5442759934022E88
origin:
  kind: agent
  recorded_at: '2026-10-28T17:42:35.432Z'
id: TEST-proof-delivered-map-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a40fa83fa5bd72a040f1315d
    test_id: TEST-proof-delivered-map-action
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 38b1e7c9b864198aa6d332e12dbd99f9ad5841edae8e9f5c85a993b676afabb1
    binding_hash: 926ad31dd31175135aa177e9ed84910ace4867ee41e35fcbe94cc2291b9cb744
    fingerprint: 1b9ced6f0bf31c3ef05996159520643249c47ae96c0e44ab634ac3ddcf49ed5f
    fingerprint_components:
      contract: 38b1e7c9b864198aa6d332e12dbd99f9ad5841edae8e9f5c85a993b676afabb1
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
      - symbol_id: SYM-proof-delivered-map-action
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
      test_id: TEST-proof-delivered-map-action
      pattern:
        symbol_id: SYM-schema6-REQ_STATUS_DELIVERED_MAP_ACTION_ID
        type: string
        value: req-status-delivered-map
    certificate_digest: 495be54c9b5ab0fd49f36cb08ad185ea2734d9436dada55a874a9317ed64ac67
    claim_bindings:
      - claim_key: CLAIM-5442759934022E88
        requirement_id: REQ-cli-migration-action-codes
        fact_id: FACT-delivered-map-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: req-status-delivered-map
---
Proves that the delivered status migration action id shall be req-status-delivered-map, against the code Kibi reads at ingest.