---
title: A kibi.search-hints.v1 result of one hint is accepted
status: active
priority: should
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T20:12:47.708Z'
id: SCEN-CASE-capability-search-hints-v1-scores-1-hint
type: scenario
---
Given a request for a score on one supplied entity, when a provider returns one hint for it with a score between 0 and 1, then the host accepts it.