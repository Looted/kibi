---
title: Kibi's read operations accept a kb argument naming a KB dependency
status: active
tags:
  - lane:ontology
  - predicate:dependencies
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - read_operations
  - kb_argument
  - accept_dependency_name_over_mcp_and_cli
canonical_key: kb_dependency_policy(read_operations,kb_argument,accept_dependency_name_over_mcp_and_cli)
polarity: assert
claim_key: CLAIM-12CFD74D2BA5EF66
claim_text: Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI
text_ref: .kb/requirements/REQ-kb-dependencies-git.md
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:19.775Z'
id: FACT-PRED-kb-dependencies-kb-argument
type: fact
---
Kibi's read operations accept a kb argument naming a KB dependency. This predicate grounds the claim of REQ-kb-dependencies-git quoted in claim_text, so the requirement's semantic inventory counts it as modeled.