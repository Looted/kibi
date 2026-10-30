---
title: A query with an unknown entity type is rejected with the valid types instead of an empty result
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:24:27.611Z'
id: SCEN-NEG-mcp-tool-query-UNKNOWN-TYPE
type: scenario
---
Given an initialized and synced repository, when a query asks for entities of the type requirement-typo, then it fails with a non-zero exit, the error names the rejected type and lists the valid entity types, and no empty result is printed.

This is the failure side of filtered entity queries: a misspelled type filter must surface as an error rather than look like a knowledge base with no matches. documentation/tests/e2e/packed/init-sync-check.test.ts "should reject a query for an unknown entity type and name the valid types" exercises it through the packed CLI query route.
