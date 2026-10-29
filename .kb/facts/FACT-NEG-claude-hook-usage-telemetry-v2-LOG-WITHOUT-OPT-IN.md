---
title: The kibi-claude hooks run without KIBI_DIAGNOSTIC_MODE and would append hook usage records anyway
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_adapter
  - diagnostic_mode_not_enabled
  - append_hook_usage_records
polarity: assert
canonical_key: conditional_behavior(kibi_claude_adapter,diagnostic_mode_not_enabled,append_hook_usage_records)
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:58.488Z'
id: FACT-NEG-claude-hook-usage-telemetry-v2-LOG-WITHOUT-OPT-IN
type: fact
---
