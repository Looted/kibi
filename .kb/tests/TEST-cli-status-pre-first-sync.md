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
    receipt_id: PR-d20895a4bfe41ef7650f9b47
    test_id: TEST-cli-status-pre-first-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
