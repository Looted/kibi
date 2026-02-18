---
id: TEST-009
title: "Branch workflow: create branch, sync, check isolation from main"
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - integration
  - branching
links:
  - REQ-001
  - REQ-012
  - SCEN-003
---

In a git repo with kibi initialised on `main`:
1. Create and checkout `feature/isolation`
2. Run `kibi sync` with a new entity file only present on the feature branch
3. Verify `kibi query req` on `feature/isolation` returns the new entity
4. Switch back to `main` and verify the new entity is NOT in `main`'s KB
