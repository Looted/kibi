---
id: SCEN-003
title: Branch switch triggers copy-from-default-branch KB creation and auto-sync
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - branching
  - hooks
links:
  - REQ-008
  - REQ-012
---

Steps:
1. Developer runs `git checkout -b feature/x`
2. `post-checkout` hook fires and invokes `kibi sync`
3. kibi detects no store for `feature/x`, copies the KB from the resolved default branch as the starting snapshot. The default branch is determined in this order: `.kb/config.json` `defaultBranch` (if set), then `origin/HEAD` (if available), then `main` as fallback.
4. kibi syncs entity files from the working tree into the new branch store
5. `kibi query req` returns same entities as were on the default branch at the time of branch creation
