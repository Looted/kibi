---
title: A slow proof runs once per train, not on every pull request
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-17T14:37:35.193Z'
id: SCEN-ci-merge-train-train-checks
type: scenario
---
The action is configured with a train check that the repository runs only on train branches. A labelled pull request whose own checks passed boards without it. The train waits while that check runs, re-runs it once when it fails, and merges only after it passed on the train's head.