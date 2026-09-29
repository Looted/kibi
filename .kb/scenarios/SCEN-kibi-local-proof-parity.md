---
title: A maintainer catches a proof regression before pushing
status: active
tags:
  - proof
  - tooling
id: SCEN-kibi-local-proof-parity
type: scenario
---
Given a branch whose KB change breaks logical grounding for a proven requirement, while every local proof receipt is stale
When the maintainer runs `bun run proof:baseline:semantic`
Then the check fails and names the requirement and its semantic gaps, without flagging requirements whose only gaps are stale evidence

Given a committed branch head
When the maintainer runs `bun run proof:replay`
Then the CI proof job's gate steps run in order in a clean clone outside the repository tree, and the replay stops at the first failing step with its name
