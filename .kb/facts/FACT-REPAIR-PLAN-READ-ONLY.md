---
id: FACT-REPAIR-PLAN-READ-ONLY
title: Requirement gaps produce deterministic read-only plans
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - repair
  - planning
fact_kind: property_value
subject_key: kibi.coverage.repair_plan
property_key: returned_gap_requirements_without_read_only_repair_plan
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-64B7C0764B97AD46
claim_text: Requirement coverage must emit a deterministic read-only repair plan for every returned requirement with proof gaps
claim_span_start: 0
claim_span_end: 115
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of repair-plan emission for proof gaps.
