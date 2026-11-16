---
title: A claim still stating the old value is listed as if current
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:43.222Z'
id: SCEN-NEG-upsert-flags-stale-sibling-claim-UNFLAGGED
type: scenario
---
A sibling requirement still says at most 500 after the value moved to 400, and the list shows it like any other sibling.

This is the failure side the write must not produce; TEST-upsert-stale-siblings checks it.