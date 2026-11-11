---
title: 'A malformed proof contract, bindings document or run artifact is refused with its schema error'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-proof-protocol-schemas-ACCEPTED-MALFORMED
type: scenario
---
Given a proof_contract with an unknown success_policy, sync reports "Invalid proof_contract" naming success_policy; given proof_bindings without a target, sync reports "Invalid proof_bindings" naming target; and given an integration whose producer writes an artifact with only a version, kibi prove fails with "invalid kibi.proof-run.v1 artifact" and appends no receipt.

This is the failure side of proof protocol schemas. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its schema rejection case, exercises it.
