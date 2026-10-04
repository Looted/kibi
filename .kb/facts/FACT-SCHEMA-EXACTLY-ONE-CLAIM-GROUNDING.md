---
title: Propositions have exactly one grounding predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.ingestion
predicate_name: exactly_one_claim_grounding
predicate_arity: 2
argument_names:
  - proposition
  - grounding_key
argument_types:
  - proposition_kind
  - claim_identity_field
argument_descriptions:
  - Kind of proposition that is grounded.
  - Field that pairs the proposition with its grounding fact.
examples:
  - exactly_one_claim_grounding(modeled_proposition,claim_key)
id: FACT-SCHEMA-EXACTLY-ONE-CLAIM-GROUNDING
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Predicate schema for exactly_one_claim_grounding/2.
