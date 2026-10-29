---
title: Stopping a session that changed source and recorded nothing is held for the decision record once
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:42.609Z'
id: SCEN-NEG-agent-hosts-decision-guard-UNRECORDED-STOP
type: scenario
---
Given a session that wrote a source file and made no kb_upsert write, when the agent stops, then the stop hook answers with a reminder that the session recorded nothing and asks for the decision, and a second stop in the same session does not repeat that request.

This is the failure side of decision capture: a change must not end silently without the decision behind it being asked for. packages/zcode/tests/hook-runner.test.ts "Stop asks once for the decision record when source changed and nothing was recorded" exercises it.
