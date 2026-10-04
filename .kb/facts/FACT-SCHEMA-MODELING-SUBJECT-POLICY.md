---
title: Modeling subject policy
status: active
fact_kind: predicate_schema
predicate_name: modeling_subject_policy
predicate_namespace: kibi.modeling
predicate_arity: 3
argument_names:
  - operation
  - subject_match
  - outcome
argument_types:
  - operation
  - subject_match
  - plan_outcome
argument_descriptions:
  - Modeling operation.
  - Whether an existing subject matches the clause.
  - What the returned plan must do with the subject.
examples:
  - modeling_subject_policy(kb_model_requirement,existing_subject_match,reuse_subject_fact)
tags:
  - ontology
  - vocabulary-convergence
id: FACT-SCHEMA-MODELING-SUBJECT-POLICY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
