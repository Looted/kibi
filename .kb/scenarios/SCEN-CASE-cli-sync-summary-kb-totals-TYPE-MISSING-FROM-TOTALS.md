---
title: A sync summary whose KB totals leave out an entity type is caught
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:25.055Z'
id: SCEN-CASE-cli-sync-summary-kb-totals-TYPE-MISSING-FROM-TOTALS
type: scenario
---
Given a migrated KB with two requirements, when kibi sync runs after one requirement changes, then the summary reports KB Totals: 2 entities followed by req: 2, so a summary that left the req type out of the totals is caught.

This covers one violating item past the invariant, `gt 0` on `kb_entity_types_missing_from_totals`. packages/cli/tests/commands/migrate-entity-type.test.ts "a KB migrated without the type line gets it from the next kibi migrate, and sync reports KB totals beside what it imported" exercises it through the kibi sync command output.
