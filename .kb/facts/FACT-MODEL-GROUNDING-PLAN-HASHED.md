---
title: kb_model predicates returns a hash-bound compile plan for a complete grounding
status: active
tags:
  - lane:ontology
  - modeling
  - search-lane
text_ref: .kb/requirements/REQ-model-what-if-planned-facts.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.modeling.predicates,complete_grounding_of_stored_requirement,hash_bound_compile_plan)
claim_key: CLAIM-A7A0F67BC27AA7EA
claim_text: kb_model mode predicates must return a hash-bound compile plan for a complete grounding of a stored requirement
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.modeling.predicates
  - complete_grounding_of_stored_requirement
  - hash_bound_compile_plan
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T19:11:13.968Z'
id: FACT-MODEL-GROUNDING-PLAN-HASHED
type: fact
---
When requirementId names a stored requirement and the candidate is complete and not yet grounded, kb_model (mode predicates) returns `plan`, a kibi.compile-plan.v1 whose steps write the predicate fact and upsert the requirement with its restated ledger, the merged logic_claims manifest and the requires_predicate link, so kb_apply_plan applies both in one transaction.

## Context

Search-lane round 1 on the test project: applyPlan was an array of upsert operations with no hash, so kb_apply_plan could not take it and the instructions' apply step was impossible for predicate plans. Asked by the project owner through the search-lane fix PRs.
