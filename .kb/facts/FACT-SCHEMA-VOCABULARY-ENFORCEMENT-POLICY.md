---
title: Vocabulary enforcement policy
status: active
fact_kind: predicate_schema
predicate_name: vocabulary_enforcement_policy
predicate_namespace: kibi.modeling
predicate_arity: 3
argument_names:
  - surface
  - violation
  - action
argument_types:
  - operation
  - vocabulary_violation
  - enforcement_action
argument_descriptions:
  - Operation that sees the value.
  - Kind of vocabulary violation.
  - What the operation does with it.
argument_constants:
  surface:
    - kb_upsert
    - kb_suggest_predicates
  violation:
    - undeclared_argument_constant
    - argument_alias
  action:
    - reject
    - reject_with_declared_constant
    - bind_declared_constant
    - leave_unbound
examples:
  - vocabulary_enforcement_policy(kb_upsert,undeclared_argument_constant,reject)
tags:
  - ontology
  - vocabulary-convergence
id: FACT-SCHEMA-VOCABULARY-ENFORCEMENT-POLICY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
