---
title: A Codex result that repeats the data JSON in its text is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
  - negative-path
id: SCEN-NEG-mcp-structured-text-codex-DOUBLE
type: scenario
---
Given a discovery result for Codex whose text part repeats the data JSON, when it is checked, then it is rejected because Codex gives the model structuredContent in place of the text.