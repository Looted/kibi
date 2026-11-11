---
title: A compound normative clause is refused as one proposition instead of being modeled whole
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T18:00:00.000Z'
id: SCEN-NEG-kibi-suggestion-prose-classification-COMPOUND-CLAUSE
type: scenario
---
Given the modal-free prose "Unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly.", which joins a validity assertion and a failure-policy assertion, when the packed CLI suggests predicates for it, then the semantic advisor detects two assertive propositions, the suggester returns no candidates, no schema draft and an empty apply plan, and warns that suggestion requires one atomic assertive proposition.

This is the failure side of classifying modal-free assertions as normative and keeping conjunctions atomic. documentation/tests/e2e/packed/predicate-suggestion-relevance.test.ts exercises it through assertPackedPredicateSuggestionRelevance.
