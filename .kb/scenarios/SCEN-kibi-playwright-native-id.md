---
title: 'An installed Playwright reporter run proves a test whose binding names the case''s native_id'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-playwright-native-id
type: scenario
---
Given a packed install whose Playwright reporter reports one passing case of tests/e2e/pw.spec.ts in suite greets, and a test whose proof binding names tests/e2e/pw.spec.ts:1:1 › suite › greets, when kibi prove runs it, then the test is proved with one receipt.

## Context

Run by the packed proof maintenance E2E test, which drives the installed reporter the way Playwright calls it.
