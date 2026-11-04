---
title: One host hook decides a hook input with its own code
status: active
tags:
  - negative-path
  - hooks
  - agent-core
fact_kind: property_value
subject_key: kibi.host.hook_inputs
property_key: host_hooks_deciding_inputs_outside_agent_core
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-11-04T14:44:06.649Z'
id: FACT-NEG-agent-core-shared-hook-inputs-FORKED-HOST
type: fact
---
One of the Claude Code, Codex, Cursor or ZCode hooks declares its own path classification, Kibi MCP tool call recognition or knowledge index loader instead of using the shared kibi-agent-core function.
