---
title: The prove progress file shall be prove-progress.json, by a regex proof
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
    - symbol_id: SYM-proof-prove-progress-file
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-prove-progress-file
  proves:
    - CLAIM-AE741E93C98A613D
origin:
  kind: agent
  recorded_at: '2026-10-28T21:20:16.365Z'
id: TEST-proof-prove-progress-file
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e5b3389a655824eab6be839a
    test_id: TEST-proof-prove-progress-file
    scope: unit
    outcome: passed
    code_snapshot: 92602f270b7e88628c8037c45b6dfb5e60e0a0c0cc654a810f9bc19c706cde7c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:22:35.753Z'
    finished_at: '2026-10-28T21:22:35.938Z'
    artifact_digest: ab25d26f15cd6d71a3d95e1e723cf0d0d9f4ec37718aa55a3008d33c5de5ee00
    contract_hash: 5c8d3d9f1d9bc191b84c73578bca96e75a8b4ca6b070f547636a9fa98ce371a4
    binding_hash: 3ac4931641385dd85859931a682f0237a565ae65c23cae73ce268b03c9bd17e0
    fingerprint: a28f9edf698477ec4fea757f16dd11b0bb38865f37a91449352666cf53d63a30
    fingerprint_components:
      contract: 5c8d3d9f1d9bc191b84c73578bca96e75a8b4ca6b070f547636a9fa98ce371a4
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
      - symbol_id: SYM-proof-prove-progress-file
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
      test_id: TEST-proof-prove-progress-file
      pattern:
        symbol_id: SYM-const-prove-progress-file
        type: string
        value: prove-progress.json
    certificate_digest: 09341a4715e75aa9ad2fd6878eaab544119204511785947e47f30a3ecc6d538b
    claim_bindings:
      - claim_key: CLAIM-AE741E93C98A613D
        requirement_id: REQ-kibi-proof-receipt-format
        fact_id: FACT-prove-progress-file
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: prove-progress.json
---
Proves that the prove progress file shall be prove-progress.json, against the code Kibi reads at ingest.