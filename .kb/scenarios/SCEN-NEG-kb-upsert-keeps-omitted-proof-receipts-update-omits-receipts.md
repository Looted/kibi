---
title: A test update that omits its proof receipts does not drop the stored receipt history
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:49.917Z'
id: SCEN-NEG-kb-upsert-keeps-omitted-proof-receipts-update-omits-receipts
type: scenario
---
Given a test entity with stored proof receipts, verification scope and verification perspective, when kb_upsert validates an update of that test that omits those fields, then the update is accepted without dropping them and the stored receipt history is kept unchanged.

This is the failure side of receipt preservation: an incidental edit to a test must not erase the proof evidence recorded for it. packages/cli/tests/operations/mutation.test.ts "validate-upsert keeps the stored receipt history when an update omits it" exercises it.
