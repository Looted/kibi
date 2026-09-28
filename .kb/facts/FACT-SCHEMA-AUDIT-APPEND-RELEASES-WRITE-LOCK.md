---
title: Audit appends release the write lock predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.audit
predicate_name: audit_append_releases_write_lock
predicate_arity: 2
argument_names:
  - journal
  - release_point
argument_types:
  - audit_resource
  - lock_release_point
argument_descriptions:
  - Audit resource holding the lock.
  - When the lock is released.
examples:
  - audit_append_releases_write_lock(audit_journal,every_append)
id: FACT-SCHEMA-AUDIT-APPEND-RELEASES-WRITE-LOCK
type: fact
---
Predicate schema for audit_append_releases_write_lock/2.
