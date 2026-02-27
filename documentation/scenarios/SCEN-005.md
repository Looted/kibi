---
id: SCEN-005
title: kibi check detects must-priority requirement without scenario coverage
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - check
  - validation
links:
  - REQ-006
---

Steps:
1. KB contains `REQ-NEW` with `priority: must` but no scenario with `specified_by → REQ-NEW`
2. Developer runs `kibi check`
3. Prolog `must_priority_coverage` rule fires
4. Output lists `REQ-NEW` as a violation with rule `must-priority-coverage`
5. Exit code is non-zero
