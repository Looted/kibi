---
id: REQ-core-audit-logging
title: Audit logging for all KB mutations
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-009
priority: must
tags:
  - core
  - prolog
  - audit
links:
  - type: supersedes
    target: REQ-009
  - type: specified_by
    target: SCEN-001
---

All entity and relationship mutations in the KB are recorded in a persistent audit log (`audit.log`) in the branch directory.
Each entry includes a timestamp, the operation type, and the affected entity data, providing a traceable history of changes.
