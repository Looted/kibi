---
title: Prose that fits no predicate schema gets its candidate rejected and an ontology gap planned
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:28.562Z'
id: SCEN-NEG-mcp-suggest-predicates-NO-FITTING-SCHEMA
type: scenario
---
Given an installed Kibi, when an agent asks for predicate suggestions on prose about a consumer-local launcher that no catalog schema describes, then the top candidate is marked rejected with its rejection reasons, the recommended action is record_ontology_gap and the only planned fact is an observation, not a predicate fact.

This is the failure side of predicate suggestion: an unsuitable schema must not be offered as a safe apply plan. documentation/tests/e2e/packed/predicate-suggestion-relevance.test.ts "SYM-kibi-predicate-suggestion-relevance-e2e" exercises it.
