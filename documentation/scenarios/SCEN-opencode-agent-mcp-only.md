---
id: SCEN-opencode-agent-mcp-only
title: OpenCode agent guidance stays MCP-only
type: scenario
status: draft
created_at: 2026-03-22T00:00:00Z
updated_at: 2026-03-22T00:00:00Z
source: documentation/scenarios/SCEN-opencode-agent-mcp-only.md
priority: must
tags:
  - opencode
  - agent
  - mcp
  - guidance
links:
  - REQ-opencode-agent-mcp-only
  - type: verified_by
    target: TEST-opencode-agent-mcp-only
---

## Scenario

An AI agent is working in OpenCode with the Kibi plugin active.

### Steps

1. Agent edits `src/app.ts`.
2. Plugin injects guidance telling the agent to query context with `kb_query` and keep KB mutations on the public MCP surface.
3. Agent edits a requirement document.
4. Plugin guidance tells the agent to keep REQ/SCEN/TEST separate and use MCP writes and validation for KB changes.
5. Agent triggers a bootstrap-needed state.
6. Plugin suggests `/init-kibi`; if additional repair is needed, it tells the agent to ask the user/operator for help.
7. Relevant edits still trigger background sync and validation automatically.

### Expected Outcomes

- No agent-visible guidance tells the agent to run direct `kibi` CLI commands.
- The agent can complete KB work with MCP tools and `/init-kibi`.
- Background maintenance remains non-blocking and automatic.
