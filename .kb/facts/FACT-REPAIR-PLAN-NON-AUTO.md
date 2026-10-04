---
id: FACT-REPAIR-PLAN-NON-AUTO
title: Repair batches remain reviewed and sequential
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - repair
  - safety
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.coverage.repair_plan
  - application_policy
  - reviewed_non_auto_sequential_validated
canonical_key: logical_requirement_rule(kibi.coverage.repair_plan,application_policy,reviewed_non_auto_sequential_validated)
polarity: assert
claim_key: CLAIM-CCE119E4B7EFD7D0
claim_text: Every batch must remain non-auto-applicable and require query-before-mutation, endpoint-before-relationship creation, validation before writes, sequential upserts, and coverage rechecking
claim_span_start: 489
claim_span_end: 676
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the non-auto-applicable mutation policy.
