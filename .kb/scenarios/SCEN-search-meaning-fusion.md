---
title: Every search fuses the embedding provider's ranking and ranks by words without one
status: active
priority: must
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:18.647Z'
id: SCEN-search-meaning-fusion
type: scenario
---
Given an installed embedding provider, when kb_search runs, then the provider scores the decisions and the provider's ranking is fused with the word ranking by reciprocal rank; without a provider, or with one that fails, the same search ranks by words alone and a failure is reported as a diagnostic, and a shadow provider is only compared.