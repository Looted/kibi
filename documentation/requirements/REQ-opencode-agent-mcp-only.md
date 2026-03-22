---
id: REQ-opencode-agent-mcp-only
title: OpenCode agent guidance uses MCP-only Kibi workflows
status: open
created_at: 2026-03-22T00:00:00Z
updated_at: 2026-03-22T00:00:00Z
source: documentation/requirements/REQ-opencode-agent-mcp-only.md
priority: must
owner: opencode-team
tags:
  - opencode
  - agent
  - mcp
  - policy
  - guidance
links:
  - type: depends_on
    target: REQ-opencode-kibi-plugin-v1
  - type: relates_to
    target: ADR-018
  - type: specified_by
    target: SCEN-opencode-agent-mcp-only
  - type: verified_by
    target: TEST-opencode-agent-mcp-only
---

The OpenCode agent experience must:

1. In agent-visible guidance, name only the public MCP tools (`kb_query`, `kb_upsert`, `kb_delete`, `kb_check`) and sanctioned slash commands.
2. Never instruct direct `kibi` CLI usage for query, upsert, check, sync, init, doctor, branch, or gc flows.
3. Prefer `/init-kibi` for bootstrap in OpenCode; when more repair is needed, instruct the agent to ask the user/operator to perform it outside the agent session.
4. Describe background sync and validation as automatic plugin maintenance, not as agent actions.
5. Direct `.kb/**` warnings toward public MCP tools rather than CLI flows.
6. Be protected by regression tests that fail when forbidden CLI guidance reappears.
