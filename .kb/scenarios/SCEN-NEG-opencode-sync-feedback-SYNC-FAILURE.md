---
title: A failed background sync is reported with its error without blocking later syncs
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:24:01.635Z'
id: SCEN-NEG-opencode-sync-feedback-SYNC-FAILURE
type: scenario
---
Given the packed OpenCode sync scheduler, when a background sync throws, then the completion report carries exit code 1 and the error message rather than staying silent, and the scheduler keeps working: the next sync is scheduled, runs and reports success.

This is the failure side of sync feedback: a failing sync must be reported clearly and must not block the main workflow. documentation/tests/e2e/packed/opencode-plugin.test.ts "contains a failing background sync, reports it, and keeps scheduling" exercises it.
