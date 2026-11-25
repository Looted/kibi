---
title: A failing embedding provider that fails the search is refused
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:35.905Z'
id: SCEN-NEG-search-meaning-fusion-FAILING-PROVIDER
type: scenario
---
Given an embedding provider that throws, returns an invalid result or answers after its time budget, when kb_search fails or answers with the provider's partial scores, then it is refused: the search answers by words alone and reports a diagnostic.