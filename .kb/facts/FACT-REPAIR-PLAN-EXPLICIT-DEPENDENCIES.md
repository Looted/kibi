---
id: FACT-REPAIR-PLAN-EXPLICIT-DEPENDENCIES
title: Downstream repair batches name dependencies
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - repair
  - dependencies
fact_kind: property_value
subject_key: kibi.coverage.repair_plan
property_key: downstream_batches_without_named_dependencies
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-607ED4AD800C206F
claim_text: every downstream batch must name its dependencies
claim_span_start: 438
claim_span_end: 487
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of explicit downstream dependencies.
