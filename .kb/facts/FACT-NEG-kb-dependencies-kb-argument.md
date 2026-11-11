---
title: A kb argument that names no declared KB dependency
status: active
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - read_operations
  - kb_argument
  - accept_dependency_name_over_mcp_and_cli
canonical_key: kb_dependency_policy(read_operations,kb_argument,accept_dependency_name_over_mcp_and_cli)
polarity: deny
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:20.779Z'
id: FACT-NEG-kb-dependencies-kb-argument
type: fact
---
A kb argument that names no declared KB dependency. The failure-side scenario of REQ-kb-dependency-kb-argument assumes this state and expects Kibi to refuse it with a coded error instead of answering.