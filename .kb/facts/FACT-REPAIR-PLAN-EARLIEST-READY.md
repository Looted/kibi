---
id: FACT-REPAIR-PLAN-EARLIEST-READY
title: Only the earliest repair batch is ready
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-REPAIR-PLAN-EARLIEST-READY.md
tags: [lane:ontology, requirements, repair, dependencies]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [requirement_repair_plan, ready_batch_selection, earliest_unresolved_only]
canonical_key: logical_requirement_rule(requirement_repair_plan,ready_batch_selection,earliest_unresolved_only)
polarity: assert
claim_key: CLAIM-17D47FE789272899
claim_text: Only the earliest unresolved batch for each requirement may be ready
claim_span_start: 364
claim_span_end: 432
---

Ground representation of conservative ready-state selection.
