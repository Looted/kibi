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
    receipt_id: PR-3590fa539ca5154213c5adbd
    test_id: TEST-proof-prove-progress-file
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5c8d3d9f1d9bc191b84c73578bca96e75a8b4ca6b070f547636a9fa98ce371a4
    binding_hash: 6e95b5a09fe8f71495cc5495ca87302330c2661d96494a5fd52f78b448087d5d
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