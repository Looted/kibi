---
title: A file path or a contradiction question names the next call
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-24T08:38:59.558Z'
id: SCEN-kibi-search-question-next-steps
type: scenario
---
Given a question that names src/a.ts, when kb_search answers, then its next actions include a kb_search of the same question with that path as sourceLocations; given a question about contradictions, they include a kb_check of the domain-contradictions rule. The text keeps saying the same.

packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts "a file path in the question suggests the search with sourceLocations" and "a question about contradictions names the check" exercise it.