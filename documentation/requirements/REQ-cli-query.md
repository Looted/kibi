---
id: REQ-cli-query
title: Filter and format KB output via command-line
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-003
priority: must
tags:
  - cli
  - query
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-001
  - type: verified_by
    target: TEST-003
---

The `kibi query` command provides CLI access to the knowledge base. It supports filtering by entity type, ID, tags, and source file.
Output can be formatted as human-readable tables or machine-readable JSON.
It also supports querying relationships for specific entities.
