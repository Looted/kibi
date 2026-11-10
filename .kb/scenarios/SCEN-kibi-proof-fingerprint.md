---
title: 'A proved Playwright receipt carries the fingerprint, its five components and the environment hash'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-proof-fingerprint
type: scenario
---
Given a packed workspace where kibi prove proves TEST-PACKED-PW through the Playwright producer, when the test is queried, then its one receipt has a 64-hex fingerprint, fingerprint_components naming exactly bindings, command, contract, integration and producer with 64-hex digests, and a 64-hex environment_hash that is not one of the components.

This is the success side of the proof fingerprint. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its producers case, exercises it.
