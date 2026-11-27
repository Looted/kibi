---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:03:28.180Z'
status: active
tags:
  - scenario
  - antigravity
  - hooks
  - mcp
title: Antigravity hooks recognize Kibi MCP/CLI calls and stamp workspaceRoot
id: SCEN-antigravity-kb-tool-recognition
type: scenario
expects: success
---
# Antigravity Kibi MCP and CLI tool recognition and workspaceRoot stamping

- **Given** a PreToolUse or PostToolUse event naming a Kibi MCP call via `call_mcp_tool` or a direct `kb_*` name, or a `run_command` calling `kibi`
- **When** the Antigravity hook inspects the tool call
- **Then** it extracts the canonical `kb_*` operation, explored/checked paths, and entity IDs
- **And** on PreToolUse inside an opted-in Kibi workspace, it returns a shallow `overwrite` stamping `workspaceRoot` when absent
- **And** `git commit` without `--no-verify` is recognized as a verified commit acknowledging staged edits
