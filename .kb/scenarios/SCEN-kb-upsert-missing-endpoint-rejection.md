---
title: A write that links to an entity not stored yet is refused with the way to fix it
status: active
expects: error
priority: must
tags:
  - mutation
  - relationships
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-16T13:34:00.438Z'
id: SCEN-kb-upsert-missing-endpoint-rejection
type: scenario
---
Given the KB holds no TEST-missing, when an agent upserts SCEN-x with a verified_by relationship to TEST-missing, then nothing is written and the write is refused as a rejection whose message says the target entity TEST-missing does not exist and that it must be created first or written in the same kb_apply_plan. The same payload through kb_validate_upsert reports the same refusal without writing, and telemetry records the operation as rejected rather than as an error.