---
title: Landing a proven train does not prove develop again
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-17T11:50:14.624Z'
id: SCEN-ci-proof-reuse-train-merge
type: scenario
---
A train's proof passes on its head, and the train merges into develop as a merge commit whose parents are the previous tip and the train head. The develop push finds the train's attested proof run, its snapshot equals the train's, so it skips the proof and publishes and attests the train's report.