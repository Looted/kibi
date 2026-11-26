---
title: kb_search given both a query and a question is refused
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
Given a kb_search call that sends both query and question, when MCP or the CLI JSON route validates it, then the call is refused with VALIDATION_FAILED naming question as an unknown field, and the search does not run.