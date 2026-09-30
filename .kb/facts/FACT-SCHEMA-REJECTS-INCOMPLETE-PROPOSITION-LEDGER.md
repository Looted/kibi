---
title: Incomplete proposition ledgers are rejected predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.ingestion
predicate_name: rejects_incomplete_proposition_ledger
predicate_arity: 1
argument_names:
  - write_kind
argument_types:
  - requirement_write_kind
argument_descriptions:
  - Write that must carry a complete ledger.
examples:
  - rejects_incomplete_proposition_ledger(current_requirement_write)
id: FACT-SCHEMA-REJECTS-INCOMPLETE-PROPOSITION-LEDGER
type: fact
---
Predicate schema for rejects_incomplete_proposition_ledger/1.
