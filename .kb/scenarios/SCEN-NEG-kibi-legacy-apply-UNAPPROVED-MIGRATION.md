---
title: A plan that leaves the legacy migration unapproved is refused
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-14T12:00:00.000Z'
id: SCEN-NEG-kibi-legacy-apply-UNAPPROVED-MIGRATION
type: scenario
---
Given an attached legacy branch store, when kb_apply_plan applies a migration plan whose approved actions leave out the legacy migration, then the call fails naming the legacy migration to approve and the legacy store stays where it is.

documentation/tests/e2e/packed/legacy-attachment-apply.test.ts exercises it through the installed MCP server.