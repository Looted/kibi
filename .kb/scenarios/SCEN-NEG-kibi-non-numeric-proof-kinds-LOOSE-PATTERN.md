---
title: A regex certificate whose code pattern accepts more than the fact describes is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:19.509Z'
id: SCEN-NEG-kibi-non-numeric-proof-kinds-LOOSE-PATTERN
type: scenario
---
Given a string fact whose pattern describes anchored invoice numbers and a regex certificate for a code pattern without anchors, when kibi proves the test, then the certificate binding is rejected with a string that is in the code's pattern only, and the receipt stays at tested instead of proved.

This is the failure side of regex language equivalence: a pattern that accepts a different language must never prove the fact. documentation/tests/e2e/packed/non-numeric-proof-kinds.test.ts "proves pattern, state machine and rule claims against the code's own model" exercises it through TEST-INVOICE-NUMBER-LOOSE.
