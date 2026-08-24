---
id: REQ-remove-briefs-v1
title: Remove Kibi briefing surfaces (fulfilled; archived)
status: archived
created_at: 2026-05-28T00:00:00.000Z
updated_at: 2026-05-28T00:00:00.000Z
source: documentation/requirements/REQ-remove-briefs-v1.md
priority: must
owner: platform-team
tags:
  - removal
  - briefing
  - mcp
  - opencode
  - vscode
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v6
  - type: supersedes
    target: REQ-vscode-kibi-briefing-v3
  - type: supersedes
    target: REQ-mcp-kibi-briefing-v1
  - type: supersedes
    target: REQ-opencode-briefing-command
  - type: specified_by
    target: SCEN-remove-briefs-v1
  - type: verified_by
    target: TEST-remove-briefs-v1
semantic_text: Kibi must remove the active briefing product surface across MCP, OpenCode, VS Code, and shared CLI configuration while preserving the rest of the knowledge-base discovery, query, sync, and validation workflows.\n\nThe MCP server must no longer expose `kb_briefing_generate`, `/brief-kibi`, or mutation pending-marker behavior for `.kb/briefs`.\nThe OpenCode integration must no longer generate, consume, render, route, or prompt for Kibi briefing artifacts.\nThe VS Code extension must no longer watch, parse, render, command-open, or notify on Kibi briefing artifacts.\nShared config, docs, and tests must treat prior briefing requirements, scenarios, and verification plans as removed/superseded rather than active product behavior.
type: req
---

Kibi must remove the active briefing product surface across MCP, OpenCode, VS Code, and shared CLI configuration while preserving the rest of the knowledge-base discovery, query, sync, and validation workflows.

1. The MCP server must no longer expose `kb_briefing_generate`, `/brief-kibi`, or mutation pending-marker behavior for `.kb/briefs`.
2. The OpenCode integration must no longer generate, consume, render, route, or prompt for Kibi briefing artifacts.
3. The VS Code extension must no longer watch, parse, render, command-open, or notify on Kibi briefing artifacts.
4. Shared config, docs, and tests must treat prior briefing requirements, scenarios, and verification plans as removed/superseded rather than active product behavior.
