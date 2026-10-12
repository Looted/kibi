---
title: An agent models a permission written as a capability grant
status: active
tags:
  - modeling
  - predicates
  - semantic-advisor
  - search-lane
priority: must
origin:
  kind: agent
  recorded_at: '2026-10-11T18:45:44.940Z'
id: SCEN-model-predicates-permission-grants
type: scenario
---
# An agent models a permission written as a capability grant

Given a requirement from a test project whose text says "An admin must be able to read any analysis request", "Auditors are able to export reports", "Editors have permission to publish articles" or "Viewers are entitled to read dashboards"
When the agent calls kb_model with mode predicates for the permission_rule schema, with or without complete argument bindings
Then the candidate is eligible and the recommended action is apply_requires_predicate instead of record_ontology_gap with "required semantic cue absent"
And the inferred actor and resource carry no leading article and the resource is singular, so `any analysis request` and `analysis requests` bind the same actor, action and resource key
And a grant plans the fact with polarity assert while "must not be able to" or "have no permission to" plans it with polarity deny
And when the agent supplies a reviewed decision binding, that binding sets the planned fact's polarity even when the sentence is compound
When kb_model mode analyze reads a clause containing "have permission to" or "are entitled to"
Then the clause is classified normative, while a bare "are able to" clause keeps its descriptive role in stored inventories
