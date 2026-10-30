---
title: A provider offering more than 10 usable hints still gets only 10 shown
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:14.435Z'
id: SCEN-CASE-kibi-search-hints-host-ELEVEN-SHOWN
type: scenario
---
Given a weak kb_search answer and a search hints provider that returns 16 requirement hits, of which more than 10 survive lifting and the governing-requirement filter, when the host builds the search hints, then only the first 10 hints are shown and the 11th and later hits are dropped.

This covers the value past the bound of the hint limit, `gt 10` on `max_shown_hints`. packages/cli/tests/search-hints.test.ts "only the top three governing requirements are left out, and at most 10 hints show" exercises it: the provider offers 16 hits and the test asserts that exactly 10 named hints remain.
