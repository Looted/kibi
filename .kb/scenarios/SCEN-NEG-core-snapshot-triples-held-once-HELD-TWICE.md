---
title: A snapshot that holds a triple twice fails the store check
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T09:08:07.907Z'
id: SCEN-NEG-core-snapshot-triples-held-once-HELD-TWICE
type: scenario
---
Given a branch store whose snapshot holds a triple twice, when the proof job's store check loads it fresh, then the check fails and names the number of duplicate copies.