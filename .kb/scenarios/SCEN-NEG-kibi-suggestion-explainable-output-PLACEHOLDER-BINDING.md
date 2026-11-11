---
title: A generic placeholder binding is reported as a placeholder and never counts as reviewed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T18:00:00.000Z'
id: SCEN-NEG-kibi-suggestion-explainable-output-PLACEHOLDER-BINDING
type: scenario
---
Given prose about a checkout service publishing an OrderPlaced event and explicit bindings where the subject is the generic value "subject", when the packed CLI suggests predicates with the event publication schema, then the candidate is eligible but its binding_status is incomplete, its binding_provenance is placeholder, its applicability score and score components are shown, and the suggester returns provide_argument_bindings instead of an apply plan.

This is the failure side of explainable output: a generic value must not pass as a reviewed binding. documentation/tests/e2e/packed/predicate-suggestion-relevance.test.ts exercises it through assertPackedPredicateSuggestionRelevance.
