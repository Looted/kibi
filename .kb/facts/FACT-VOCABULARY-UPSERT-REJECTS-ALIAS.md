---
title: kb_upsert rejects aliases and names the constant
status: active
fact_kind: predicate
predicate_name: vocabulary_enforcement_policy
predicate_namespace: kibi.modeling
predicate_args:
  - kb_upsert
  - argument_alias
  - reject_with_declared_constant
polarity: assert
canonical_key: vocabulary_enforcement_policy(kb_upsert,argument_alias,reject_with_declared_constant)
claim_key: CLAIM-9B2E13B0013D801A
claim_text: kb_upsert must reject a predicate fact that uses an argument alias and name the declared constant to use
text_ref: .kb/requirements/REQ-kibi-predicate-argument-constants.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-VOCABULARY-UPSERT-REJECTS-ALIAS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
