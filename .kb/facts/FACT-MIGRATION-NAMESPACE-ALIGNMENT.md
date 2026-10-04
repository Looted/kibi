---
title: Unique-schema namespace drift migrates automatically
status: active
fact_kind: predicate
predicate_name: migration_action_policy
predicate_namespace: kibi.migration
predicate_args:
  - predicate_namespace_drift
  - automatic
  - move_to_schema_namespace
polarity: assert
canonical_key: migration_action_policy(predicate_namespace_drift,automatic,move_to_schema_namespace)
claim_key: CLAIM-B305A14FDA81D254
claim_text: Kibi migrate must plan an automatic action that moves a predicate fact to the only namespace whose schema matches its name and arity
text_ref: .kb/requirements/REQ-kibi-predicate-vocabulary-migration.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-MIGRATION-NAMESPACE-ALIGNMENT
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
