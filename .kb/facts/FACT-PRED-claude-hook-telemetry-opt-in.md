---
title: 'Predicate: not conditional_behavior(kibi_claude_adapter,diagnostic_mode_not_enabled,append_hook_usage_records)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_adapter
  - diagnostic_mode_not_enabled
  - append_hook_usage_records
canonical_key: conditional_behavior(kibi_claude_adapter,diagnostic_mode_not_enabled,append_hook_usage_records)
polarity: deny
claim_key: CLAIM-F1198EC0B9EF599D
claim_text: kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-opt-in
type: fact
---
