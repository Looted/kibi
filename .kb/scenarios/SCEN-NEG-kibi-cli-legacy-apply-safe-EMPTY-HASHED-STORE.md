---
title: The CLI apply creates no empty hashed store before the migration
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
id: SCEN-NEG-kibi-cli-legacy-apply-safe-EMPTY-HASHED-STORE
type: scenario
---
Given a legacy branch store and its previewed plan, when kibi migrate --apply-safe runs, then it does not fail with "KB snapshot changed since planning" and leaves no empty hashed store beside the legacy one; an action that needs the engine before the legacy store is migrated is refused instead.

documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts exercises it through the installed CLI.