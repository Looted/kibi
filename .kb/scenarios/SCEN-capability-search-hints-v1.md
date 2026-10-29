---
title: A search hints result names only supplied entities, in bounded score order
status: active
tags:
  - search
  - plugins
origin:
  kind: agent
  recorded_at: '2026-10-29T19:18:46.205Z'
id: SCEN-capability-search-hints-v1
type: scenario
---
Given a plugin declares kibi.search-hints.v1, when its result names an entity the host did not supply, repeats an id, exceeds the requested limit or 20 hints, scores outside 0 to 1, or breaks the score-then-id order, then validation rejects the result. When a project activates the capability in augment mode, project configuration validation rejects it.
