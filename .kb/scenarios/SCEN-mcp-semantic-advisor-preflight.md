---
id: SCEN-mcp-semantic-advisor-preflight
title: MCP warns agents about unmodeled machine-checkable requirement prose
status: active
created_at: 2026-06-07T00:00:00Z
updated_at: 2026-06-07T00:00:00Z
source: packages/mcp/tests/semantic-advisor/analyze-prose.test.ts
tags: [mcp, semantic-advisor, modeling]
links:
  - type: verified_by
    target: TEST-mcp-semantic-advisor-preflight
---

Given a requirement payload with prose such as numeric cardinality, permission, conditional, or state/default signals, the MCP semantic advisor returns a non-mutating receipt with detected signals, suggested modeling lane, ambiguity witnesses when needed, and next tools before or during upsert.
