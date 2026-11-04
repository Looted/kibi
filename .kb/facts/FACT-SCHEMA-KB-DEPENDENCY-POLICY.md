---
title: KB dependency policy schema
status: active
tags:
  - lane:ontology
  - predicate-schema
  - dependencies
fact_kind: predicate_schema
predicate_name: kb_dependency_policy
predicate_arity: 3
argument_names:
  - subject
  - aspect
  - policy
argument_types:
  - dependency_surface
  - dependency_aspect
  - dependency_policy
argument_descriptions:
  - 'The Kibi surface that handles a KB dependency: a read, the read operations, or kibi deps lock.'
  - The part of that surface the policy governs, such as the commit read, the answer source or the KB schema.
  - What Kibi must do for that aspect.
examples:
  - kb_dependency_policy(kb_dependency_read,declared_dependency,pinned_lock_commit_only)
origin:
  kind: agent
  recorded_at: '2026-11-04T11:10:16.874Z'
id: FACT-SCHEMA-KB-DEPENDENCY-POLICY
type: fact
---
Predicate schema for the claims of REQ-kb-dependencies-git: which commit a dependency is read at, where its answers come from, which KB schemas are accepted, what kibi deps lock records, and which operations take the kb argument.