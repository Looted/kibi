---
title: A legacy store that changed after its preview is not migrated
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-14T12:00:00.000Z'
id: SCEN-NEG-kibi-legacy-apply-STORE-CHANGED
type: scenario
---
Given a migration plan previewed for an attached legacy branch store, when the store changes and kb_apply_plan then applies that plan with the legacy migration approved, then the plan is refused because the store changed after its migration preview, the changed store stays where it is and no hashed store is created.

documentation/tests/e2e/packed/legacy-attachment-apply.test.ts exercises it through the installed MCP server.