---
id: TEST-cli-status-pre-first-sync
title: CLI status is valid before first sync in workspace and packed installs
status: active
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
tags:
  - cli
  - status
  - regression
links:
  - type: validates
    target: SCEN-cli-status-pre-first-sync
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-status-pre-first-sync
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-88c0090ed97dd38116a94daf
    test_id: TEST-cli-status-pre-first-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 2e476ed657ad7b705eeaf33f3751f76b60b706a3924226f2dfde0ed1f47cc888
    binding_hash: e884ffa392f4e16c6b255687b111886b7778d5d0fea8b3c7fe10b0f75ca8140f
    fingerprint: 2aec55cc9da691c790d9f3e3c5bacf96e0ebd8e5e385a79bc878c55e9316c594
    fingerprint_components:
      contract: 2e476ed657ad7b705eeaf33f3751f76b60b706a3924226f2dfde0ed1f47cc888
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
      - symbol_id: SYM-e2e-test-cli-status-pre-first-sync
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
The test verifies that the `kibi status` command does not fail when executed in a newly initialized repository before any data has been synced, and that ignored documentation README files do not make a freshly synced workspace stale.

**Coverage:**
- Verified in `packages/cli/tests/commands/status.test.ts`
- Tests pre-first-sync behavior in JSON output
- Tests that documentation `README.md` files are ignored by status freshness checks after sync
- Ensures exit code 0 in both workspace development mode and when executed as a packed binary.
