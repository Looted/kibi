---
title: 'Predicate: conditional_behavior(kibi_host_plugins,kb_usage_or_edited_hook_event,append_rows_through_agent_core_writer)'
status: active
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - agent-core
claim_key: CLAIM-969364048769B133
claim_text: The Cursor, Codex, ZCode, and OpenCode plugins must write the same kb_usage and edited hook usage records through the shared kibi-agent-core writer
text_ref: .kb/requirements/REQ-claude-hook-usage-telemetry-v2.md
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_host_plugins
  - kb_usage_or_edited_hook_event
  - append_rows_through_agent_core_writer
polarity: assert
canonical_key: conditional_behavior(kibi_host_plugins,kb_usage_or_edited_hook_event,append_rows_through_agent_core_writer)
origin:
  kind: agent
  recorded_at: '2026-10-04T02:13:04.481Z'
id: FACT-PRED-host-hook-telemetry-shared-writer
type: fact
---
