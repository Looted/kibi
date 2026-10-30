---
title: A requirement upsert that changes the prose without a new ledger is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:18:30.061Z'
id: SCEN-NEG-kibi-upsert-preserves-requirement-semantics-PROSE-CHANGE-WITHOUT-LEDGER
type: scenario
---
Given a bootstrapped requirement with a stored proposition ledger, when kibi upsert sends the same requirement with a new title that changes its prose and no semantic ledger fields, then the write fails with proposition-complete ingestion failed instead of reusing the stored ledger for the new wording.

This is the failure side of keeping the stored ledger on relationship-only updates: the stored ledger may only be reused while the prose is unchanged. packages/cli/tests/consumer/upsert-review-lanes.test.ts "links a scenario without resending the ledger and records a review observation quoting its claim" exercises it.
