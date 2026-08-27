---
title: MCP operation annotation policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: mcp_operation_annotation_policy
predicate_namespace: kibi.domain
predicate_arity: 5
argument_names:
  - operation
  - read_only
  - destructive
  - idempotent
  - world_model
argument_types:
  - operation
  - boolean
  - boolean
  - boolean
  - world_model
argument_descriptions:
  - Public operation.
  - Whether the operation is read-only.
  - Whether the operation is destructive.
  - Whether repeated calls are idempotent.
  - Whether the result model is open or closed world.
examples:
  - mcp_operation_annotation_policy(kb_status,true,false,true,closed_world)
id: FACT-SCHEMA-MCP-OPERATION-ANNOTATION-POLICY
type: fact
---
