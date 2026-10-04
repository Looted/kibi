---
title: Stale predicate repairs are refused
status: active
fact_kind: predicate
predicate_name: migration_action_policy
predicate_namespace: kibi.migration
predicate_args:
  - predicate_fact_changed_since_planning
  - automatic
  - refuse_write
polarity: assert
canonical_key: migration_action_policy(predicate_fact_changed_since_planning,automatic,refuse_write)
claim_key: CLAIM-31313EB99F051337
claim_text: Applying a predicate repair must fail when the fact changed since planning
text_ref: .kb/requirements/REQ-kibi-predicate-vocabulary-migration.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-MIGRATION-STALE-FACT-REFUSED
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
