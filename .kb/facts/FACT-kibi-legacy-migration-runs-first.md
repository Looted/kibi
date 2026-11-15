---
title: kb_apply_plan must run the approved legacy migration before the plan's other approved actions
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: legacy_migration_runs_before_other_actions
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-20BBB71C30D9EC47
claim_text: kb_apply_plan must run the approved legacy migration before the plan's other approved actions
text_ref: REQ-kibi-legacy-attachment-apply-migration
tags:
  - lane:strict
  - fact:property_value
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-15T08:00:00.000Z'
id: FACT-kibi-legacy-migration-runs-first
type: fact
---
kb_apply_plan must run the approved legacy migration before the plan's other approved actions. Grounds a clause of REQ-kibi-legacy-attachment-apply-migration.