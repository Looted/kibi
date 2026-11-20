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
    receipt_id: PR-70dc7a4e45d1089e79cc9147
    test_id: TEST-ci-proof-shards-join
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 45f37a96bffac3513ad944ad2c2e51f408dc8335eb21aee653eec907e676d8c8
    binding_hash: b0d991a193cee05678fc001ba622003bfcf8f0b49b060a63a5b3a0d87790e4be
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