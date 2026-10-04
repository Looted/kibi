---
id: SCEN-006
title: kibi gc removes KB directory for branch deleted from git
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: should
tags:
  - gc
  - branches
links:
  - REQ-cli-gc
  - type: verified_by
    target: TEST-003
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Steps:
1. Branch `feature/old` has been deleted from git but `.kb/branches/feature/old/` still exists
2. Developer runs `kibi gc`
3. kibi lists all local git branches and compares against `.kb/branches/` directories
4. Stale `feature/old` store is deleted
5. Output confirms removal; the default branch KB store (typically `main` unless configured otherwise) is never touched
