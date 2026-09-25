---
title: Capability protocol contract
status: active
tags:
  - ontology
  - plugins
  - protocol
fact_kind: predicate_schema
predicate_name: capability_protocol_contract
predicate_namespace: kibi.capability
predicate_arity: 3
argument_names:
  - plugin
  - protocol
  - export_name
argument_types:
  - component
  - protocol
  - export_name
argument_descriptions:
  - The plugin surface being validated.
  - The required protocol identifier.
  - The required named export.
aliases:
  - capability plugin protocol
  - named export kibiPlugin
  - validated kibi.plugin.v1
examples:
  - capability_protocol_contract(capability_plugin,kibi.plugin.v1,kibiPlugin)
id: FACT-SCHEMA-CAPABILITY-PROTOCOL-CONTRACT
type: fact
---
Defines which protocol identifier and named export make a capability plugin valid. Reuse this schema for later protocol versions instead of a one-off plugin fact.
