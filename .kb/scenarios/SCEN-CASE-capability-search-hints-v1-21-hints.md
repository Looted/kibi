---
title: A search hints result with 21 hints is rejected even when the requested limit is higher
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:54:04.310Z'
id: SCEN-CASE-capability-search-hints-v1-21-hints
type: scenario
---
Given 21 supplied entities and a requested limit of 50, when a search hints provider returns 21 hints, then result validation rejects it with "searchHints returned 21 hints; at most 20 were requested", while the same result cut to 20 hints is accepted.

The test case packages/plugin-sdk/tests/search-hints.test.ts "scores 0 and 1 are valid, ids are trimmed, and the cap is 20" exercises it. It covers the value past the bound of the hint cap, `gt 20`.