---
title: The sync cache version shall be 2, by an arithmetic proof
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
    - symbol_id: SYM-proof-sync-cache-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-sync-cache-version
  proves:
    - CLAIM-BC31FE42DFB2E5A0
origin:
  kind: agent
  recorded_at: '2026-10-28T19:06:01.985Z'
id: TEST-proof-sync-cache-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2c892173e44c812543244668
    test_id: TEST-proof-sync-cache-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 07328b9b41368179981c82fcb66142e885f68816f63bcc550e93ed3be8a403b0
    binding_hash: 748bbb578ee482f47e73264dc5027da3485392ae935a19935664d138dfb7a188
    fingerprint: c54eb02d05727162d8a6a1016b9a14e8be2a45d763d5b114ff8b9943220c921b
    fingerprint_components:
      contract: 07328b9b41368179981c82fcb66142e885f68816f63bcc550e93ed3be8a403b0
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
      - symbol_id: SYM-proof-sync-cache-version
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
      test_id: TEST-proof-sync-cache-version
      variable: cache_version
      value_type: int
      assumptions:
        - operator: eq
          value: 2
      claim:
        operator: eq
        value: 2
    certificate_digest: a1f199b63a106bd257cffadc3c1f28a6548abc4aa418205603e3a3b07744cab3
    claim_bindings:
      - claim_key: CLAIM-BC31FE42DFB2E5A0
        requirement_id: REQ-ingestion-inventory-settings
        fact_id: FACT-sync-cache-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 2
          value_type: int
          variable: cache_version
---
Proves that the sync cache version shall be 2, against the code Kibi reads at ingest.