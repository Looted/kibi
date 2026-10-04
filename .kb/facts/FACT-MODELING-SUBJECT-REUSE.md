---
title: Modeling reuses a matching subject fact
status: active
fact_kind: predicate
predicate_name: modeling_subject_policy
predicate_namespace: kibi.modeling
predicate_args:
  - kb_model_requirement
  - existing_subject_match
  - reuse_subject_fact
polarity: assert
canonical_key: modeling_subject_policy(kb_model_requirement,existing_subject_match,reuse_subject_fact)
claim_key: CLAIM-CB05263E55AFCDE3
claim_text: kb_model_requirement must reuse the existing subject fact when the ranked vocabulary matches the clause
text_ref: .kb/requirements/REQ-kibi-subject-vocabulary.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-MODELING-SUBJECT-REUSE
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
