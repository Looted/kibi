---
title: 'Predicate: conditional_behavior(hook_usage_record,read_edit_search_or_kibi_call,record_kb_used_before)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - hook_usage_record
  - read_edit_search_or_kibi_call
  - record_kb_used_before
canonical_key: conditional_behavior(hook_usage_record,read_edit_search_or_kibi_call,record_kb_used_before)
polarity: assert
claim_key: CLAIM-80E1ED04FE7E1D64
claim_text: Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-kb-used-before
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
