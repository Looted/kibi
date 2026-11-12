---
id: FACT-SCHEMA-PUBLIC-REVIEW-PREPARATION-ANALYSIS-EVIDENCE
title: Public review preparation analysis evidence predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: public_review_preparation_analysis_evidence
predicate_arity: 4
argument_names:
  - policy
  - evidence_state
  - obligation_handling
  - decision_handling
argument_types:
  - enforcement_surface
  - analysis_evidence_state
  - obligation_handling
  - decision_handling
argument_descriptions:
  - Policy surface preparing the review.
  - State of the source analysis evidence.
  - What happens to the review obligations.
  - What happens to generated acceptance decisions.
examples:
  - "public_review_preparation_analysis_evidence(kibi.impact_policy,failed_or_partial_evidence,retain_review_obligations,no_generated_acceptance_decision)"
type: fact
---

Grounds how public impact review preparation handles failed or partial analysis evidence.
