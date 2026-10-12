---
title: An agent host receives each discovery result once, in the form it can read
status: active
tags:
  - mcp
  - search
  - search-lane
priority: must
origin:
  kind: agent
  recorded_at: '2026-10-11T20:40:09.009Z'
id: SCEN-mcp-structured-text-per-host
type: scenario
---
# An agent host receives each discovery result once, in the form it can read

Given a synced KB with twelve requirements that match the same question
When Claude Code's launcher starts kibi-mcp (`KIBI_MCP_HOST=claude-code`), or a client that names itself `claude-code` on initialize, and calls `kb_query`
Then the text part is the summary alone and the entities arrive only in `structuredContent`
When another host (for example `KIBI_MCP_HOST=codex`) makes the same call
Then the text part carries the `data` JSON ahead of the summary, so a host that hides `structuredContent` still sees the answer
When `KIBI_MCP_STRUCTURED_TEXT` is `omit` or `embed`
Then that value decides for either host
When any host calls `kb_search` without a `limit`
Then ten ranked rows come back with `count: 12` and `truncated: true`