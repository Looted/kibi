---
title: Kibi MCP calls go out without a stamped workspaceRoot is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:16.384Z'
id: SCEN-NEG-antigravity-no-workspace-root-stamp
type: scenario
---
Given a Kibi workspace, when the agent calls a Kibi MCP tool, then the hook stamps workspaceRoot into its arguments; a call left unstamped is rejected. packages/antigravity/tests/kb-tools-session.test.ts and hook-runner.test.ts cover the stamping and the overwrite of a foreign workspaceRoot.