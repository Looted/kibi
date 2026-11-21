---
title: The store lock takeover record shall be .kibi-lock-takeover.json, by a regex proof
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
    - symbol_id: SYM-proof-lock-takeover-file
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-store-lock-takeover-file
  proves:
    - CLAIM-83C6984298F91C31
origin:
  kind: agent
  recorded_at: '2026-10-28T20:44:01.389Z'
id: TEST-proof-lock-takeover-file
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-52b10778c9fd8b982ed0ef5c
    test_id: TEST-proof-lock-takeover-file
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: b7cd3047a7f79432a3e1c1709cbd2935a7105a305a22de36e52fd5e1f58cbcdb
    binding_hash: 2c7151218713fe6f065b3b52a5433b7bf5039f06d5c9f71f51bb9256172473f0
    fingerprint: 59e9efde155dec479718f1eb8d1f12f353e2a7af9ecba46294b1c0574a19d28e
    fingerprint_components:
      contract: b7cd3047a7f79432a3e1c1709cbd2935a7105a305a22de36e52fd5e1f58cbcdb
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
      - symbol_id: SYM-proof-lock-takeover-file
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
      test_id: TEST-proof-lock-takeover-file
      pattern:
        symbol_id: SYM-const-store-lock-takeover-file
        type: string
        value: .kibi-lock-takeover.json
    certificate_digest: 6c4b36158574003a197c33b910771726a8d6bfbee184b0355c086c3aaf5f4f8d
    claim_bindings:
      - claim_key: CLAIM-83C6984298F91C31
        requirement_id: REQ-branch-store-settings
        fact_id: FACT-lock-takeover-file
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kibi-lock-takeover.json
---
Proves that the store lock takeover record shall be .kibi-lock-takeover.json, against the code Kibi reads at ingest.