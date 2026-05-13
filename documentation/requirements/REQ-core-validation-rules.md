---
id: REQ-core-validation-rules
title: Core integrity and coverage validation rules
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-006
priority: must
tags:
  - core
  - validation
links:
  - type: supersedes
    target: REQ-006
---

The Prolog KB core implements foundational validation rules to ensure data consistency:
- `must-priority-coverage`: ensures requirements with "must" priority have at least one scenario and one test.
- `no-dangling-refs`: ensures all relationship targets exist as entities in the KB.
- `no-cycles`: prevents circular dependency chains in requirements and ADRs.
