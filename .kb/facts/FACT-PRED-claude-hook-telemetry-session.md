---
title: 'Predicate: conditional_behavior(hook_usage_record,any_hook_usage_record,preserve_host_session_id)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - hook_usage_record
  - any_hook_usage_record
  - preserve_host_session_id
canonical_key: conditional_behavior(hook_usage_record,any_hook_usage_record,preserve_host_session_id)
polarity: assert
claim_key: CLAIM-22225CDB19BB5ABC
claim_text: Every hook usage record must preserve the host session identifier
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-session
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
