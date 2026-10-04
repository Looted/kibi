---
title: Built-in catalog predicates conform
status: active
fact_kind: predicate
predicate_name: check_exemption_policy
predicate_namespace: kibi.checks
predicate_args:
  - predicate_schema_conformance
  - built_in_catalog_signature
polarity: assert
canonical_key: check_exemption_policy(predicate_schema_conformance,built_in_catalog_signature)
claim_key: CLAIM-B0A9BB1F9853B9C8
claim_text: Predicate facts in the default namespace that match the built-in predicate catalog must not be reported by predicate-schema-conformance
text_ref: .kb/requirements/REQ-kibi-predicate-schema-conformance.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-CONFORMANCE-BUILTIN-EXEMPT
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
