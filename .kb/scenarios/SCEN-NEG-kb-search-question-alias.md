---
title: kb_search given an undeclared name or both names for its query is refused
status: active
expects: rejection
tags:
  - mcp
  - validation
  - search
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-26T11:04:11.379Z'
id: SCEN-NEG-kb-search-question-alias
type: scenario
---
Given a kb_search call that sends its text as search, a name the query field does not declare, or that sends both query and question, when MCP or the CLI JSON route validates it, then the call is refused with VALIDATION_FAILED naming the extra field as unknown, and the search does not run.