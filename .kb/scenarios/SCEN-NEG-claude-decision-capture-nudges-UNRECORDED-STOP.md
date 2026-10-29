---
title: Stopping a session that changed source and recorded nothing is held once for the decision record
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:18:09.786Z'
id: SCEN-NEG-claude-decision-capture-nudges-UNRECORDED-STOP
type: scenario
---
Given a session that changed a source file and made no kb_upsert write, when the agent stops, then the kibi-claude Stop hook asks once to record the decision the person stated or to say there was none, and does not ask again in that session.

This is the failure side of decision capture: a change must not end silently without its decision being asked for. packages/claude/tests/hook-runner.test.ts "a session that changed source and recorded nothing is asked once at stop to record the decision or say there was none" exercises it.
