---
title: Schema-less predicate facts are conformance warnings
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - predicate_schema_conformance
  - missing_predicate_schema
  - warning
polarity: assert
canonical_key: check_finding_policy(predicate_schema_conformance,missing_predicate_schema,warning)
claim_key: CLAIM-16463B2F63CFD582
claim_text: Kibi check must report a predicate fact with no schema for its namespace, name, and arity as a predicate-schema-conformance warning
text_ref: .kb/requirements/REQ-kibi-predicate-schema-conformance.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-CONFORMANCE-MISSING-SCHEMA
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
