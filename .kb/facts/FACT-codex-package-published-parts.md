---
title: The kibi-codex package publishes its plugin parts
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: published_files
operator: includes
value_type: set
value_set:
  - plugin.json
  - assets
  - .mcp.json
  - bin
  - hooks
  - skills
claim_text: The kibi-codex package must publish its plugin.json manifest, its assets, .mcp.json configuration and its bin, hooks and skills directories
claim_key: CLAIM-A803F27577B74ED2
text_ref: REQ-codex-plugin-package
origin:
  kind: human
  ref: Maintainer approval, 2026-11-25, migrating kibi-codex to root plugin.json and bundling icon assets
  recorded_at: '2026-11-25T11:39:57.207Z'
id: FACT-codex-package-published-parts
type: fact
---
The npm files list of kibi-codex includes the manifest directory, the MCP configuration and the bin, hooks and skills directories.