---
title: KB merge workflow builds the driver from develop and proof-checks merges
status: passing
priority: should
tags:
  - ci
  - merge
  - proof
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-kb-merge-resolution
      target: default
  success_policy: all_required_first_attempt
id: TEST-ci-kb-merge-resolution
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-682ef1b1b0066cacf10226a5
    test_id: TEST-ci-kb-merge-resolution
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 6addbec708ffb861003356ad86179609bf99ef386d16bdc17920fd4a15539d9d
    binding_hash: 82b4b4d63d429f9bc4a26afc810ad6de6bde993ecab53537b93a0221d3b66e63
    fingerprint: e04550c4ea47e4a3e0bc640a0575996e466e5eb6f3c9bd39d7d7de23e7b7144f
    fingerprint_components:
      contract: 6addbec708ffb861003356ad86179609bf99ef386d16bdc17920fd4a15539d9d
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
      - symbol_id: SYM-test-ci-kb-merge-resolution
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
