---
title: The kibi CLI checks the registry at most daily and never blocks a command on it
status: active
expects: rejection
tags:
  - negative-path
  - release
  - update-notice
origin:
  kind: agent
  recorded_at: '2026-11-04T13:26:24.278Z'
id: SCEN-NEG-kibi-update-notice-CHECK-EVERY-RUN
type: scenario
---
Given a registry check that ran less than a day ago, when another kibi command finishes, then no second registry check starts; when the last check is a day old, one detached background process asks the registry and the command exits without waiting for it. packages/cli/tests/update-check.test.ts "starts one background refresh when the check is due" and "background refresh process" exercise it.

This is the failure side of the update notice requirement.