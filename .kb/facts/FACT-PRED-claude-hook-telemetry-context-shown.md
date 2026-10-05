---
title: 'Predicate: conditional_behavior(hook_usage_record,read_or_edit,record_context_shown_or_suppressed)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - hook_usage_record
  - read_or_edit
  - record_context_shown_or_suppressed
canonical_key: conditional_behavior(hook_usage_record,read_or_edit,record_context_shown_or_suppressed)
polarity: assert
claim_key: CLAIM-59981DB2FF690608
claim_text: Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-context-shown
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
