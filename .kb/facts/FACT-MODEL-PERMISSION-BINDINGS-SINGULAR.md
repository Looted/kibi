---
title: Inferred permission bindings drop determiners and singularise the resource
status: active
tags:
  - lane:ontology
  - modeling
  - search-lane
text_ref: .kb/requirements/REQ-model-predicates-permission-grants.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.modeling.predicates,inferred_permission_actor_and_resource,determiner_free_singular_tokens)
claim_key: CLAIM-E713531EE4BE8863
claim_text: Inferred permission_rule bindings must drop the leading determiner of the actor and resource and singularise the resource
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.modeling.predicates
  - inferred_permission_actor_and_resource
  - determiner_free_singular_tokens
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T18:42:27.145Z'
id: FACT-MODEL-PERMISSION-BINDINGS-SINGULAR
type: fact
---
When kb_model infers permission_rule bindings from prose, the actor and the resource lose their leading determiner ("an admin" binds `admin`, "any analysis request" binds `analysis_request`) and the resource is singular ("analysis requests" binds `analysis_request`), so an allow and a deny on the same actor, action and resource share the key the contradiction check compares.

## Context

Search-lane round 1 on the test project inferred `a_viewer` and `analysis_requests`; asked by the project owner through the search-lane fix PRs.
