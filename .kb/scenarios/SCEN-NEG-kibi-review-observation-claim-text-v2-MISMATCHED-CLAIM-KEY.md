---
title: A grounding fact whose claim_key does not match its claim_text is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:08:36.421Z'
id: SCEN-NEG-kibi-review-observation-claim-text-v2-MISMATCHED-CLAIM-KEY
type: scenario
---
Given a stored grounding fact whose claim key was derived from its claim text, when the CLI upsert sends the same fact with an unrelated claim_key, then the write fails with an error saying the claim_key must equal the stable key derived from claim_text, and the stored key stays the derived one.

This is the failure side of deriving claim keys from claim text: a supplied key that names another clause must never be stored. packages/cli/tests/consumer/upsert-review-lanes.test.ts "links a scenario without resending the ledger and records a review observation quoting its claim" exercises it with CLAIM-AAAAAAAAAAAAAAAA.
