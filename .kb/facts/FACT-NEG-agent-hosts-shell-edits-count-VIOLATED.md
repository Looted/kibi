---
title: A host hook misses a shell in-place edit
status: active
fact_kind: property_value
subject_key: kibi.host.hook_inputs
property_key: shell_in_place_edits_not_counted
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T19:03:28.550Z'
id: FACT-NEG-agent-hosts-shell-edits-count-VIOLATED
type: fact
---
A sed -i, redirection or tee through the shell tool writes a file, and the hook treats the command as read-only.