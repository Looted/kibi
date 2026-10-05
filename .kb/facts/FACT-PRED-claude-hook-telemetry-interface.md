---
title: 'Predicate: conditional_behavior(hook_usage_record,any_hook_usage_record,set_interface_hook)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - hook_usage_record
  - any_hook_usage_record
  - set_interface_hook
canonical_key: conditional_behavior(hook_usage_record,any_hook_usage_record,set_interface_hook)
polarity: assert
claim_key: CLAIM-0B05A3DF0916DA59
claim_text: Every hook usage record must set its interface to hook
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-interface
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
