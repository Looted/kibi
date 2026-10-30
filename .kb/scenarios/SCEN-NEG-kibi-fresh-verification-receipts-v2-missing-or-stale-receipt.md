---
title: A requirement without a fresh passing receipt is not proved, and source drift invalidates a passing one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:05.395Z'
id: SCEN-NEG-kibi-fresh-verification-receipts-v2-missing-or-stale-receipt
type: scenario
---
Given a requirement whose end-to-end test has no proof receipt, when coverage runs through the packed CLI and MCP, then the requirement is not reported as tested; after a current passing receipt is recorded it is accepted, and once the source drifts that receipt no longer proves the requirement.

This is the failure side of fresh verification receipts: missing or outdated evidence must fail closed instead of carrying an old pass forward. documentation/tests/e2e/packed/fresh-verification-receipts.test.ts "fails closed without a receipt, accepts a current pass, and invalidates it after source drift across CLI and MCP" exercises it.
