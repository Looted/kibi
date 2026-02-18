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
  - REQ-003
---

Steps:
1. Branch `feature/old` has been deleted from git but `.kb/branches/feature/old/` still exists
2. Developer runs `kibi gc`
3. kibi lists all local git branches and compares against `.kb/branches/` directories
4. Stale `feature/old` store is deleted
5. Output confirms removal; `main` store is never touched
