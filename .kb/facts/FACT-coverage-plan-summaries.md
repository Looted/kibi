---
title: kb_coverage plans are summaries by default
status: active
fact_kind: property_value
subject_key: kibi.coverage.report
property_key: plans_default
operator: eq
value_type: string
value_string: summary
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-344BCCACD34F6B1B
claim_text: kb_coverage must return its repair and migration plans as summaries unless the call passes fields full
text_ref: REQ-coverage-plan-summaries
id: FACT-coverage-plan-summaries
type: fact
---
Without fields full, kb_coverage returns repairPlanSummary, symbolRepairPlanSummary and migrationPlanSummary instead of the plans. Grounds the clause of REQ-coverage-plan-summaries.