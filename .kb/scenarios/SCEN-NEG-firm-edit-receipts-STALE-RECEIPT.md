---
title: A receipt recorded before the code changed again does not count
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:07.584Z'
id: SCEN-NEG-firm-edit-receipts-STALE-RECEIPT
type: scenario
---
Given a keeps receipt for a symbol, when the symbol's code changes after the receipt, then the receipt reports code-changed instead of matching, so an old review cannot cover a newer edit. packages/agent-core/tests/firm-edit-review.test.ts exercises it.