---
title: The kibi-claude hooks cover the session lifecycle
status: active
fact_kind: property_value
subject_key: claude.kibi_plugin
property_key: lifecycle_hooks
operator: includes
value_type: set
value_set:
  - PostToolUse
  - PreToolUse
  - SessionStart
  - Stop
  - UserPromptSubmit
claim_text: The kibi-claude hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
text_ref: REQ-claude-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:11.370Z'
claim_key: CLAIM-CBAE2462F2FAD2EE
id: FACT-claude-lifecycle-hooks
type: fact
---
The hooks configuration registers handlers for session start, prompt submit, before and after tool use, and stop.