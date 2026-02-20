---
id: SCEN-009
title: Commit blocked when must-priority requirement lacks scenario coverage
status: active
created_at: 2026-02-20T09:36:22.000Z
updated_at: 2026-02-20T09:36:22.000Z
priority: must
tags:
  - enforcement
  - pre-commit
links:
  - REQ-014
---
Steps:
1. KB contains REQ-X with priority: must but no specifiedby scenario.
2. Developer attempts git commit.
3. pre-commit hook fires kibi check.
4. kibi check exits 1 with must-priority-coverage violation.
5. Commit is blocked. Developer sees violation output.
