---
id: TEST-cli-status-pre-first-sync
title: CLI status is valid before first sync in workspace and packed installs
status: passing
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
    - symbol_id: SYM-e2e-cli-status-pre-first-sync
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2d8ba38a40ff083ffa8463a0
    test_id: TEST-cli-status-pre-first-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: acce66b08ddf3396f5b639f0c3310ddcc6d679823780cd04efd25464973d2e6f
    binding_hash: 706545bcf4fb9da68731313728108a6d9b5826e2aed3d45e3b25c8cf89ce9310
    fingerprint: 262225ee99f5d44836326b8bc25e3bb83d45731818e13c914c659f4ae9f49e75
    fingerprint_components:
      contract: acce66b08ddf3396f5b639f0c3310ddcc6d679823780cd04efd25464973d2e6f
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
      - symbol_id: SYM-e2e-cli-status-pre-first-sync
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
The test verifies that the `kibi status` command does not fail when executed in a newly initialized repository before any data has been synced, and that ignored documentation README files do not make a freshly synced workspace stale.

**Coverage:**
- Verified in `packages/cli/tests/commands/status.test.ts`
- Tests pre-first-sync behavior in JSON output
- Tests that documentation `README.md` files are ignored by status freshness checks after sync
- Ensures exit code 0 in both workspace development mode and when executed as a packed binary.
