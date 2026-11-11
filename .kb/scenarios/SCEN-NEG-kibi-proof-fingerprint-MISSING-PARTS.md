---
title: 'A receipt without its environment hash or fingerprint components is refused'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-proof-fingerprint-MISSING-PARTS
type: scenario
---
Given a test document whose receipt lacks environment_hash, or lacks fingerprint_components, when the packed CLI runs kibi sync --validate-only, then it exits nonzero and says the receipt must be a structurally valid kibi.proof-receipt.

This is the failure side of the proof fingerprint. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its producers case, exercises it.
