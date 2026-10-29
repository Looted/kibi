---
title: A plugin exports a provider version that differs from its resolved package.json version
status: active
fact_kind: predicate
predicate_namespace: default
predicate_name: consistency_rule
predicate_args:
  - exported_provider_version
  - resolved_package_version
polarity: deny
canonical_key: consistency_rule(exported_provider_version,resolved_package_version)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:34.285Z'
id: FACT-NEG-capability-plugin-protocol-v1-VERSION-DRIFT
type: fact
---
