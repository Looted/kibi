---
title: 'Predicate: not conditional_behavior(kibi_claude_adapter,hook_usage_record_write_fails,change_hook_output)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_adapter
  - hook_usage_record_write_fails
  - change_hook_output
canonical_key: conditional_behavior(kibi_claude_adapter,hook_usage_record_write_fails,change_hook_output)
polarity: deny
claim_key: CLAIM-C533C51637295AA8
claim_text: A failure to write a hook usage record must not change hook output
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-write-failure
type: fact
---
