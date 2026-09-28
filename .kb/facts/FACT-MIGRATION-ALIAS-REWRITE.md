---
title: Aliases migrate to declared constants automatically
status: active
fact_kind: predicate
predicate_name: migration_action_policy
predicate_namespace: kibi.migration
predicate_args:
  - predicate_argument_alias
  - automatic
  - rewrite_to_declared_constant
polarity: assert
canonical_key: migration_action_policy(predicate_argument_alias,automatic,rewrite_to_declared_constant)
claim_key: CLAIM-6F161AFB10D651EE
claim_text: Kibi migrate must plan an automatic action that rewrites an argument alias to its declared constant
text_ref: .kb/requirements/REQ-kibi-predicate-vocabulary-migration.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-MIGRATION-ALIAS-REWRITE
type: fact
---
