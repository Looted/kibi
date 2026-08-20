---
title: MCP annotation truth policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: mcp_annotation_truth_policy
predicate_namespace: kibi.domain
predicate_arity: 3
argument_names:
  - surface
  - client_mode
  - truthfulness
argument_types:
  - surface
  - client_mode
  - policy
argument_descriptions:
  - Public operation surface.
  - Client interaction mode.
  - Required relationship between annotations and behavior.
examples:
  - mcp_annotation_truth_policy(kibi_mcp,non_interactive,truthful)
id: FACT-SCHEMA-MCP-ANNOTATION-TRUTH-POLICY
type: fact
---
