---
title: The semantic advisor treats permission and entitlement grants as normative
status: active
tags:
  - lane:ontology
  - modeling
  - search-lane
text_ref: .kb/requirements/REQ-model-predicates-permission-grants.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.modeling.semantic_advisor,permission_or_entitlement_grant_clause,classified_normative)
claim_key: CLAIM-C28786EDF3315649
claim_text: The semantic advisor must classify a have permission to clause and an are entitled to clause as normative
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.modeling.semantic_advisor
  - permission_or_entitlement_grant_clause
  - classified_normative
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T18:42:11.198Z'
id: FACT-ADVISOR-PERMISSION-GRANTS-NORMATIVE
type: fact
---
The semantic advisor's normative-assertion detector accepts "has/have (no) permission to" and "is/are (not) entitled to" as asserted obligations, so such clauses get a normative role and need grounding. Bare "is/are able to" stays descriptive because stored inventories derive their roles from the same pattern.

## Context

Search-lane round 1 on the test project showed grant clauses classified descriptive yet accepted by the upsert; the project owner asked for the cue fixes in the search-lane fix PRs.
