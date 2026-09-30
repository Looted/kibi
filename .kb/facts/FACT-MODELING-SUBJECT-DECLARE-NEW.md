---
title: Modeling declares new subjects explicitly
status: active
fact_kind: predicate
predicate_name: modeling_subject_policy
predicate_namespace: kibi.modeling
predicate_args:
  - kb_model_requirement
  - no_subject_match
  - declare_new_subject
polarity: assert
canonical_key: modeling_subject_policy(kb_model_requirement,no_subject_match,declare_new_subject)
claim_key: CLAIM-8902FAF155FB6FFC
claim_text: kb_model_requirement must explicitly declare a new subject when no existing subject matches the clause
text_ref: .kb/requirements/REQ-kibi-subject-vocabulary.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-MODELING-SUBJECT-DECLARE-NEW
type: fact
---
