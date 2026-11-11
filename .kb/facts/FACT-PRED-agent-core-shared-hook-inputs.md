---
title: No host hook decides paths, Kibi MCP calls or the knowledge index outside kibi-agent-core
status: active
tags:
  - lane:ontology
  - hooks
  - agent-core
claim_key: CLAIM-DF64F5F40C65E752
claim_text: The Claude Code, Codex, Cursor and ZCode hooks must classify workspace paths, recognize Kibi MCP tool calls and load the knowledge index through the shared kibi-agent-core functions, so every host reaches the same decision for the same input
text_ref: .kb/requirements/REQ-agent-core-shared-hook-inputs.md
fact_kind: property_value
subject_key: kibi.host.hook_inputs
property_key: host_hooks_deciding_inputs_outside_agent_core
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-11-04T14:36:38.590Z'
id: FACT-PRED-agent-core-shared-hook-inputs
type: fact
---
Counts the Claude Code, Codex, Cursor and ZCode hooks that classify workspace paths, recognize Kibi MCP tool calls or load the knowledge index with their own code instead of the shared kibi-agent-core functions. The count must be zero.
