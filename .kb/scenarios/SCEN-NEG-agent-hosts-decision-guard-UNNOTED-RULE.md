---
title: A prompt that states a rule never reaches the agent without the recording note
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-04T18:45:00.000Z'
id: SCEN-NEG-agent-hosts-decision-guard-UNNOTED-RULE
type: scenario
---
Given a person who submits a prompt that reads as a rule
When the prompt hook runs
Then the prompt does not reach the agent bare: the hook adds the note that recording the rule with kb_upsert is part of the change, and a prompt that states no rule gets nothing.

This is the failure side of rule capture. packages/zcode/tests/hook-runner.test.ts "a prompt that states a rule gets the capture note; other prompts get nothing" exercises it.
