---
title: After an external sync replaces the branch KB, MCP refreshes before answering instead of serving the stale snapshot
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:21:49.357Z'
id: SCEN-NEG-mcp-kb-freshness-EXTERNAL-REPLACE
type: scenario
---
Given a running kibi-mcp session attached to a branch KB that holds one scenario, when an external kibi sync adds a second scenario and replaces the snapshot, then the next kb_query over the same session returns both scenarios without a restart, so the stale attachment is never served.

This is the failure side of MCP freshness: an external replacement must not leave the session answering from the old snapshot. documentation/tests/e2e/packed/mcp-freshness-external-replace.test.ts "sees entities added by an external CLI sync without a restart" exercises it.
