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
---
# Consumer CLI applies a compiled plan in one commit, and the next write or recoveryJournalId finishes or rolls back an interrupted one

Drives `kibi compile-intent` and `kibi apply-plan` through the built `kibi` binary (`packages/cli/tests/consumer/plan-apply-atomic.test.ts`).

- When a file publish fails after earlier files were published, the application leaves nothing half-written; with the obstruction gone the same approved plan applies in full.
- An application that died while publishing is rolled back by the next `kibi upsert`, which reports what it did; recovering the settled journal again changes nothing.
- An application that died after its store commit is completed through `recoveryJournalId`, which refuses and changes nothing while a journaled file was edited by hand.
