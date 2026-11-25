---
title: VS Code rejects static contributes.mcp and skips non-provider/non-KB registration
status: active
expects: rejection
tags:
  - vscode
  - mcp
origin:
  kind: agent
  recorded_at: '2026-11-25T15:00:44.984Z'
id: SCEN-vs-code-extension-register-kibi-mcp-reject
type: scenario
---
When contributes.mcp is checked by manifestContract.test.ts it must be absent, and when a workspace lacks .kb/manifest.json or vscode.lm.registerMcpServerDefinitionProvider is unavailable, registerMcpServerProvider registers no MCP server definitions.
