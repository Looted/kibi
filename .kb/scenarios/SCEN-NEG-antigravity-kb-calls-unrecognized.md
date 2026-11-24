---
title: Kibi MCP and CLI calls are not recognized as KB use is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:19.301Z'
id: SCEN-NEG-antigravity-kb-calls-unrecognized
type: scenario
---
Given an agent that calls Kibi through MCP or the CLI, when the hooks see the call, then they record it as KB use; a call that goes unrecognized is rejected. packages/antigravity/tests/kb-tools-session.test.ts covers MCP and CLI recognition, including inline JSON input.