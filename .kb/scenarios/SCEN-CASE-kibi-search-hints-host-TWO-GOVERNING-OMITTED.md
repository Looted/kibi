---
title: The third governing requirement is never repeated as a search hint
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:33.840Z'
id: SCEN-CASE-kibi-search-hints-host-TWO-GOVERNING-OMITTED
type: scenario
---
Given a weak kb_search answer with four governing requirements and a provider whose hits include all of them, when the host builds the search hints, then none of the top three governing requirements appears among the hints, so leaving out only the first two would be caught.

This covers the value below the bound of the omission rule, `lt 3` on `omitted_top_governing_requirements`. packages/cli/tests/search-hints.test.ts "only the top three governing requirements are left out, and at most 10 hints show" exercises it: the test asserts the exact hint list, which holds none of REQ-00, REQ-01 and REQ-02.
