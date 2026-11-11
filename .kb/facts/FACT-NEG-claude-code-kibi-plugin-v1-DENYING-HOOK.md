---
title: A kibi-claude hook denies or rewrites a tool call
status: active
tags:
  - negative-path
fact_kind: predicate
predicate_namespace: default
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_adapter
  - any_hook_event
  - deny_tool_call
polarity: assert
canonical_key: conditional_behavior(kibi_claude_adapter,any_hook_event,deny_tool_call)
origin:
  kind: agent
  recorded_at: '2026-11-05T10:55:00.000Z'
id: FACT-NEG-claude-code-kibi-plugin-v1-DENYING-HOOK
type: fact
---
A kibi-claude hook answers a read, a direct .kb edit or a source edit with a permission decision or rewritten input.
