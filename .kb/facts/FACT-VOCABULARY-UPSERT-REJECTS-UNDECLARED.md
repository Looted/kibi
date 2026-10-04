---
title: kb_upsert rejects undeclared argument constants
status: active
fact_kind: predicate
predicate_name: vocabulary_enforcement_policy
predicate_namespace: kibi.modeling
predicate_args:
  - kb_upsert
  - undeclared_argument_constant
  - reject
polarity: assert
canonical_key: vocabulary_enforcement_policy(kb_upsert,undeclared_argument_constant,reject)
claim_key: CLAIM-E9425E1032312CAE
claim_text: kb_upsert must reject a predicate fact whose argument value is not a declared constant of its schema
text_ref: .kb/requirements/REQ-kibi-predicate-argument-constants.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-VOCABULARY-UPSERT-REJECTS-UNDECLARED
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
