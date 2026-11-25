---
title: The VS Code extension must register the Kibi MCP server through…
status: closed
firmness: firm
origin:
  kind: human
  ref: VS Code has no static contributes.mcp.servers key. The only route for an extension is contributes.mcpServerDefinitionProviders plus vscode.lm.registerMcpServerDefinitionProvider.
  recorded_at: '2026-11-25T14:51:23.806Z'
rationale: VS Code has no static contributes.mcp.servers key; contributes.mcpServerDefinitionProviders plus vscode.lm.registerMcpServerDefinitionProvider is the only supported route for an extension to register an MCP server.
semantic_text: The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider for opted-in workspaces owning .kb/manifest.json, resolving kibi.mcp.serverPath, project-local kibi-mcp, or PATH, and skip registration cleanly when the host API is unavailable.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7f62142780be90128348dcf1085ef1ac0adaa5152317eb715e3efd909695faf3
semantic_inventory:
  - claim_key: CLAIM-A0E0F8C2FBBF7BF8
    claim_text: The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider for opted-in workspaces owning .kb/manifest.json, resolving kibi.mcp.serverPath, project-local kibi-mcp, or PATH, and skip registration cleanly when the host API is unavailable
    role: normative
    status: missing
    span:
      start: 0
      end: 286
    subjects:
      - vscode.mcp_provider
logic_claims:
  - CLAIM-A0E0F8C2FBBF7BF8
id: REQ-vs-code-extension-register-kibi-mcp
type: req
tags:
  - vscode
  - mcp
  - historical-status:superseded
approval_ref: 'PR #879 review: superseded by REQ-vscode-mcp-server-provider with clean title, agent origin, and atomic clauses'
---
The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider for opted-in workspaces owning .kb/manifest.json, resolving kibi.mcp.serverPath, project-local kibi-mcp, or PATH, and skip registration cleanly when the host API is unavailable.

## Context

VS Code has no static contributes.mcp.servers key; contributes.mcpServerDefinitionProviders plus vscode.lm.registerMcpServerDefinitionProvider is the only supported route for an extension to register an MCP server.

## Source

> VS Code has no static contributes.mcp.servers key. The only route for an extension is contributes.mcpServerDefinitionProviders plus vscode.lm.registerMcpServerDefinitionProvider.
