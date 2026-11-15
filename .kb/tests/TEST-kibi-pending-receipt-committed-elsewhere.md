---
title: Sync retires a receipt whose file another branch committed, and still fails for a lost file
status: pending
priority: must
tags:
  - branching
  - sync
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-pending-receipt-committed-elsewhere
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: TEST-kibi-pending-receipt-committed-elsewhere
type: test
---
Packed end-to-end test documentation/tests/e2e/packed/pending-receipt-committed-elsewhere.test.ts: in an installed project without hooks it upserts a scenario on develop, commits the file on a new branch without a sync, checks out develop and checks that kibi sync succeeds and retires the receipt; then it commits another scenario on a branch it deletes and checks that sync fails with a missing pending source.