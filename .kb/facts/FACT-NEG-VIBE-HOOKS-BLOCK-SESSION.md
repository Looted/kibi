---
title: A hook failure may propagate and block the agent session
status: active
fact_kind: property_value
subject_key: kibi.vibe.hooks
property_key: vibe-hooks-must-resolve-the-workspace
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:17.424Z'
id: FACT-NEG-VIBE-HOOKS-BLOCK-SESSION
type: fact
---
Opposing assumption for the negative scenario of REQ-vibe-hooks-fail-open: assumes kibi.vibe.hooks.vibe-hooks-must-resolve-the-workspace is false, which REQ-vibe-hooks-fail-open forbids.