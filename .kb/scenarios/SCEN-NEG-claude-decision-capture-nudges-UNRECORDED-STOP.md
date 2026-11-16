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
Given a session that changed a source file and made no kb_upsert write, when the agent stops, then the Stop hook asks once to record the decision the person stated (quoting the rule phrase when the prompt had one) or to say why that phrase is not a rule, and does not ask again in that session.

This is the failure side of decision capture: a change must not end silently without its decision being asked for. packages/claude/tests/hook-runner.test.ts "a rule session that changed source and recorded nothing is asked once at stop for the rule, quoting its phrase, with no way out" exercises it.