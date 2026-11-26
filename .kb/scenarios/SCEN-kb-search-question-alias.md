---
title: kb_search given a question and no query searches for the question
status: active
expects: success
tags:
  - mcp
  - validation
  - search
origin:
  kind: agent
  recorded_at: '2026-11-26T11:04:10.436Z'
id: SCEN-kb-search-question-alias
type: scenario
---
Given an agent that calls kb_search before the tool's schema is in its prompt, when it sends question with no query over MCP or on the CLI JSON route, then Kibi validates and runs the search with that text as its query instead of refusing the call.