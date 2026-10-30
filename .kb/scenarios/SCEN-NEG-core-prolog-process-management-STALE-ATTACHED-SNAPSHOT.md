---
title: An MCP session never answers from a branch snapshot that an external sync replaced
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:00:00.349Z'
id: SCEN-NEG-core-prolog-process-management-STALE-ATTACHED-SNAPSHOT
type: scenario
---
Given a running kibi-mcp process attached to a branch KB holding one scenario, when an external kibi sync adds a second scenario and replaces the snapshot, then the next kb_query in the same session returns both scenarios without a restart, so the replaced snapshot is not served.

This is the failure side of the attached Prolog process lifecycle: an externally replaced snapshot must be refreshed rather than trusted. documentation/tests/e2e/packed/mcp-freshness-external-replace.test.ts "sees entities added by an external CLI sync without a restart" exercises it.
