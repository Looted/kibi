---
title: A schema 20 upgrade that changes the level is refused
status: active
expects: rejection
text_ref: packages/cli/src/commands/migrate.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:24.393Z'
id: SCEN-NEG-kibi-schema-20-level-rejected
type: scenario
---
Given a project at level remember, an upgrade to schema 20 that set the level back to test, or wrote any level, would be rejected: the upgrade leaves the level as it is.
