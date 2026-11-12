---
title: Predicate Suggestion Rejects Irrelevant Schemas and Abstains Safely
status: active
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - relevance
  - abstention
priority: must
id: SCEN-kibi-predicate-suggestion-relevance-v1
type: scenario
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
The suggester could recommend an unrelated schema just because every argument could be filled. This shows it rejecting such schemas, abstaining on close calls, and drafting a schema for a real gap. Source: changeset "launcher-predicate-catalog": "abstain more safely when relevance is weak or bindings are unreviewed".
