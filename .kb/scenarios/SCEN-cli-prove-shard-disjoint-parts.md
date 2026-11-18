---
title: Three runners prove one full run
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:30.735Z'
id: SCEN-cli-prove-shard-disjoint-parts
type: scenario
---
Three CI runners run `kibi prove --all --shard 1/3`, `2/3` and `3/3`. Each proves about a third of the contracted tests, and together they prove every test once.