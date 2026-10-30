---
title: The installed kibi-runtime has no bundled engine daemon entry point
status: active
fact_kind: predicate
polarity: deny
predicate_args:
  - kibi.runtime.packaging
  - ships_self_contained_engine_daemon_entry_point
  - runtime_engine_client_resolves_without_nested_kibi_cli
predicate_name: logical_requirement_rule
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.runtime.packaging,ships_self_contained_engine_daemon_entry_point,runtime_engine_client_resolves_without_nested_kibi_cli)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:17.676Z'
id: FACT-NEG-runtime-packed-engine-daemon-MISSING-BUNDLED-DAEMON
type: fact
---
