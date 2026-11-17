---
title: The proof workflow's join refuses shards that do not add up to one full run
status: passing
priority: should
tags:
  - ci
  - proof
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-proof-shards-join
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:29.815Z'
id: TEST-ci-proof-shards-join
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b0467a8026f32755d63d1ddc
    test_id: TEST-ci-proof-shards-join
    scope: end_to_end
    outcome: passed
    code_snapshot: 04a00cd924e941d4cd375895455395bae29e3402014df1a33cc020137430759d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T11:22:49.578Z'
    finished_at: '2026-11-17T11:22:49.979Z'
    artifact_digest: 4789761c42011f6a96356f34a3712cf5305d1ff40830f26a9849ba5cef3d6f37
    contract_hash: 45f37a96bffac3513ad944ad2c2e51f408dc8335eb21aee653eec907e676d8c8
    binding_hash: 5048ef926ffad2cf51e0235f247cd75ce747b7d9902b0dfef0df513a948a9410
    fingerprint: a937caa3fe91c4d45fdd8ad9625aa6e8e781cf61e8d05dd567ee415ce8ad7651
    fingerprint_components:
      contract: 45f37a96bffac3513ad944ad2c2e51f408dc8335eb21aee653eec907e676d8c8
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
      - symbol_id: SYM-test-ci-proof-shards-join
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks ci-proof-shards.ts against real git repositories: a missing, duplicated or miscounted shard, overlapping or extra tests, a test without a passed result, and a change outside the shard's own receipt files each fail the join, and accepted receipts reach the join checkout. Reads proof.yml: the shard matrix runs kibi prove --all --shard K/N and collects its output, and the proof job joins the shards before the evidence-floor gate.