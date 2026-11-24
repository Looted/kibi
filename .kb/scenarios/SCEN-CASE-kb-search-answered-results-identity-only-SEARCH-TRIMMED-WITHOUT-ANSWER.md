---
title: A search page without an answer never trims a result
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-24T19:29:40.372Z'
id: SCEN-CASE-kb-search-answered-results-identity-only-SEARCH-TRIMMED-WITHOUT-ANSWER
type: scenario
---
Given a kb_search run with answer false, when it returns its results with the default summary fields, then each result keeps its summary entity fields, snippet and evidence, so a result trimmed although no answer quotes it is caught.

This covers one violating item past the invariant, `gt 0` on `results_trimmed_without_answer`. packages/cli/tests/operations/discovery.test.ts "kb_search summarizes entities by default and returns full bodies on request" exercises it by asserting the exact summary entity of a search with answer false.
