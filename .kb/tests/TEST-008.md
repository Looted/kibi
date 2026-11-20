---
id: TEST-008
title: End-to-end init then sync then query then check pipeline passes
status: passing
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - integration
  - e2e
  - cli
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-init-sync-check
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1b9d15b47369f87157797b05
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 4aeddfd893b85de667338165458ac8dfc908d633d6a4117ff137a3fd26d0f919
    binding_hash: 98ea9e6ea2b144175aa2d33954371219e574f1fd09bab1c8e77073dbef820639
    fingerprint: b306bd9de40a1467df2971230e0d6da3dddf85f413772e7f94361ed531556ac1
    fingerprint_components:
      contract: 4aeddfd893b85de667338165458ac8dfc908d633d6a4117ff137a3fd26d0f919
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
      - symbol_id: SYM-e2e-init-sync-check
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Full pipeline in a temp directory:
1. `kibi init` — asserts exit 0
2. Place requirement and scenario markdown files with correct `links`
3. `kibi sync` — asserts exit 0 and entity count > 0
4. `kibi query req --format json` — asserts valid JSON array
5. `kibi check` — asserts exit 0 (coverage satisfied by the seeded scenario)
