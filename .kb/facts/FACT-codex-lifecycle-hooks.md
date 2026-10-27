---
title: The kibi-codex hooks cover the session lifecycle
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: lifecycle_hooks
operator: includes
value_type: set
value_set:
  - PostToolUse
  - PreToolUse
  - SessionStart
  - Stop
  - UserPromptSubmit
claim_text: The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
claim_key: CLAIM-EEAA3048360DABE2
text_ref: REQ-codex-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:30.723Z'
id: FACT-codex-lifecycle-hooks
type: fact
---
The hooks configuration registers handlers for session start, prompt submit, before and after tool use, and stop.