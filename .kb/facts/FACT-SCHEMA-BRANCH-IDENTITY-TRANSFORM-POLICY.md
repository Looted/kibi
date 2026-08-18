---
title: Branch identity transformation policy schema
status: active
tags:
  - ontology
  - branching
  - identity
  - normalization
  - rename
fact_kind: predicate_schema
predicate_name: branch_identity_transform_policy
predicate_namespace: kibi.git
predicate_arity: 3
argument_names:
  - identity
  - transformations
  - decision
argument_types:
  - entity
  - transformation_set
  - decision
argument_descriptions:
  - Branch identity being protected.
  - Reviewed set of prohibited transformations.
  - Whether those transformations are allowed.
aliases:
  - do not normalize or rename Git branches
  - exact branch identity
examples:
  - branch_identity_transform_policy(branch_local_kb,master_to_main__default_branch_inference__git_branch_rename,forbidden)
id: FACT-SCHEMA-BRANCH-IDENTITY-TRANSFORM-POLICY
type: fact
---
