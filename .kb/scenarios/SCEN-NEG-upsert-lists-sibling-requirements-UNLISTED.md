---
title: A value change says nothing about the other requirements on the quantity
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:38.109Z'
id: SCEN-NEG-upsert-lists-sibling-requirements-UNLISTED
type: scenario
---
An agent changes a limit that two requirements state, the result lists neither, and the agent stops with the second requirement still describing the old limit.

This is the failure side the write must not produce; TEST-upsert-stale-siblings checks it.