---
id: FACT-REPAIR-PLAN-NON-AUTO
title: Repair batches remain reviewed and sequential
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-REPAIR-PLAN-NON-AUTO.md
tags: [lane:ontology, requirements, repair, safety]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [repair_batch, application_policy, reviewed_non_auto_sequential_validated]
canonical_key: logical_requirement_rule(repair_batch,application_policy,reviewed_non_auto_sequential_validated)
polarity: assert
claim_key: CLAIM-CCE119E4B7EFD7D0
claim_text: Every batch must remain non-auto-applicable and require query-before-mutation, endpoint-before-relationship creation, validation before writes, sequential upserts, and coverage rechecking
claim_span_start: 489
claim_span_end: 676
---

Ground representation of the non-auto-applicable mutation policy.
