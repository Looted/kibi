---
title: The kibi-zcode launcher answers with instructions when no kibi-mcp resolves
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T10:40:00.000Z'
id: SCEN-NEG-zcode-adapter-package-NO-LOCAL-SERVER
type: scenario
---
Given a workspace that opted into Kibi but has no installed kibi-mcp and an empty PATH, when ZCode starts the kibi-zcode MCP launcher and sends initialize, then the launcher exits cleanly with instructions saying no kibi-mcp executable is resolvable, and it never launches a server.

This is the failure side of resolving the project-local kibi-mcp: the launcher must not start a server it did not resolve. packages/zcode/tests/mcp-launcher.subprocess.test.ts "an opted-in workspace without kibi-mcp gets instructions, not a launch" exercises it, inside the TEST-zcode-kibi-plugin-v1 suite run.
