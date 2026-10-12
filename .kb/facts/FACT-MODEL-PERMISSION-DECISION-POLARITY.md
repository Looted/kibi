---
title: A reviewed decision binding sets the planned permission fact's polarity
status: active
tags:
  - lane:ontology
  - modeling
  - search-lane
text_ref: .kb/requirements/REQ-model-predicates-permission-grants.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.modeling.predicates,reviewed_decision_binding,sets_planned_fact_polarity)
claim_key: CLAIM-A95F0279E46FF8C2
claim_text: A reviewed decision binding must set the polarity of the planned permission fact
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.modeling.predicates
  - reviewed_decision_binding
  - sets_planned_fact_polarity
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T18:42:43.733Z'
id: FACT-MODEL-PERMISSION-DECISION-POLARITY
type: fact
---
When the caller binds the closed `decision` argument of permission_rule explicitly, the planned fact's polarity follows that decision (`deny` gives `polarity: deny`, `allow` gives `polarity: assert`) instead of the prohibition cues in the prose, so one sentence such as "must be able to read … and must not delete …" grounds an allow fact for read and a deny fact for delete.

## Context

Search-lane round 1 fixture sentences mix a grant and a prohibition; asked by the project owner through the search-lane fix PRs.
