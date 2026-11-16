---
title: A kb_upsert dry run must list the same requirements without writing
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:44.000Z'
subject_key: kibi.upsert.sibling_requirements
property_key: dry_run_sibling_lists_differing
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-708BD8B0F6D0EBFB
claim_text: A kb_upsert dry run must list the same requirements without writing
text_ref: REQ-upsert-dry-run-lists-siblings
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-dry-run-lists-siblings
id: FACT-upsert-dry-run-lists-siblings
type: fact
---
Counts kb_upsert dry runs of a value fact change whose siblings differ from those the write of the same payload lists, or that write anything; zero means the dry run lists the same siblings and writes nothing.