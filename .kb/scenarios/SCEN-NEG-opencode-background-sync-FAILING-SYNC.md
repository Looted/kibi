---
title: A failing background sync is contained and the next scheduled sync still runs
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:23:48.031Z'
id: SCEN-NEG-opencode-background-sync-FAILING-SYNC
type: scenario
---
Given the packed OpenCode sync scheduler with a short debounce, when a scheduled background sync throws, then the failure is contained: flush returns instead of hanging, the run completes with exit code 1 and the error message, and the next scheduled sync runs and succeeds.

This is the failure side of background synchronization: one failing sync must not stall the scheduler or the session that relies on it. documentation/tests/e2e/packed/opencode-plugin.test.ts "contains a failing background sync, reports it, and keeps scheduling" exercises it.
