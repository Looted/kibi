---
title: Reports Conflicting Fields With Markers And Nonzero Exit = true
status: active
fact_kind: property_value
subject_key: kibi.cli.kb_merge_driver
property_key: reports_conflicting_fields_with_markers_and_nonzero_exit
operator: eq
value_type: bool
value_bool: true
canonical_key: packages-cli-src-commands-merge-driver-ts:kibi.cli.kb_merge_driver:reports_conflicting_fields_with_markers_and_nonzero_exit:eq:true
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
