---
title: An attached store keeps no duplicate triple unrepaired or unreported
status: active
fact_kind: property_value
subject_key: kibi.engine.journal
property_key: attached_duplicate_triples_unrepaired_or_unreported
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-11-17T09:07:53.415Z'
claim_text: When an engine attaches a branch store whose snapshot holds a triple more than once, it must keep one copy of each such triple, rewrite the snapshot, report the repair on stderr, and record it so that kb_status lists it as a notice and kibi doctor shows the Branch store check as a warning for seven days after the repair
text_ref: REQ-core-snapshot-duplicate-repair
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-core-snapshot-duplicate-repair
claim_key: CLAIM-FEBCBF96DE6C4A64
id: FACT-core-snapshot-duplicate-repair
type: fact
---
When an engine attaches a branch store whose snapshot holds a triple more than once, no duplicate copy is left in the store and the repair is reported on stderr, in kb_status and in kibi doctor.