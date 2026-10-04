---
title: Suggestions bind aliases to constants
status: active
fact_kind: predicate
predicate_name: vocabulary_enforcement_policy
predicate_namespace: kibi.modeling
predicate_args:
  - kb_suggest_predicates
  - argument_alias
  - bind_declared_constant
polarity: assert
canonical_key: vocabulary_enforcement_policy(kb_suggest_predicates,argument_alias,bind_declared_constant)
claim_key: CLAIM-A877435F3AFCE358
claim_text: kb_suggest_predicates must bind an argument alias to its declared constant
text_ref: .kb/requirements/REQ-kibi-predicate-argument-constants.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-VOCABULARY-SUGGEST-BINDS-ALIAS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
