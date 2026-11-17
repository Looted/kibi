---
title: A governing requirement reaches the answer without its statement
status: active
fact_kind: property_value
subject_key: kibi.search_answer.requirement_statements
property_key: governing_requirements_without_statement_within_300_characters
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T15:40:39.591Z'
id: FACT-NEG-search-answer-governing-statement-MISSING
type: fact
---
A requirement with a semantic_text is listed as governing, but its entry carries only its id and title, so the agent reads the rule's neighbours and not the rule.