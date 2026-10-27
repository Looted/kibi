---
title: The kibi-cursor package publishes its plugin parts
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: published_files
operator: includes
value_type: set
value_set:
  - .cursor-plugin
  - bin
  - commands
  - hooks
  - mcp.json
  - rules
  - skills
claim_text: The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories
claim_key: CLAIM-59F0EF488D027724
text_ref: REQ-cursor-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:05.266Z'
id: FACT-cursor-package-published-parts
type: fact
---
The npm files list of kibi-cursor includes the manifest directory, the MCP configuration and every plugin directory.