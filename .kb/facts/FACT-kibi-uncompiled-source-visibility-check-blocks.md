---
title: kb_check leaves no unextractable authored source without a blocking violation
status: active
fact_kind: property_value
subject_key: kibi.sync.uncompiled_sources
property_key: unextractable_sources_without_blocking_violation
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.sync.uncompiled_sources:unextractable_sources_without_blocking_violation:eq:0
claim_key: CLAIM-D1ECF79429CD6E71
claim_text: The kb_check operation must report a blocking violation that names each authored source kibi sync cannot extract and its extraction error
text_ref: REQ-kibi-uncompiled-source-visibility
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kibi-uncompiled-source-visibility
origin:
  kind: agent
  recorded_at: '2026-10-14T08:54:10.731Z'
id: FACT-kibi-uncompiled-source-visibility-check-blocks
type: fact
---
