---
title: The kibi-claude package publishes its plugin parts
status: active
fact_kind: property_value
subject_key: claude.kibi_plugin
property_key: published_files
operator: includes
value_type: set
value_set:
  - .claude-plugin
  - .mcp.json
  - bin
  - hooks
  - skills
claim_text: The kibi-claude package must publish its .claude-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories
text_ref: REQ-claude-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:07.409Z'
claim_key: CLAIM-C3823F88987EFA0A
id: FACT-claude-package-published-parts
type: fact
---
The npm files list of kibi-claude includes the manifest directory, the MCP configuration and the bin, hooks and skills directories.