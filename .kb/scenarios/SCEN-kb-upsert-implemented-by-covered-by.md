---
title: implementedBy links each coveredBy test
status: active
expects: success
tags:
  - mutation
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: SCEN-kb-upsert-implemented-by-covered-by
type: scenario
---
Given a requirement write whose implementedBy entry names expireKey in src/keys.ts with coveredBy TEST-key-expiry and TEST-keys, when kb_upsert runs, then the symbol of expireKey gets an implements link to the requirement and one covered_by link to each test, a repeated test id is linked once, and a coveredBy that is not a list of test ids is refused before anything is written.

packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts covers it.