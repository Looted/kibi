---
title: Every host hook decides paths, Kibi MCP calls and the knowledge index with the shared agent-core functions
status: active
priority: must
tags:
  - hooks
  - agent-core
origin:
  kind: agent
  recorded_at: '2026-11-04T14:37:05.639Z'
id: SCEN-agent-core-shared-hook-inputs
type: scenario
---
# Every host hook decides paths, Kibi MCP calls and the knowledge index with the shared agent-core functions

Given the Claude Code, Codex, Cursor and ZCode hook packages
When a hook classifies an edited workspace path, recognizes a Kibi MCP tool call or loads the knowledge index
Then it calls `classifyPath`, the shared MCP tool name rule (`extractKbMcpToolCall` or `canonicalKbToolName`) and `loadKnowledgeIndex` from kibi-agent-core, directly or through a wrapper that only delegates,
And no host declares its own version of those decisions, so every host reaches the same decision for the same input.
