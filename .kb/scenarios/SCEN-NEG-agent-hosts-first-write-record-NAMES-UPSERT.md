---
title: A host template that sends a first write to kb_upsert is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:53.753Z'
id: SCEN-NEG-agent-hosts-first-write-record-NAMES-UPSERT
type: scenario
---
Given a host whose capture template sends the first write of a rule to kb_upsert, when it is checked, then it is refused: every host and both skills must point the first write of a rule at kb_record.
