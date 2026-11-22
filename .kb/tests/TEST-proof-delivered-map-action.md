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
    receipt_id: PR-957b3e471edfbdb4a3c71b03
    test_id: TEST-proof-delivered-map-action
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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