---
title: Hook usage records are not written when the operator has not enabled diagnostic mode
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:55:01.668Z'
id: SCEN-NEG-claude-hook-usage-telemetry-v2-LOG-WITHOUT-OPT-IN
type: scenario
---
Given a Kibi workspace and a session whose environment does not set KIBI_DIAGNOSTIC_MODE, when the kibi-claude hooks handle a Read and an Edit of linked code, then no hook usage record is appended and .kb/usage.log stays empty.

This is the failure side of opt-in hook telemetry: recording agent activity without the operator's consent is refused. packages/claude/tests/hook-runner.test.ts "usage telemetry" "writes no rows unless the operator opted in" exercises it.
