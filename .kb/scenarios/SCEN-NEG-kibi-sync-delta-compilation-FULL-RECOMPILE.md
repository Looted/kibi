---
title: Editing one symbol in a multi-symbol manifest recompiles only that symbol
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T12:00:00.000Z'
id: SCEN-NEG-kibi-sync-delta-compilation-FULL-RECOMPILE
type: scenario
---
Given a synced project whose symbols manifest lists three symbols, when the title of the middle symbol changes and sync runs again, then sync reports exactly one imported entity and no relationships, and the query serves the new title.

This is the failure side of delta compilation: normal sync never recompiles inputs that did not change. packages/cli/tests/commands/sync.test.ts "compiles one changed symbol from a multi-symbol manifest" exercises it, inside the TEST-core-journaled-engine-delta-sync proof run.
