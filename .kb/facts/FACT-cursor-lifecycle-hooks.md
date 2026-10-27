---
title: The kibi-cursor hooks cover the session lifecycle
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: lifecycle_hooks
operator: includes
value_type: set
value_set:
  - beforeReadFile
  - beforeSubmitPrompt
  - postToolUse
  - preToolUse
  - sessionStart
  - stop
claim_text: The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks
claim_key: CLAIM-ABD22F4069E4DFBE
text_ref: REQ-cursor-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:13.596Z'
id: FACT-cursor-lifecycle-hooks
type: fact
---
The hooks configuration registers handlers for session start, prompt submit, file reads, tool use and stop.