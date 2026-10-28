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
    receipt_id: PR-e9a68539932967d88ee1f3ac
    test_id: TEST-proof-sync-cache-ttl
    scope: unit
    outcome: passed
    code_snapshot: 0ef83d98ba69f02638b918a7fb2a5c8745d7e16e758282b2caacd90570abbaff
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:08:07.458Z'
    finished_at: '2026-10-28T19:08:07.620Z'
    artifact_digest: 2bc1090816f1bae2f4ebdcb357ecac4da5963ca0c002808224b6c9bfd9a98dcd
    contract_hash: a9a3fe4ae1792e0cdb0bc2b3b68c47c9e9387f606acd5d6f001efb54a771f723
    binding_hash: e219fecb4908c5ccb7b06d947c89328cb1662a929faa19f67c1e53fe6fb1b659
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