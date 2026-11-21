---
title: Consumer CLI applies a compiled plan in one commit, and the next write or recoveryJournalId finishes or rolls back an interrupted one
status: passing
priority: must
tags:
  - planning
  - apply-plan
  - atomicity
  - journal
  - recovery
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-plan-apply-atomic-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-plan-apply-atomic-cli
    target: default
    native_id: packages/cli/tests/consumer/plan-apply-atomic.test.ts::atomic compile plan application through the kibi CLI::lands every entity of a compiled plan in one commit and leaves nothing half-written when a file publish fails
    source_file: packages/cli/tests/consumer/plan-apply-atomic.test.ts
    line: 188
origin:
  kind: agent
  recorded_at: '2026-10-04T05:29:26.044Z'
id: TEST-kibi-plan-apply-atomic-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-90483eae40fc168ff41454b4
    test_id: TEST-kibi-plan-apply-atomic-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 65283dfe27d369f3825e098c0189e05ab9c8cd3ccff539e1d3bd1949a6aaf74c
    binding_hash: 434f2c910570f717686a881c02bfb6925adbfcd84457f2aa7c35515e2c2d977d
    fingerprint: 8a21516601dcf5bf2ec586bb671e697e940af19b0ca5bc09965a6184f3931d18
    fingerprint_components:
      contract: 65283dfe27d369f3825e098c0189e05ab9c8cd3ccff539e1d3bd1949a6aaf74c
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: d543f091c1a0f0bb6905b4d23e57599ab4486122adb8502cf7b847e37571b2b6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-plan-apply-atomic-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Consumer CLI applies a compiled plan in one commit, and the next write or recoveryJournalId finishes or rolls back an interrupted one

Drives `kibi compile-intent` and `kibi apply-plan` through the built `kibi` binary (`packages/cli/tests/consumer/plan-apply-atomic.test.ts`).

- When a file publish fails after earlier files were published, the application leaves nothing half-written; with the obstruction gone the same approved plan applies in full.
- An application that died while publishing is rolled back by the next `kibi upsert`, which reports what it did; recovering the settled journal again changes nothing.
- An application that died after its store commit is completed through `recoveryJournalId`, which refuses and changes nothing while a journaled file was edited by hand.
