---
title: The MCP launcher neither discovers the workspace from roots nor stays silent is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:25.128Z'
id: SCEN-NEG-antigravity-no-roots-discovery
type: scenario
---
Given a client with roots support, when no workspace is configured, then the launcher discovers it from roots/list or answers with an empty tool list; any other behavior is rejected. packages/antigravity/tests/serve-deferred.test.ts covers roots discovery, the roots timeout and the silent answers.