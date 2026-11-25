---
title: A search that skips an installed embedding provider is refused
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T20:05:03.166Z'
id: SCEN-NEG-search-meaning-fusion-UNFUSED
type: scenario
---
Given an installed embedding provider that answers, when a kb_search ranks by words alone because its word match looked strong enough, then it is refused: the provider's ranking is fused on every search.