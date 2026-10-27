---
title: kibi-cursor publishes the portable artifact next to the Cursor Plugin
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: published_files
operator: includes
value_type: set
value_set:
  - .cursor-plugin
  - agent-plugin
claim_text: The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory
claim_key: CLAIM-E598B71811986145
text_ref: REQ-cursor-agent-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:56:46.088Z'
id: FACT-cursor-publishes-agent-plugin
type: fact
---
The npm files list of kibi-cursor includes the agent-plugin and .cursor-plugin directories.