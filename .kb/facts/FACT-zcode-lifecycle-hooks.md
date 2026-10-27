---
title: The kibi-zcode hooks register the session lifecycle hooks
status: active
fact_kind: property_value
subject_key: zcode.kibi_adapter
property_key: lifecycle_hooks
operator: includes
value_type: set
value_set:
  - PostToolUse
  - PreToolUse
  - SessionStart
  - Stop
  - UserPromptSubmit
claim_text: The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
text_ref: REQ-zcode-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:26:46.075Z'
claim_key: CLAIM-AE2131CEB3BC5794
id: FACT-zcode-lifecycle-hooks
type: fact
---
The ZCode hooks configuration registers the Kibi hook runner for the session start, prompt, tool and stop events.