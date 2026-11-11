---
title: kb_query never answers a partial id with a fuzzy match
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T06:45:00.000Z'
id: SCEN-NEG-mcp-search-discovery-FUZZY-QUERY
type: scenario
---
Given a KB with requirement REQ-DISC-001
When kibi query looks up the id REQ-DISC-00
Then it returns nothing instead of the requirement it resembles, while the exact id REQ-DISC-001 returns that requirement.

This is the failure side of exact lookup. documentation/tests/e2e/packed/discovery-bundle.test.ts "keeps kb_query exact: a partial id matches nothing" exercises it.
