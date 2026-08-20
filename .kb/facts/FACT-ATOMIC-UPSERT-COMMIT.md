---
id: FACT-ATOMIC-UPSERT-COMMIT
title: Upsert commits all mutation stages under one branch lock
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/facts/FACT-ATOMIC-UPSERT-COMMIT.md
tags: [lane:ontology, persistence, upsert, concurrency]
fact_kind: predicate
predicate_namespace: kibi.persistence
predicate_name: upsert_commit_contains
predicate_args: [branch_lock, snapshot_validation, rdf_mutation, contradiction_check, entity_audit, relationship_audit, audit_sync, snapshot_save]
canonical_key: upsert_commit_contains(branch_lock,snapshot_validation,rdf_mutation,contradiction_check,entity_audit,relationship_audit,audit_sync,snapshot_save)
polarity: assert
claim_key: CLAIM-64926C47C2848B43
claim_text: Each `kb_upsert` mutation must execute one bounded Prolog commit that holds the branch write lock while it validates the attached snapshot, applies the entity and relationships, checks contradictions, records entity and relationship audit rows, synchronizes the audit journal, and saves one RDF snapshot
claim_span_start: 0
claim_span_end: 303
---

Ground representation of the single locked upsert commit.
