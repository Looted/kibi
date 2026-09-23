---
title: Provider allowed operation
status: active
tags:
  - ontology
  - plugins
  - operation
fact_kind: predicate_schema
predicate_name: provider_allowed_operation
predicate_namespace: kibi.capability
predicate_arity: 3
argument_names:
  - provider
  - operation
  - decision
argument_types:
  - provider
  - operation
  - decision
argument_descriptions:
  - The provider class being constrained.
  - The operation under consideration.
  - The decision, allow or deny.
aliases:
  - provider allowed operation
  - external classifier allowlist
  - maintenance operation denial
examples:
  - provider_allowed_operation(external_semantic_classifier,kb_semantic_advisor,allow)
id: FACT-SCHEMA-PROVIDER-ALLOWED-OPERATION
type: fact
---
Defines whether a provider class may perform an operation. Reuse for external-call allowlists, maintenance-path denials, host-seam participation, and disclosure that is not enforcement.
