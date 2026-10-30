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
    receipt_id: PR-ade059efc54b05db5c43cbf1
    test_id: TEST-proof-lock-takeover-file
    scope: unit
    outcome: passed
    code_snapshot: 6c1d4b48c8c790bbc509e46899ccd457757c7db5641cef07df4b567f347481bf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:45:22.884Z'
    finished_at: '2026-10-28T20:45:22.979Z'
    artifact_digest: 7d95aa867351d5402b286235eabb62ff92d6b044c377fff6177d4c31b28b8666
    contract_hash: b7cd3047a7f79432a3e1c1709cbd2935a7105a305a22de36e52fd5e1f58cbcdb
    binding_hash: 293bf5e566208020888177c5005d16c777c18bebc7f7b34e0290e2d47ffa24aa
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