---
id: FACT-SCHEMA-NO-FITTING-SCHEMA
title: No fitting schema predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: no_fitting_schema
predicate_arity: 1
argument_names:
  - clause
argument_types:
  - clause_kind
argument_descriptions:
  - Kind of clause no catalog schema fits.
examples:
  - "no_fitting_schema(launcher_dependency_clause)"
type: fact
---

Grounds clauses that predicate suggestion must report as an ontology gap.
