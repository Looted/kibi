---
title: A search result the answer does not quote never loses its summary fields
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-24T19:29:42.078Z'
id: SCEN-CASE-kb-search-answered-results-identity-only-SEARCH-UNQUOTED-RESULT-TRIMMED
type: scenario
---
Given a kb_search whose results include entities the answer does not quote, such as a requirement with a clipped statement or a scenario, when the search runs with the default summary fields, then those results keep their snippet and evidence, so a result trimmed although the answer does not quote it is caught.

This covers one violating item past the invariant, `gt 0` on `unquoted_results_without_summary_fields`. packages/cli/tests/search-answered-results.test.ts and packages/cli/tests/consumer/search-answer-layer.test.ts exercise it by asserting those results are returned unchanged.
