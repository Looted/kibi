---
title: Unknown units are never equated
status: active
fact_kind: predicate
predicate_name: unit_comparison_policy
predicate_namespace: kibi.checks
predicate_args:
  - unknown_or_ambiguous_unit
  - never_equate
polarity: assert
canonical_key: unit_comparison_policy(unknown_or_ambiguous_unit,never_equate)
claim_key: CLAIM-C2674CFCC7DD3694
claim_text: Unknown or ambiguous units must never be equated with a different unit
text_ref: .kb/requirements/REQ-kibi-unit-canonicalization.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-UNIT-UNKNOWN-NEVER-EQUATED
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
