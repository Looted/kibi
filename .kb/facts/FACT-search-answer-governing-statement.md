---
title: 'Each governing requirement in a kb_search answer must carry its statement: its semantic_text, else the statement its body derives, cut to at most 300 characters'
status: active
fact_kind: property_value
subject_key: kibi.search_answer.requirement_statements
property_key: governing_requirements_without_statement_within_300_characters
operator: eq
value_type: int
value_int: 0
claim_text: 'Each governing requirement in a kb_search answer must carry its statement: its semantic_text, else the statement its body derives, cut to at most 300 characters'
text_ref: REQ-search-answer-governing-statement
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-search-answer-governing-statement
origin:
  kind: agent
  recorded_at: '2026-11-16T15:40:36.941Z'
claim_key: CLAIM-E5FBF3D4E18C4E8D
id: FACT-search-answer-governing-statement
type: fact
---
Counts governing requirements with prose that reach a kb_search answer without `statement`, or with one over 300 characters; zero means each carries what it says.