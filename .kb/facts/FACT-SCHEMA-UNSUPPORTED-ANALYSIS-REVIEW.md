---
id: FACT-SCHEMA-UNSUPPORTED-ANALYSIS-REVIEW
title: Unsupported analysis review predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: unsupported_analysis_review
predicate_arity: 3
argument_names:
  - policy
  - required_review
  - permission
argument_types:
  - enforcement_surface
  - review_kind
  - policy_permission
argument_descriptions:
  - Policy surface that judges the review.
  - Review the change must carry when source analysis is unsupported.
  - Permission that may waive the review.
examples:
  - "unsupported_analysis_review(kibi.impact_policy,explicit_whole_file_review,trusted_policy_permission)"
type: fact
---

Grounds how impact reviews treat files whose source analysis is unsupported.
