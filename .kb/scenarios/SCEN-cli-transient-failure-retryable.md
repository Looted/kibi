---
title: A failure the same call may get past stays retryable
status: active
expects: success
priority: must
tags:
  - cli
  - errors
origin:
  kind: agent
  recorded_at: '2026-11-16T14:41:05.159Z'
id: SCEN-cli-transient-failure-retryable
type: scenario
---
Given an operation that fails with an unexplained error that is not a KB rejection, or with a workspace mutation lock timeout while a live owner holds the lock, when it runs through the CLI JSON route, then the printed error envelope has retryable true, so the agent may repeat the same call.