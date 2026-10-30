---
title: A search hints result with a score outside 0 to 1 is rejected
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:54:24.605Z'
id: SCEN-CASE-capability-search-hints-v1-score-outside-unit
type: scenario
---
Given the host supplied REQ-a and REQ-b, when a search hints provider returns one hint scored 1.01, -0.01, NaN or a string, then result validation rejects it with INVALID_CAPABILITY_RESULT and "hints[0].score must be a number between 0 and 1".

The test case packages/plugin-sdk/tests/search-hints.test.ts "each rejected result says what is wrong with it" exercises it. It covers the value past the bound of hint scores outside the unit interval, `gt 0`.