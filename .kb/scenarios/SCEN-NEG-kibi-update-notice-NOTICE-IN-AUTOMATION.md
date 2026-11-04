---
title: The update notice stays out of JSON output, CI, agent and hook runs and opted-out runs
status: active
expects: rejection
tags:
  - negative-path
  - release
  - update-notice
origin:
  kind: agent
  recorded_at: '2026-11-04T13:26:25.685Z'
id: SCEN-NEG-kibi-update-notice-NOTICE-IN-AUTOMATION
type: scenario
---
Given a cached newer release, when a kibi command prints JSON, runs with stderr that is not a terminal (agents, hooks, pipes), runs in CI or a test runner, or runs with KIBI_UPDATE_CHECK=0 or NO_UPDATE_NOTIFIER set, then the CLI prints no notice and starts no registry check. packages/cli/tests/update-check.test.ts "does nothing for ..." and the updateCheckOffReason cases exercise it.

This is the failure side of the update notice requirement.