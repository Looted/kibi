---
title: A maintainer catches a proof regression before pushing
status: active
tags:
  - proof
  - tooling
id: SCEN-kibi-local-proof-parity
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Given a branch whose KB change leaves a current requirement below its evidence floor, while every local proof receipt is stale
When the maintainer runs `bun run proof:gate`
Then the gate fails and names the requirement, its evidence level and its floor, without flagging requirements whose only gaps are stale receipts

Given a committed branch head
When the maintainer runs `bun run proof:replay`
Then the CI proof job's gate steps run in order in a clean clone outside the repository tree, and the replay stops at the first failing step with its name
