---
id: FACT-SKILLOPT-SEMANTIC-READINESS
title: Semantic advisor requires one grounding slot per claim
status: active
created_at: 2026-08-04T00:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: documentation/facts/FACT-SKILLOPT-SEMANTIC-READINESS.md
fact_kind: predicate
predicate_namespace: kibi.skillopt
predicate_name: evaluation_evidence_rule
predicate_args:
  - semantic_advisor
  - manifest_or_grounding_incomplete
  - readiness_partial_and_grounding_suggestions_continue
canonical_key: evaluation_evidence_rule(semantic_advisor,manifest_or_grounding_incomplete,readiness_partial_and_grounding_suggestions_continue)
polarity: assert
claim_key: CLAIM-DE4082419A031E05
claim_text: Semantic-advisor readiness must remain partial until every normative claim has a distinct logical grounding edge.
tags: [lane:ontology, predicate, skillopt, semantic-advisor, logic-coverage]
---

Prevents a complete claim manifest plus one token relationship from suppressing the remaining clause-grounding plans.
