---
title: An edit snippet names the rule but not why it exists
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T15:42:06.293Z'
id: SCEN-NEG-agent-core-edit-snippet-why-MISSING
type: scenario
---
The agent is about to edit code that implements a current requirement with a recorded reason; the snippet shows the rule and what it must keep true, but the reason is cut off or never shown.

This is the failure side the change must not produce; the tests of TEST-agent-core-edit-snippet-why check it.