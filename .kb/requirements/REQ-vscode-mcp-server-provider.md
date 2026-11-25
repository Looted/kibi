---
title: VS Code extension registers Kibi MCP server via mcpServerDefinitionProviders
status: open
priority: must
firmness: firm
tags:
  - vscode
  - mcp
origin:
  kind: agent
  ref: 'VS Code extension API documentation for contributes.mcpServerDefinitionProviders and PR #879 review; approved by maintainer on 2026-11-25 ("Approve all")'
  approved_by: maintainer
  recorded_at: '2026-11-25T18:17:25.106Z'
rationale: VS Code has no static contributes.mcp.servers key; contributes.mcpServerDefinitionProviders plus vscode.lm.registerMcpServerDefinitionProvider is the supported extension route, and KIBI_MCP_ATTACH_ROOT preserves per-call workspace routing.
semantic_text: The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider. The VS Code MCP provider must return server definitions only for workspaces containing .kb/manifest.json. The VS Code MCP provider must pass KIBI_MCP_ATTACH_ROOT to the server environment instead of pinning KIBI_WORKSPACE. The VS Code extension must skip MCP provider registration when vscode.lm.registerMcpServerDefinitionProvider is unavailable.
semantic_clauses:
  - The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider.
  - The VS Code MCP provider must return server definitions only for workspaces containing .kb/manifest.json.
  - The VS Code MCP provider must pass KIBI_MCP_ATTACH_ROOT to the server environment instead of pinning KIBI_WORKSPACE.
  - The VS Code extension must skip MCP provider registration when vscode.lm.registerMcpServerDefinitionProvider is unavailable.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 70fde015fa3a08cd79dfc131957eb682e9b4681b278c5082014aa88beaca6f62
semantic_inventory:
  - claim_key: CLAIM-4440BD6F9437F6AE
    claim_text: The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider
    role: normative
    status: modeled
    span:
      start: 0
      end: 109
  - claim_key: CLAIM-398AF2770A5C6C2C
    claim_text: The VS Code MCP provider must return server definitions only for workspaces containing .kb/manifest.json
    role: normative
    status: modeled
    span:
      start: 111
      end: 215
  - claim_key: CLAIM-99A33D010BCC43F4
    claim_text: The VS Code MCP provider must pass KIBI_MCP_ATTACH_ROOT to the server environment instead of pinning KIBI_WORKSPACE
    role: normative
    status: modeled
    span:
      start: 217
      end: 332
  - claim_key: CLAIM-2CA8EC843EE150AB
    claim_text: The VS Code extension must skip MCP provider registration when vscode.lm.registerMcpServerDefinitionProvider is unavailable
    role: normative
    status: modeled
    span:
      start: 334
      end: 457
logic_claims:
  - CLAIM-4440BD6F9437F6AE
  - CLAIM-398AF2770A5C6C2C
  - CLAIM-99A33D010BCC43F4
  - CLAIM-2CA8EC843EE150AB
id: REQ-vscode-mcp-server-provider
type: req
approved_by: maintainer
approval_ref: 'Maintainer signoff, 2026-11-25, approving REQ-vscode-mcp-server-provider superseding REQ-vs-code-extension-register-kibi-mcp: "Approve all"'
---

## Context

VS Code has no static `contributes.mcp.servers` contribution point; extensions must declare `contributes.mcpServerDefinitionProviders` and register a provider via `vscode.lm.registerMcpServerDefinitionProvider`.

The provider gates on `.kb/manifest.json` so non-Kibi workspaces stay silent, passes `KIBI_MCP_ATTACH_ROOT` instead of `KIBI_WORKSPACE` so per-call workspace routing stays active (matching the other Kibi launchers), and skips registration cleanly on older hosts or Cursor forks lacking `vscode.lm.registerMcpServerDefinitionProvider`.

## Why this changed

Supersedes `REQ-vs-code-extension-register-kibi-mcp` following PR #879 review: fixes the truncated title, replaces the incorrect firm/human origin with an agent-authored requirement awaiting maintainer approval, splits the combined clause into four atomic clauses, and switches the environment variable from `KIBI_WORKSPACE` to `KIBI_MCP_ATTACH_ROOT`.

## Source

> VS Code extension API documentation for contributes.mcpServerDefinitionProviders and PR #879 review; approved by maintainer on 2026-11-25 ("Approve all")
