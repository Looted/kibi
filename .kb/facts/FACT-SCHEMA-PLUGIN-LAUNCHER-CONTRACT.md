---
title: Plugin launcher contract schema
status: active
tags:
  - ontology
  - strict-semantics
  - plugin
  - launcher
fact_kind: predicate_schema
predicate_name: plugin_launcher_contract
predicate_namespace: kibi.launcher
predicate_arity: 3
argument_names:
  - launcher
  - aspect
  - expected_behavior
argument_types:
  - component
  - contract_aspect
  - policy
argument_descriptions:
  - The consumer-facing plugin launcher.
  - The launcher contract aspect being constrained.
  - The required observable behavior for that aspect.
aliases:
  - consumer-local launcher behavior
  - plugin launcher policy
  - launcher contract
examples:
  - plugin_launcher_contract(kibi_cursor_launcher,dependency_runtime_resolution,consumer_project_local_only_no_download)
id: FACT-SCHEMA-PLUGIN-LAUNCHER-CONTRACT
type: fact
---
