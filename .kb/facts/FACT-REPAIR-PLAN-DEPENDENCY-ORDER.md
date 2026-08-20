---
id: FACT-REPAIR-PLAN-DEPENDENCY-ORDER
title: Repair batches follow semantic and graph dependencies
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-REPAIR-PLAN-DEPENDENCY-ORDER.md
tags: [lane:ontology, requirements, repair, dependencies]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [repair_planner, batch_ordering, same_phase_grouped_and_dependency_ordered]
canonical_key: logical_requirement_rule(repair_planner,batch_ordering,same_phase_grouped_and_dependency_ordered)
polarity: assert
claim_key: CLAIM-98FD5384CF7480CE
claim_text: The planner must group same-phase gaps into one small batch per requirement and order batches from source and semantic inventory through logical endpoints, manifests, contradiction resolution, scenarios, tests, receipts, symbols, and coordinates
claim_span_start: 117
claim_span_end: 362
---

Ground representation of dependency-ordered, same-phase batching.
