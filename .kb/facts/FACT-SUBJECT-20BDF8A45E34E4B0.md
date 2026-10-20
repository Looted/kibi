---
title: Opencode Plugin Package Root
status: active
text_ref: mcp://kibi/model-requirement
tags:
  - strict-modeling
  - confidence:0.80
  - confidence-band:medium
  - provenance:mcp-kibi-model-requirement
  - lane:strict
  - fact:subject
  - vocabulary:new-subject
fact_kind: subject
subject_key: opencode.plugin.package_root
canonical_key: opencode.plugin.package_root
claim_key: CLAIM-733DF122ABFEFA77
claim_text: The package root must not export any function.
origin:
  kind: human
  ref: github:Looted/kibi#509
  recorded_at: '2026-10-19T20:31:17.842Z'
id: FACT-SUBJECT-20BDF8A45E34E4B0
type: fact
---
The kibi-opencode package root is the plugin entrypoint. Legacy OpenCode loaders invoke every function exported from that entrypoint, so the root must not export a function.
