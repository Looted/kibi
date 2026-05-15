---
id: REQ-cli-gc
title: Garbage collection and branch store maintenance
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-003
priority: should
tags:
  - cli
  - gc
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-006
---

The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch.
This keeps the `.kb/branches/` directory clean and prevents disk bloat from long-deleted features.
