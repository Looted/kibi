---
title: The pre-commit check blocks a new entity without body context and passes debt the commit did not introduce
status: active
expects: success
tags:
  - cli
  - staged
  - pre-commit
  - entity-context
origin:
  kind: agent
  recorded_at: '2026-10-16T08:51:36.332Z'
id: SCEN-cli-staged-entity-context
type: scenario
---
Given a repository whose last commit holds a test entity without body context, when the agent stages a new test entity without a body, then `kibi check --staged` fails with `entity-context-missing` for the new entity only. With a prose body the same file passes. Editing the old entity without adding context passes because the finding was already at the base, and an entity the migration acknowledged in `.kb/manifest.json` passes.

This exists because the hook let through an entity that `kb_upsert` and `kb_check` both called blocking.
