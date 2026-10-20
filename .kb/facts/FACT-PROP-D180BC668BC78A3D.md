---
title: Function Export forbidden
status: active
text_ref: mcp://kibi/model-requirement
tags:
  - strict-modeling
  - confidence:0.80
  - confidence-band:medium
  - provenance:mcp-kibi-model-requirement
  - lane:strict
  - fact:property_value
fact_kind: property_value
subject_key: opencode.plugin.package_root
property_key: function_export
canonical_key: mcp-kibi-model-requirement:opencode.plugin.package_root:function_export:polarity:forbid
operator: eq
value_type: bool
value_bool: true
polarity: forbid
claim_key: CLAIM-733DF122ABFEFA77
claim_text: The package root must not export any function.
origin:
  kind: human
  ref: github:Looted/kibi#509
  recorded_at: '2026-10-19T20:31:18.444Z'
id: FACT-PROP-D180BC668BC78A3D
type: fact
---
The package root must not export any function. Legacy OpenCode loaders invoke every function exported from the plugin entrypoint (packages/opencode/src/index.ts).
