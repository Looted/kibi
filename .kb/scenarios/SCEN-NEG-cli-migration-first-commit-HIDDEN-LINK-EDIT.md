---
title: A real symbol edit riding along with a migration commit is still judged and blocks the commit
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:20.921Z'
id: SCEN-NEG-cli-migration-first-commit-HIDDEN-LINK-EDIT
type: scenario
---
Given a workspace where kibi migrate has rewritten the symbols manifest and the commit also adds a new implements link on a legacy symbol, when kibi check --staged runs, then the edited symbol is not excused as a migration-only change: the check reports symbol-coverage for it, prints no Migration commit note, and exits 1.

This is the failure side of the migration commit allowance: it must cover only the fields the migration writes, never a real edit hidden in the same commit. packages/cli/tests/commands/migrate-first-commit.test.ts "still judges a legacy symbol whose implements link the commit edits" exercises it.
