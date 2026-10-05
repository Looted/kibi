---
title: Migration action policy
status: active
fact_kind: predicate_schema
predicate_name: migration_action_policy
predicate_namespace: kibi.migration
predicate_arity: 3
argument_names:
  - finding
  - safety
  - action
argument_types:
  - migration_finding
  - migration_safety
  - migration_effect
argument_descriptions:
  - Finding the migration plan reacts to.
  - Safety class of the planned action.
  - Effect of applying the action.
argument_constants:
  safety:
    - automatic
    - review
    - operator
    - execution
examples:
  - migration_action_policy(predicate_argument_alias,automatic,rewrite_to_declared_constant)
tags:
  - ontology
  - vocabulary-convergence
id: FACT-SCHEMA-MIGRATION-ACTION-POLICY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
