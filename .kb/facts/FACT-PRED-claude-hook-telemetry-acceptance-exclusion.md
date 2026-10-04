---
title: 'Predicate: conditional_behavior(telemetry_acceptance_evaluation,hook_usage_records_present,exclude_hook_usage_records)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_acceptance_evaluation
  - hook_usage_records_present
  - exclude_hook_usage_records
canonical_key: conditional_behavior(telemetry_acceptance_evaluation,hook_usage_records_present,exclude_hook_usage_records)
polarity: assert
claim_key: CLAIM-38D55CC3A92EF11F
claim_text: Telemetry acceptance evaluation must exclude hook usage records
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-acceptance-exclusion
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
