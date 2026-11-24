---
title: A search result the answer quotes is never returned with its snippet and evidence
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-24T19:26:38.760Z'
id: SCEN-CASE-kb-search-answered-results-identity-only-SEARCH-QUOTED-RESULT-WITH-SNIPPET
type: scenario
---
Given a kb_search whose answer quotes REQ-QUOTA-CALL's whole statement, when the search runs with the default summary fields, then the REQ-QUOTA-CALL result carries only entity, score and reasons, so a result that still carried its snippet or evidence beside the answer is caught.

This covers one violating item past the invariant, `gt 0` on `answered_results_with_more_than_identity_score_and_reasons`. packages/cli/tests/consumer/search-answer-layer.test.ts exercises it by asserting the exact keys of every quoted result.
