---
title: The kibi-codex package publishes its plugin parts
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: published_files
operator: includes
value_type: set
value_set:
  - .codex-plugin
  - .mcp.json
  - bin
  - hooks
  - skills
claim_text: The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories
claim_key: CLAIM-E17040C703A7CF28
text_ref: REQ-codex-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:26.849Z'
id: FACT-codex-package-published-parts
type: fact
---
The npm files list of kibi-codex includes the manifest directory, the MCP configuration and the bin, hooks and skills directories.