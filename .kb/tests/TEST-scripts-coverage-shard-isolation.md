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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3726865ba4a9591fc47a8be0
    test_id: TEST-scripts-coverage-shard-isolation
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 5e661405436cf51873e16c3d6e24a5658f3d12f9c2c72990c471e5782e7f0ee6
    binding_hash: 9756e5ea4a2e5b174f2aa53cad04e6c3d13988a6fc2b9f20c666e5f03800f397
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Run `bun test ./scripts/tests/unit-coverage-runner.test.ts`. The contract reads the runner's exported scripts shard and compares it with the recursively discovered test/spec inventory, checks the root summary occurs exactly once after those paths, and checks the process-per-file isolation request. It does not claim that native SWI builds or the full unit coverage campaign succeed.