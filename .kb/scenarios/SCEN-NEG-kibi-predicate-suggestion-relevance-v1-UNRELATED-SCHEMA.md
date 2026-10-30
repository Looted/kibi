---
title: A semantically unrelated schema is rejected even with every argument bound
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:28.088Z'
id: SCEN-NEG-kibi-predicate-suggestion-relevance-v1-UNRELATED-SCHEMA
type: scenario
---
Given requirement prose about a consumer-local launcher resolving dependencies and an event publication schema whose arguments are all bound explicitly, when the packed CLI suggests predicates for it, then the candidate is marked rejected with rejection reasons, no candidate is eligible, and the suggester returns record_ontology_gap with an observation fact as its plan.

This is the failure side of semantic relevance gating: complete argument binding must not make an unrelated schema recommendable. documentation/tests/e2e/packed/predicate-suggestion-relevance.test.ts "SYM-kibi-predicate-suggestion-relevance-e2e" exercises it through assertPackedPredicateSuggestionRelevance.
