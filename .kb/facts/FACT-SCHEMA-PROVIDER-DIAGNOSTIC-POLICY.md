---
title: Provider diagnostic policy
status: active
tags:
  - ontology
  - plugins
  - diagnostics
fact_kind: predicate_schema
predicate_name: provider_diagnostic_policy
predicate_namespace: kibi.capability
predicate_arity: 3
argument_names:
  - surface
  - field
  - exposure
argument_types:
  - surface
  - field
  - exposure
argument_descriptions:
  - The diagnostic or provenance surface.
  - The field or detail governed by the policy.
  - The exposure decision, such as expose, deny, or read-only.
aliases:
  - provider diagnostic policy
  - plugin provenance
  - credential redaction
  - doctor plugin diagnostic
examples:
  - provider_diagnostic_policy(kibi_doctor,configured_plugin_row,read_only_no_import)
id: FACT-SCHEMA-PROVIDER-DIAGNOSTIC-POLICY
type: fact
---
Defines what a diagnostic or provenance surface may expose. Reuse for read-only doctor output, effective model identity, and the prohibition on printing credentials.
