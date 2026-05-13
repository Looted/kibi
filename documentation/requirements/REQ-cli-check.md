---
id: REQ-cli-check
title: Command-line KB validation and integrity checks
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-003
priority: must
tags:
  - cli
  - check
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-005
  - type: verified_by
    target: TEST-004
---

The `kibi check` command runs validation rules against the branch KB to ensure structural integrity and requirement coverage.
It can be restricted to specific rules or focused on staged changes (used in pre-commit hooks).
Failure results in a non-zero exit code and descriptive violation logs.
