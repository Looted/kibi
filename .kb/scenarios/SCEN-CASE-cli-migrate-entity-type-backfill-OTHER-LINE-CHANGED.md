---
title: A type backfill that changes any line besides the added type fails the migration guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:12:10.069Z'
id: SCEN-CASE-cli-migrate-entity-type-backfill-OTHER-LINE-CHANGED
type: scenario
---
Given an already migrated KB whose requirement file has no type line and is committed, when kibi migrate --yes runs the entity-type backfill, then the file's diff is exactly the added type: req line and a second run changes nothing; any other changed line fails the guard.

This covers the value past the bound, `gt 0`, of the claim that the type backfill leaves every other line unchanged. packages/cli/tests/commands/migrate-entity-type.test.ts "a KB migrated without the type line gets it from the next kibi migrate, and sync reports KB totals beside what it imported" exercises it.
