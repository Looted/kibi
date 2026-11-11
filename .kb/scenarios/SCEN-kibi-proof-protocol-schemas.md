---
title: 'A test with a schema-valid proof contract and bindings syncs'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-proof-protocol-schemas
type: scenario
---
Given a test document whose proof_contract uses success_policy all_required_first_attempt and whose proof_bindings carry symbol_id and target, when the packed CLI syncs it, then sync exits 0.

This is the success side of proof protocol schemas. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its schema rejection case, exercises it.
