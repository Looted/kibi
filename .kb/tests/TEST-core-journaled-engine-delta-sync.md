---
id: TEST-core-journaled-engine-delta-sync
title: Delta sync and performance gates
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - sync
  - performance
links:
  - type: validates
    target: SCEN-core-journaled-engine-delta-sync
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-journaled-engine-delta-sync
      target: default
  success_policy: all_required_first_attempt
type: test
---

Contract fixtures cover no-op, one-symbol, relationship-only, deletion,
coordinate-only, and rebuild sync paths through the Node CLI and MCP.
The generated 10,000-symbol/30,000-edge fixture excludes setup from timed
regions and enforces every release gate: warm exact and paginated query p95 at
or below 100 ms; warm search and status p95 at or below 150 ms; ordinary
durable upsert p95 at or below 500 ms; no-op sync at or below 500 ms;
one-symbol sync p95 below one second; cold attach plus index build at or below
three seconds; full sync at or below 30 seconds; and steady-state engine RSS at
or below 512 MiB.
