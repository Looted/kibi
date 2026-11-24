---
title: The MCP launcher does not proxy the project-local kibi-mcp is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:22.198Z'
id: SCEN-NEG-antigravity-no-local-proxy
type: scenario
---
Given a Kibi workspace with a project-local kibi-mcp, when the launcher attaches, then it proxies that server; a launcher that does not is rejected. packages/antigravity/tests/serve-deferred.test.ts and mcp-launcher-port.test.ts cover attaching to the project-local and global servers.