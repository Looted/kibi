---
title: Only green, labelled pull requests board
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:06.639Z'
id: SCEN-ci-merge-train-admission
type: scenario
---
Three pull requests carry the train label; one is a draft and one has a check still running. The train merges only the ready one; the others board a later train once they are ready.