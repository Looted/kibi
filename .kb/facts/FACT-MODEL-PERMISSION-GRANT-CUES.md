---
title: Capability grants are permission_rule cues for kb_model predicates
status: active
tags:
  - lane:ontology
  - modeling
  - search-lane
text_ref: .kb/requirements/REQ-model-predicates-permission-grants.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.modeling.predicates,capability_grant_wording,accepted_as_permission_rule_cue)
claim_key: CLAIM-97C16FC0B79EBB19
claim_text: kb_model mode predicates must accept a capability grant written as must be able to, are able to, have permission to or are entitled to as a permission_rule cue the same as allowed to
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.modeling.predicates
  - capability_grant_wording
  - accepted_as_permission_rule_cue
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T18:41:55.583Z'
id: FACT-MODEL-PERMISSION-GRANT-CUES
type: fact
---
kb_model (mode predicates) treats a capability grant ("must be able to", "are able to", "have permission to", "are entitled to") as a permission_rule cue, the same as "allowed to" and "permitted to".

## Context

Search-lane round 1 on the test project: every "must be able to" fixture sentence was rejected with "required semantic cue absent for permission_rule" even with complete argument bindings, so the seed needed rewording. Asked by the project owner through the search-lane fix PRs.
