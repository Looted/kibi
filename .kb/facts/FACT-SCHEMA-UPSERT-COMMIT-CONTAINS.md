---
title: Upsert commit stages predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.persistence
predicate_name: upsert_commit_contains
predicate_arity: 8
argument_names:
  - lock
  - validation
  - mutation
  - contradiction_check
  - entity_audit
  - relationship_audit
  - audit_sync
  - save
argument_types:
  - commit_stage
  - commit_stage
  - commit_stage
  - commit_stage
  - commit_stage
  - commit_stage
  - commit_stage
  - commit_stage
argument_descriptions:
  - Write lock held for the commit.
  - Snapshot validation step.
  - RDF mutation step.
  - Contradiction check step.
  - Entity audit row step.
  - Relationship audit row step.
  - Audit journal synchronization step.
  - Snapshot save step.
examples:
  - upsert_commit_contains(branch_lock,snapshot_validation,rdf_mutation,contradiction_check,entity_audit,relationship_audit,audit_sync,snapshot_save)
id: FACT-SCHEMA-UPSERT-COMMIT-CONTAINS
type: fact
---
Predicate schema for upsert_commit_contains/8.
