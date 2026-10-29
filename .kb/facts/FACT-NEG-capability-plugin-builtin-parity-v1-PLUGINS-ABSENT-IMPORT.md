---
title: A host without kibi.plugins configuration would load a plugin beside the builtin providers
status: active
fact_kind: predicate
predicate_namespace: default
predicate_name: conditional_behavior
predicate_args:
  - kibi_host
  - kibi_plugins_absent
  - builtin_providers_only
polarity: deny
canonical_key: conditional_behavior(kibi_host,kibi_plugins_absent,builtin_providers_only)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:54.190Z'
id: FACT-NEG-capability-plugin-builtin-parity-v1-PLUGINS-ABSENT-IMPORT
type: fact
---
