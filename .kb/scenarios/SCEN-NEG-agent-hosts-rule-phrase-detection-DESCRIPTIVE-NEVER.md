---
title: A prompt that describes current behavior with never does not read as a rule
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T18:53:07.477Z'
id: SCEN-NEG-agent-hosts-rule-phrase-detection-DESCRIPTIVE-NEVER
type: scenario
---
Given a prompt that describes behavior, such as "sessions currently never expire", when a host hook reads it, then it does not read as a rule, and the agent is not pushed to record a requirement nobody stated.

This is the failure side of rule detection: a false match makes the agent invent requirements. packages/agent-core/tests/decision-guard.test.ts exercises it.