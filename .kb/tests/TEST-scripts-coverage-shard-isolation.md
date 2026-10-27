---
title: Scripts coverage shard configuration contract
status: passing
tags:
  - coverage
  - testing
  - scripts
  - ci
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-scripts-coverage-shard-isolation
      target: default
  success_policy: all_required_first_attempt
id: TEST-scripts-coverage-shard-isolation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a4387db96bb140d418493132
    test_id: TEST-scripts-coverage-shard-isolation
    scope: end_to_end
    outcome: passed
    code_snapshot: 287d8b7e21fc5ebfe33742e839feb2dd6ab1c5b91349284c293a90ceeeb17a0c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T10:18:09.437Z'
    finished_at: '2026-10-27T10:18:09.582Z'
    artifact_digest: 4a811a22d6bcd6b66886594d09ccae5f45f961b59e9d6134d96c816b46ace029
    contract_hash: 5e661405436cf51873e16c3d6e24a5658f3d12f9c2c72990c471e5782e7f0ee6
    binding_hash: aca7033f5a9406617ce1e74587f0b91c25e818d7df09a391a326bc7645265118
    fingerprint: f89eb0dddea0fa542db441c7a5d3c208daa199cf35258acbf1ec3a8c6164eb11
    fingerprint_components:
      contract: 5e661405436cf51873e16c3d6e24a5658f3d12f9c2c72990c471e5782e7f0ee6
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
      - symbol_id: SYM-test-scripts-coverage-shard-isolation
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
Run `bun test ./scripts/tests/unit-coverage-runner.test.ts`. The contract reads the runner's exported scripts shard and compares it with the recursively discovered test/spec inventory, checks the root summary occurs exactly once after those paths, and checks the process-per-file isolation request. It does not claim that native SWI builds or the full unit coverage campaign succeed.