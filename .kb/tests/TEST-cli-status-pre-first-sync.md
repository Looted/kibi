---
id: TEST-cli-status-pre-first-sync
title: CLI status is valid before first sync in workspace and packed installs
status: active
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
source: documentation/tests/TEST-cli-status-pre-first-sync.md
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
---

The test verifies that the `kibi status` command does not fail when executed in a newly initialized repository before any data has been synced, and that ignored documentation README files do not make a freshly synced workspace stale.

**Coverage:**
- Verified in `packages/cli/tests/commands/status.test.ts`
- Tests pre-first-sync behavior in JSON output
- Tests that documentation `README.md` files are ignored by status freshness checks after sync
- Ensures exit code 0 in both workspace development mode and when executed as a packed binary.
