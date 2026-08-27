---
id: FACT-REPAIR-PLAN-STABLE-ID
title: Repair plan identity ignores volatile clock evidence
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-REPAIR-PLAN-STABLE-ID.md
tags: [lane:ontology, requirements, repair, determinism]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [repair_plan_identifier, stability_scope, stable_ignoring_volatile_time]
canonical_key: logical_requirement_rule(repair_plan_identifier,stability_scope,stable_ignoring_volatile_time)
polarity: assert
claim_key: CLAIM-27B1FA17C8CBAC13
claim_text: The plan identifier must remain stable for the same code snapshot, filters, proof evidence, and gaps while ignoring volatile check times and receipt ages
claim_span_start: 678
claim_span_end: 831
---

Ground representation of deterministic repair-plan identity.
