---
title: While a legacy literal-path branch store is attached, kb_apply_plan must apply only a migration plan that approves that branch's same-identity legacy migration
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: legacy_apply_requires_approved_migration
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-EDC0785B76B7973D
claim_text: While a legacy literal-path branch store is attached, kb_apply_plan must apply only a migration plan that approves that branch's same-identity legacy migration
text_ref: REQ-kibi-legacy-attachment-apply-migration
tags:
  - lane:strict
  - fact:property_value
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-15T08:00:00.000Z'
id: FACT-kibi-legacy-apply-requires-approved-migration
type: fact
---
While a legacy literal-path branch store is attached, kb_apply_plan must apply only a migration plan that approves that branch's same-identity legacy migration. Grounds a clause of REQ-kibi-legacy-attachment-apply-migration.