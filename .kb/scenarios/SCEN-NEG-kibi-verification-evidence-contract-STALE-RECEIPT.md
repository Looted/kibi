---
title: A receipt made stale by source drift is not accepted as proof
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:19:52.522Z'
id: SCEN-NEG-kibi-verification-evidence-contract-STALE-RECEIPT
type: scenario
---
Given a requirement whose end-to-end test has a current passed receipt that both the CLI and MCP coverage accept, when the test source changes so the proof snapshot moves, then requirement coverage reports the passing end-to-end stage as unresolved and lists the stale_proof_receipt gap instead of counting the old pass.

This is the failure side of fresh verification receipts: a stale receipt must remain a non-proof outcome. documentation/tests/e2e/packed/fresh-verification-receipts.test.ts "fails closed without a receipt, accepts a current pass, and invalidates it after source drift across CLI and MCP" exercises it.
