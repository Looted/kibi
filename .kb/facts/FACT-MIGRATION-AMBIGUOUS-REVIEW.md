---
title: Ambiguous or undeclared predicates stay reviews
status: active
fact_kind: predicate
predicate_name: migration_action_policy
predicate_namespace: kibi.migration
predicate_args:
  - ambiguous_or_undeclared_predicate
  - review
  - no_automatic_repair
polarity: assert
canonical_key: migration_action_policy(ambiguous_or_undeclared_predicate,review,no_automatic_repair)
claim_key: CLAIM-50D3C066969E4E3F
claim_text: Ambiguous namespaces and undeclared argument values must remain review actions
text_ref: .kb/requirements/REQ-kibi-predicate-vocabulary-migration.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-MIGRATION-AMBIGUOUS-REVIEW
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
