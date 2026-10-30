---
title: Records added on either side that the merge drops = 0
status: active
fact_kind: property_value
subject_key: kibi.cli.kb_merge_driver
property_key: dropped_records_added_on_either_side
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.cli.kb_merge_driver:dropped_records_added_on_either_side:eq:0
claim_key: CLAIM-131544C56C22E57F
claim_text: Kibi merge-driver must keep every record that either side of a merge added to the symbols manifest or a relationship shard
claim_span_start: 0
claim_span_end: 122
text_ref: packages/cli/src/commands/merge-driver.ts
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
id: FACT-cli-kb-merge-driver-keeps-added-records
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
