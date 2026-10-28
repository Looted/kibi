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
    receipt_id: PR-07d893ac1abad814b3128a29
    test_id: TEST-proof-delivered-map-action
    scope: unit
    outcome: passed
    code_snapshot: 6c5b25823ef6cbf009fe70ee8955458c0021056cbc5b1d725647c41af19ef199
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:44:33.524Z'
    finished_at: '2026-10-28T17:44:33.719Z'
    artifact_digest: 48fb5d74085783c3954530dffc7e810dba079a05cd2472749cd862ec66d370f2
    contract_hash: 38b1e7c9b864198aa6d332e12dbd99f9ad5841edae8e9f5c85a993b676afabb1
    binding_hash: c1525ff766dbd32ee6944ff265fc605dc5b9f5d8966444120ee48cd46380ce61
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