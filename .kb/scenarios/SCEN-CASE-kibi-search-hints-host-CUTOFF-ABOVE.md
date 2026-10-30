---
title: An answer whose top score is 0.44 or more never asks for search hints
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:41.591Z'
id: SCEN-CASE-kibi-search-hints-host-CUTOFF-ABOVE
type: scenario
---
Given a kb_search answer that did not abstain and whose top score is 0.44 or 0.45, when the host decides whether to ask a provider for hints, then it does not ask, so a cut-off above 0.44 is caught.

This covers the value past the bound of the weak-answer cut-off, `gt 0.44` on `weak_top_score_below`. packages/cli/tests/search-hints.test.ts "the weak-answer cut-off sits at a top score of 0.44, neither above nor below" exercises it with literal top scores of 0.44 and 0.45, both of which must give no trigger.
