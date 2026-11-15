---
title: An approved plan migrates the attached legacy branch store first
status: active
tags:
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-14T12:00:00.000Z'
id: SCEN-kibi-legacy-attachment-apply-migration
type: scenario
expects: success
---
Given a project whose branch store still sits at its old literal path, when kb_apply_plan applies the plan kb_status previews with its legacy migration action approved, then the migration runs before the other approved actions, the hashed store is attached exactly and kb_status reports the KB fresh with its entities intact.

documentation/tests/e2e/packed/legacy-attachment-apply.test.ts exercises it through the installed MCP server.