---
title: Duplicate proposition identities are rejected predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.ingestion
predicate_name: rejects_duplicate_proposition_identity
predicate_arity: 2
argument_names:
  - key_field
  - span_field
argument_types:
  - claim_identity_field
  - claim_identity_field
argument_descriptions:
  - Key that must be unique per proposition.
  - Span that must be unique per proposition.
examples:
  - rejects_duplicate_proposition_identity(claim_key,utf8_span)
id: FACT-SCHEMA-REJECTS-DUPLICATE-PROPOSITION-IDENTITY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Predicate schema for rejects_duplicate_proposition_identity/2.
