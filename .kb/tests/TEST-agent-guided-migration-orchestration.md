---
id: TEST-agent-guided-migration-orchestration
title: Migration plan hashing, safety gates, and post-apply readback
status: active
created_at: 2026-08-14T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
priority: must
links:
  - type: validates
    target: SCEN-agent-guided-migration-orchestration
  - type: validates
    target: REQ-agent-guided-migration-orchestration
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-agent-guided-migration-orchestration
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cbb8cd41a4fe45f04d01d71d
    test_id: TEST-agent-guided-migration-orchestration
    scope: end_to_end
    outcome: passed
    code_snapshot: 45723d09ccc2f66812136995f1e9ff533e86cd9788676661b6338c4073cf1090
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:56:28.249Z'
    finished_at: '2026-10-28T20:57:48.995Z'
    artifact_digest: c2897be40b87b249e1ed6db078243990c4e4a6933d81b79d6dd5457ecb663f9b
    contract_hash: a95ef7e3f6863462b57beaadbfdea7eef67385f2f5e43dff17d627c6841d4600
    binding_hash: fdf7ae5e13d056b0454825e409dd03bc88901b4bc23617acb4559236db02853f
    fingerprint: 10833314215144e0eec2bd80138dd1ba984dd767735564493d48b7cd7a5300a6
    fingerprint_components:
      contract: a95ef7e3f6863462b57beaadbfdea7eef67385f2f5e43dff17d627c6841d4600
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
      - symbol_id: SYM-e2e-test-agent-guided-migration-orchestration
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
The migration orchestration suite verifies deterministic plan hashes and action
ordering, preview immutability, stale-hash rejection, dependency and safety
boundaries, lazy planning for unreadable stores, backup/audit preservation,
interrupted application outcomes, and final status/check/coverage readback.
