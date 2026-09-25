---
title: Capability provider mode
status: active
tags:
  - ontology
  - plugins
  - mode
fact_kind: predicate_schema
predicate_name: capability_mode
predicate_namespace: kibi.capability
predicate_arity: 3
argument_names:
  - capability
  - mode
  - effect
argument_types:
  - capability
  - provider_mode
  - mode_effect
argument_descriptions:
  - The capability family the mode applies to.
  - The provider mode.
  - The required effect of that mode on canonical results.
aliases:
  - capability provider mode
  - replace augment shadow
  - shadow non-canonical
examples:
  - capability_mode(kibi_capability,shadow,non_canonical)
id: FACT-SCHEMA-CAPABILITY-MODE
type: fact
---
Defines the observable effect of a capability provider mode. Reuse for any capability that distinguishes canonical replacement, additive augmentation, and non-canonical shadow execution.
