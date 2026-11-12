---
title: Recovering a damaged branch store without --apply only previews
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T06:00:00.000Z'
id: SCEN-NEG-kibi-exact-branch-identity-RECOVER-WITHOUT-APPLY
type: scenario
---
Given a packed workspace whose develop branch store has a corrupted CURRENT pointer, when kibi branch recover runs without --apply, then it prints a preview and the damaged pointer file keeps its exact bytes. Only kibi branch recover --apply rebuilds the store, and it reports that the original bytes were preserved.

This is the failure side of explicit recovery: a damaged store must not change before a person applies the previewed recovery. documentation/tests/e2e/packed/branch-store-recovery.test.ts "enforces exact identity, bounded migration, and explicit recovery" exercises it.
