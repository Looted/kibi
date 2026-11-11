---
id: TEST-agent-guided-migration-orchestration
title: Migration plan hashing, safety gates, and post-apply readback
status: passing
created_at: 2026-08-14T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
priority: must
links:
  - type: validates
    target: SCEN-agent-guided-migration-orchestration
  - type: validates
    target: REQ-kibi-migration-apply-gate
  - type: validates
    target: REQ-kibi-migration-plan-contract
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
    receipt_id: PR-a090681ab18196ddec0630a8
    test_id: TEST-agent-guided-migration-orchestration
    scope: end_to_end
    outcome: passed
    code_snapshot: 179137a4cc98bad746ede4707d2bddad6bd790d7d9588e4925b753857111ca11
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-10T18:10:20.858Z'
    finished_at: '2026-11-10T18:10:39.559Z'
    artifact_digest: aab168ad750d6f7398beb752839186314c3ab6b57b5021402ba8233a0f76d674
    contract_hash: a95ef7e3f6863462b57beaadbfdea7eef67385f2f5e43dff17d627c6841d4600
    binding_hash: 6c926cc5e20aec0c7d0a244be6332956df9d109c3dfcbee9f83fe17592a51481
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
