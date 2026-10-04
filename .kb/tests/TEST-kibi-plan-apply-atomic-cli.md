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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6e6dc10b1bdc57fac3c977f5
    test_id: TEST-kibi-plan-apply-atomic-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: f0fd27d161e0f366d0e4027f08bc1530db0ab8379a4a8d6801b80cf635d125ea
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-04T06:02:30.990Z'
    finished_at: '2026-10-04T06:02:50.911Z'
    artifact_digest: f87025d56fbee72a51293181af10d5de333a8918f8e03ff601a3557d757ca36a
    contract_hash: 65283dfe27d369f3825e098c0189e05ab9c8cd3ccff539e1d3bd1949a6aaf74c
    binding_hash: a83b128865b7bd86fa43a3c53cac23cab0fe5cc0ae6fac89e33b5b03c20bd5ec
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
---
# Consumer CLI applies a compiled plan in one commit, and the next write or recoveryJournalId finishes or rolls back an interrupted one

Drives `kibi compile-intent` and `kibi apply-plan` through the built `kibi` binary (`packages/cli/tests/consumer/plan-apply-atomic.test.ts`).

- When a file publish fails after earlier files were published, the application leaves nothing half-written; with the obstruction gone the same approved plan applies in full.
- An application that died while publishing is rolled back by the next `kibi upsert`, which reports what it did; recovering the settled journal again changes nothing.
- An application that died after its store commit is completed through `recoveryJournalId`, which refuses and changes nothing while a journaled file was edited by hand.
