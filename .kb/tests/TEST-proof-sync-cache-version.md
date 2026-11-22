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
    receipt_id: PR-8626e167bf77b4514693178e
    test_id: TEST-proof-sync-cache-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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