---
title: The uncompiled branch store rule shall be branch-store-not-compiled, by a regex proof
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
    - symbol_id: SYM-proof-branch-store-not-compiled-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-branch-store-not-compiled-rule
  proves:
    - CLAIM-EC8F5A3054D07502
origin:
  kind: agent
  recorded_at: '2026-10-28T20:43:36.778Z'
id: TEST-proof-branch-store-not-compiled-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bb3a07ef36d39f026b137343
    test_id: TEST-proof-branch-store-not-compiled-rule
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: b7827d1bf40fd95bf5e5938500aaa9f34fa197d217c32aa8fbf2c3711f49b3d9
    binding_hash: 6109ba25b5fc9a1a358313ec8e3ad0f74ed1124182c680250c0d7c0012e9e4ab
    fingerprint: 66016d2b76177e0c3727d0954ba867aede30b113a654e0f14c6190be6c92792d
    fingerprint_components:
      contract: b7827d1bf40fd95bf5e5938500aaa9f34fa197d217c32aa8fbf2c3711f49b3d9
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
      - symbol_id: SYM-proof-branch-store-not-compiled-rule
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
      test_id: TEST-proof-branch-store-not-compiled-rule
      pattern:
        symbol_id: SYM-const-branch-store-not-compiled-rule
        type: string
        value: branch-store-not-compiled
    certificate_digest: 1d3804982bfb33b306a7fcee092c827724864fdcd40ef0fd5ee13901f22cabd6
    claim_bindings:
      - claim_key: CLAIM-EC8F5A3054D07502
        requirement_id: REQ-branch-store-settings
        fact_id: FACT-branch-store-not-compiled-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: branch-store-not-compiled
---
Proves that the uncompiled branch store rule shall be branch-store-not-compiled, against the code Kibi reads at ingest.