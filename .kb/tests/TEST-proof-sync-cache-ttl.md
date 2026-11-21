---
title: A sync cache entry shall live at most 2592000000 milliseconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-sync-cache-ttl
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-sync-cache-ttl
  proves:
    - CLAIM-656E6AB2DED99BD6
origin:
  kind: agent
  recorded_at: '2026-10-28T19:06:19.627Z'
id: TEST-proof-sync-cache-ttl
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-75a31377e7dc5f3010d9bb4a
    test_id: TEST-proof-sync-cache-ttl
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: a9a3fe4ae1792e0cdb0bc2b3b68c47c9e9387f606acd5d6f001efb54a771f723
    binding_hash: 6bc11cbec70bc31299fda44cb3154ea31a998c61a53203185978439303372a2b
    fingerprint: fc3b7e0604e3bcda0a5ac94d34688ce6f87bbe8418d149340528f19701c4d9be
    fingerprint_components:
      contract: a9a3fe4ae1792e0cdb0bc2b3b68c47c9e9387f606acd5d6f001efb54a771f723
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
      - symbol_id: SYM-proof-sync-cache-ttl
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
      test_id: TEST-proof-sync-cache-ttl
      variable: cache_ttl_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 2592000000
      claim:
        operator: eq
        value: 2592000000
    certificate_digest: 294ad909654e7d40c5974320815b58c77d7390228faa09f1c9f848fc4f6a1956
    claim_bindings:
      - claim_key: CLAIM-656E6AB2DED99BD6
        requirement_id: REQ-ingestion-inventory-settings
        fact_id: FACT-sync-cache-ttl
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 2592000000
          value_type: int
          variable: cache_ttl_ms
---
Proves that a sync cache entry shall live at most 2592000000 milliseconds, against the code Kibi reads at ingest.