---
id: TEST-004
title: kibi check detects must-priority coverage violations
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - check
  - unit
links:
  - REQ-006
  - SCEN-005
---

Seeds KB with a `must`-priority requirement that has no linked scenario or test.
Runs `kibi check --rules must-priority-coverage`. Asserts:
- Exit code is non-zero
- Output contains the uncovered requirement's ID
- A requirement with full scenario + test coverage passes the same rule
