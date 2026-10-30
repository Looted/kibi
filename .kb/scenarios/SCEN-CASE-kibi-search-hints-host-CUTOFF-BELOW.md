---
title: An answer whose top score is just below 0.44 still asks for search hints
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:48.952Z'
id: SCEN-CASE-kibi-search-hints-host-CUTOFF-BELOW
type: scenario
---
Given a kb_search answer that did not abstain and whose top score is 0.43 or 0.439, when the host decides whether to ask a provider for hints, then it treats the answer as weak and asks, so a cut-off below 0.44 is caught.

This covers the value below the bound of the weak-answer cut-off, `lt 0.44` on `weak_top_score_below`. packages/cli/tests/search-hints.test.ts "the weak-answer cut-off sits at a top score of 0.44, neither above nor below" exercises it with literal top scores of 0.43 and 0.439, both of which must trigger weak-answer hints.
