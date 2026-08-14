---
id: TEST-cli-branch-store-recovery
title: CLI exact branch-store recovery contract
status: active
tags:
  - cli
  - branching
  - recovery
source: packages/cli/tests/commands/branch.test.ts
links:
  - type: validates
    target: SCEN-branch-store-recovery
---

The CLI branch command tests prove that an arbitrary migration is refused and
that an explicitly applied recovery preserves a backup and returns a fresh,
exact branch store.
