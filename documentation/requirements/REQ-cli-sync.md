---
id: REQ-cli-sync
title: Import entities from source files into the branch KB
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-003
priority: must
tags:
  - cli
  - sync
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-007
  - type: specified_by
    target: SCEN-012
  - type: verified_by
    target: TEST-002
  - type: verified_by
    target: TEST-015
---

The `kibi sync` command performs a full import of entities from the local filesystem into the branch-specific KB.
It discovers files matching patterns in `config.json`, extracts Markdown and YAML metadata,
resolves branch state, and upserts the results into the Prolog KB.
