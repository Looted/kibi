---
title: A kibi.search-hints.v1 result of no hints is accepted
status: active
priority: should
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T20:06:02.121Z'
id: SCEN-CASE-capability-search-hints-v1-scores-hint-counts
type: scenario
---
Given a request for scores on supplied entities, when a provider returns no hints, then the host accepts the empty result.