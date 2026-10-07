---
title: The source lock must keep blocking writers while its holder process is alive
status: active
text_ref: REQ-bootstrap-apply-long-running
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-bootstrap-apply-long-running
fact_kind: property_value
subject_key: kibi.bootstrap_apply
property_key: live_holder_lock_blocks
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-20ABD642DC96A8D6
claim_text: The source lock must keep blocking writers while its holder process is alive
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:53.669Z'
id: FACT-bootstrap-apply-long-running-live-lock-blocks
type: fact
---
