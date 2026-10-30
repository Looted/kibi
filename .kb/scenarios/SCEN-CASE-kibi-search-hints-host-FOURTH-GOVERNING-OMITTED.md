---
title: A fourth governing requirement is not left out of the search hints
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:22.954Z'
id: SCEN-CASE-kibi-search-hints-host-FOURTH-GOVERNING-OMITTED
type: scenario
---
Given a weak kb_search answer with four governing requirements and a provider whose hits include all four, when the host builds the search hints, then only the top three governing requirements are left out and the fourth is still shown as a hint.

This covers the value past the bound of the omission rule, `gt 3` on `omitted_top_governing_requirements`. packages/cli/tests/search-hints.test.ts "only the top three governing requirements are left out, and at most 10 hints show" exercises it: four governing ids are passed and the test asserts that REQ-03, the fourth, heads the shown hints.
