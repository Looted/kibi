---
title: kb_model accepts capability grants as permission rules
status: open
required_evidence: tested
tags:
  - modeling
  - predicates
  - semantic-advisor
  - search-lane
priority: must
semantic_text: kb_model mode predicates must accept a capability grant written as must be able to, are able to, have permission to or are entitled to as a permission_rule cue the same as allowed to. The semantic advisor must classify a have permission to clause and an are entitled to clause as normative. Inferred permission_rule bindings must drop the leading determiner of the actor and resource and singularise the resource. A reviewed decision binding must set the polarity of the planned permission fact.
logic_claims:
  - CLAIM-97C16FC0B79EBB19
  - CLAIM-C28786EDF3315649
  - CLAIM-E713531EE4BE8863
  - CLAIM-A95F0279E46FF8C2
semantic_clauses:
  - kb_model mode predicates must accept a capability grant written as must be able to, are able to, have permission to or are entitled to as a permission_rule cue the same as allowed to.
  - The semantic advisor must classify a have permission to clause and an are entitled to clause as normative.
  - Inferred permission_rule bindings must drop the leading determiner of the actor and resource and singularise the resource.
  - A reviewed decision binding must set the polarity of the planned permission fact.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: Product owners write permissions as "must be able to", "have permission to" or "are entitled to"; search-lane round 1 showed kb_model rejecting every such fixture sentence with "required semantic cue absent" even with complete bindings, so the seed had to be reworded to "is allowed to" before any permission fact could exist.
semantic_source_hash: bd7654e8752653bbe05618b3aafbaa8c7204ca825cd6a5387d2fbcb2f1606932
semantic_inventory:
  - claim_key: CLAIM-97C16FC0B79EBB19
    claim_text: kb_model mode predicates must accept a capability grant written as must be able to, are able to, have permission to or are entitled to as a permission_rule cue the same as allowed to
    role: normative
    span:
      start: 0
      end: 182
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-C28786EDF3315649
    claim_text: The semantic advisor must classify a have permission to clause and an are entitled to clause as normative
    role: normative
    span:
      start: 184
      end: 289
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E713531EE4BE8863
    claim_text: Inferred permission_rule bindings must drop the leading determiner of the actor and resource and singularise the resource
    role: normative
    span:
      start: 291
      end: 412
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A95F0279E46FF8C2
    claim_text: A reviewed decision binding must set the polarity of the planned permission fact
    role: normative
    span:
      start: 414
      end: 494
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
origin:
  kind: agent
  recorded_at: '2026-10-11T18:43:17.680Z'
id: REQ-model-predicates-permission-grants
type: req
---
# kb_model accepts capability grants as permission rules

kb_model mode predicates must accept a capability grant written as must be able to, are able to, have permission to or are entitled to as a permission_rule cue the same as allowed to. The semantic advisor must classify a have permission to clause and an are entitled to clause as normative. Inferred permission_rule bindings must drop the leading determiner of the actor and resource and singularise the resource. A reviewed decision binding must set the polarity of the planned permission fact.

## Context

The permission_rule applicability gate accepted "may", "can", "is allowed to" and "are permitted to" but not the capability wording product owners use ("must be able to", "are able to", "have permission to", "are entitled to"), so `kb_model` (mode predicates) rejected those sentences with "required semantic cue absent for permission_rule" even when the caller supplied complete argument bindings. Inferred bindings also kept the article and the plural ("a_viewer", "analysis_requests"), so an allow and a deny on the same resource did not share the key the contradiction check compares, and a sentence that mixes a grant with a prohibition always planned a deny fact. Found in search-lane round 1 on the test project (analysis in the project files, fix PR 2); asked by the project owner as part of the search-lane fix PRs. Bare "is/are able to" stays descriptive for the semantic advisor because stored inventories derive their roles from the same pattern.

## Source

> "kb_model mode:predicates seq 120-126 rejected every 'must be able to' sentence, also with complete argumentBindings" - round 1 analysis, A1 row; fix PR-2: accept must/should/shall be able to, is/are able to, has/have permission to, is/are entitled to; strip the article and singularise plural resources.
