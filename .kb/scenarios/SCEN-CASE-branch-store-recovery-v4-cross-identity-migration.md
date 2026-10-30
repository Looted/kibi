---
title: A branch store migration from an unrelated branch identity is refused and the source store is kept
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:46:45.595Z'
id: SCEN-CASE-branch-store-recovery-v4-cross-identity-migration
type: scenario
---
Given a packed Kibi install on branch feature/exact with a literal legacy store named unrelated under .kb/branches, when kibi branch migrate --from unrelated --to feature/exact is run, then the command exits non-zero with "every cross-branch move is refused" and the unrelated store is left in place.

The test case documentation/tests/e2e/packed/branch-store-recovery.test.ts "enforces exact identity, bounded migration, and explicit recovery" exercises it. It covers the value past the bound of allowed cross-identity migrations, `gt 0`: one cross-identity migration is attempted and refused.