---
title: A discovery call against a core install missing discovery.pl fails closed instead of answering
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:18.534Z'
id: SCEN-NEG-mcp-search-discovery-BROKEN-CORE
type: scenario
---
Given kibi-mcp pointed at an isolated core root that has kb.pl but no discovery.pl sibling, when an agent calls kb_graph for a seed requirement, then the call fails with an error that names the root consistency problem rather than returning an empty or partial graph.

This is the failure side of the curated discovery surface: a broken install must not hand agents discovery answers that look valid but come from a missing module. documentation/tests/e2e/packed/discovery-bundle.test.ts "fails closed when isolated core root is missing discovery.pl sibling" exercises it.
