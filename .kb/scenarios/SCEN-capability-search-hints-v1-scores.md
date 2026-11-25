---
title: A kibi.search-hints.v1 result holds up to 50000 valid hints
status: active
priority: should
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:26.567Z'
id: SCEN-capability-search-hints-v1-scores
type: scenario
---
Given a request for scores on 50000 entities, when a provider returns one score per supplied id between 0 and 1, ordered by score with ties by id, then the host accepts it, and project configuration rejects augment mode for the capability.