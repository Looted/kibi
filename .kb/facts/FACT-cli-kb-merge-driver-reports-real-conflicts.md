---
title: Conflicting fields resolved without a report, markers and nonzero exit = 0
status: active
fact_kind: property_value
subject_key: kibi.cli.kb_merge_driver
property_key: conflicting_fields_resolved_silently
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.cli.kb_merge_driver:conflicting_fields_resolved_silently:eq:0
claim_key: CLAIM-5726B98D50309CB5
claim_text: Kibi merge-driver must report each field that both sides changed differently, leave conflict markers, and exit non-zero
claim_span_start: 301
claim_span_end: 420
text_ref: packages/cli/src/commands/merge-driver.ts
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
id: FACT-cli-kb-merge-driver-reports-real-conflicts
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
