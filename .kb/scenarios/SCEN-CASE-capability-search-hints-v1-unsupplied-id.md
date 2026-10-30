---
title: A search hints result naming an unsupplied entity id is rejected
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:54:14.411Z'
id: SCEN-CASE-capability-search-hints-v1-unsupplied-id
type: scenario
---
Given the host supplied REQ-a and REQ-b, when a search hints provider returns a hint for REQ-x, then result validation rejects it with INVALID_CAPABILITY_RESULT and "hints[0].id 'REQ-x' is not a supplied entity"; a result naming REQ-a twice is rejected as a duplicate hint in the same way.

The test case packages/plugin-sdk/tests/search-hints.test.ts "each rejected result says what is wrong with it" exercises it. It covers the value past the bound of unsupplied or repeated hint ids, `gt 0`.