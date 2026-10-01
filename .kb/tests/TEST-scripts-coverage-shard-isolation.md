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
    receipt_id: PR-b3b65e1d681cd21d4d15a481
    test_id: TEST-scripts-coverage-shard-isolation
    scope: end_to_end
    outcome: passed
    code_snapshot: 4276c5fcd2a55b948d36a5b9ebb7760f6eee712d939567d882367a754cdbc8b8
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T11:06:11.094Z'
    finished_at: '2026-09-30T11:06:11.193Z'
    artifact_digest: f17e9aeca4c6a8acedceebad4feb4e2f705b37e67639a8ff082c2c4d55f90dcf
    contract_hash: 5e661405436cf51873e16c3d6e24a5658f3d12f9c2c72990c471e5782e7f0ee6
    binding_hash: 0f4db61f961c7055e5ba3e2f81c8c7fc7b1e282db1d6c51f75402d785682a3b1
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f9ce985870ac92d051f5a34d
    test_id: TEST-scripts-coverage-shard-isolation
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 5e661405436cf51873e16c3d6e24a5658f3d12f9c2c72990c471e5782e7f0ee6
    binding_hash: 036ce2d0e5d8102b63747c4dd511df08c33fad187f9f8e9eecfc05cc0350612a
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-test-scripts-coverage-shard-isolation
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-scripts-coverage-shard-isolation
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0db53f1c759c682e2b3de3f1
    test_id: TEST-scripts-coverage-shard-isolation
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 5e661405436cf51873e16c3d6e24a5658f3d12f9c2c72990c471e5782e7f0ee6
    binding_hash: 036ce2d0e5d8102b63747c4dd511df08c33fad187f9f8e9eecfc05cc0350612a
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
---
Run `bun test ./scripts/tests/unit-coverage-runner.test.ts`. The contract reads the runner's exported scripts shard and compares it with the recursively discovered test/spec inventory, checks the root summary occurs exactly once after those paths, and checks the process-per-file isolation request. It does not claim that native SWI builds or the full unit coverage campaign succeed.