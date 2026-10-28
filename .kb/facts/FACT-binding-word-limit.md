---
title: The maximum bound participant name length shall be 3 words
status: active
fact_kind: property_value
subject_key: kibi.predicate_suggestion.binding
claim_key: CLAIM-0177F086CAF82496
claim_text: The maximum bound participant name length shall be 3 words
text_ref: REQ-model-predicates-binding-word-limit
property_key: max_naming_binding_words
operator: eq
value_type: int
value_int: 3
origin:
  kind: agent
  recorded_at: '2026-10-28T10:14:08.876Z'
id: FACT-binding-word-limit
type: fact
---
MAX_NAMING_BINDING_WORDS in packages/cli/src/operations/modeling/predicate-bindings.ts is the word limit REQ-model-predicates-binding-clauses applies: a participant value with more words is a clause and stays unbound. This requirement states the limit as a number so it is proved against the constant.