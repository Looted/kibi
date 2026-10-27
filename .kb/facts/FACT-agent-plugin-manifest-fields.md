---
title: The portable plugin.json uses only Agent Plugins schema fields
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: plugin_manifest_fields
operator: subset_of
value_type: set
value_set:
  - $schema
  - author
  - description
  - extensions
  - homepage
  - keywords
  - license
  - name
  - repository
  - version
claim_text: The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields
claim_key: CLAIM-C7B0F78EAB07CB58
text_ref: REQ-cursor-agent-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:56:48.617Z'
id: FACT-agent-plugin-manifest-fields
type: fact
---
Every top-level field of the manifest is one the 1.0.0 plugin schema defines.