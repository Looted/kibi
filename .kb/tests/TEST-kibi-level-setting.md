---
title: 'Kibi level setting: where the level is read, its values and default, and who writes it'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-level-setting
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:04.255Z'
id: TEST-kibi-level-setting
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9d9d646b77ef62a9d5ed59cb
    test_id: TEST-kibi-level-setting
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:21:52.366Z'
    finished_at: '2026-11-25T10:21:52.595Z'
    artifact_digest: 492f375998d6b52c2527a2228ff74adb9466e325506e24bb0f93af09c6d81bb1
    contract_hash: 739d3185e4e31e090a423d667380c21d0acc819cd31dd7df4cfa4fb392a04568
    binding_hash: e852647dfdfd5eb1073fc6ea1a0689ec92e32b96bd4875f537b0f1c0d4cf14e3
    fingerprint: 4114682401ddbcd4ffb124aa359ceb94548a13cb44d6dd511f561ac0fb209383
    fingerprint_components:
      contract: 739d3185e4e31e090a423d667380c21d0acc819cd31dd7df4cfa4fb392a04568
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
      - symbol_id: SYM-test-kibi-level-setting
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/agent-core/tests/kibi-level.test.ts` and `packages/cli/tests/kibi-levels/level-setting.test.ts`. They check that the levels are remember and test with test the default, that kibi.level in the root package.json is read and .kb/setup.json is not read beside it, that .kb/setup.json is read without a root package.json, that a value that is not a level is reported and read as test, and that no MCP tool spec or CLI JSON route writes the level.
