---
id: TEST-core-journaled-engine-lifecycle
title: Engine daemon serialization, recovery, and protocol fencing
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - engine
  - lifecycle
links:
  - type: validates
    target: SCEN-core-journaled-engine-lifecycle
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-journaled-engine-lifecycle
      target: default
  success_policy: all_required_first_attempt
type: test
---

The daemon suite starts simultaneous clients, verifies one socket and ordered
requests, exercises disconnects and stop/restart recovery, checks branch
isolation and protocol/workspace mismatch errors, and reports an actionable
failure when the configured Node host is unavailable.
