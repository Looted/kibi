---
title: Capability activation source
status: active
tags:
  - ontology
  - plugins
  - activation
fact_kind: predicate_schema
predicate_name: capability_activation_source
predicate_namespace: kibi.capability
predicate_arity: 3
argument_names:
  - subject
  - source
  - policy
argument_types:
  - component
  - config_source
  - activation_policy
argument_descriptions:
  - The capability or plugin subject being activated.
  - The configuration source that activates it.
  - The activation policy, such as explicit-only or canonical v1.
aliases:
  - capability activation source
  - explicit package.json activation
  - kibi.plugins activation
examples:
  - capability_activation_source(capability_plugin,package_json_kibi_plugins,explicit_only)
id: FACT-SCHEMA-CAPABILITY-ACTIVATION-SOURCE
type: fact
---
Defines where a capability is activated and whether that source is explicit. Reuse for any future capability family that is enabled from project configuration rather than ambient discovery.
