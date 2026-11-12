---
id: FACT-SCHEMA-RESULT-STATUS-VISIBILITY
title: Result status visibility predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: result_status_visibility
predicate_arity: 3
argument_names:
  - contract
  - status_field
  - visibility
argument_types:
  - result_contract
  - status_field
  - visibility_mode
argument_descriptions:
  - Result contract that carries the status.
  - Status field the contract reports.
  - How the status must be shown.
examples:
  - "result_status_visibility('source_analysis.v2',completeness,explicit)"
type: fact
---

Grounds which result statuses must be reported explicitly.
